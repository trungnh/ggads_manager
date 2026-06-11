import { db, products, campaignsSnapshot, revenueReportDaily, revenueReports, crmIntegrations, crmConnections, pancakeAccounts, adsAccounts } from '@repo/db';
import { eq, and, inArray } from 'drizzle-orm';
import { CampaignSyncService } from './CampaignSyncService';

export interface RatesConfig {
  importPrice: number;
  shippingFee: number;
  returnRate: number;
  incomeTax: number;
  adsTax: number;
  paymentFee: number;
}

export class RevenueService {
  /**
   * Helper to compute local day boundaries converted to UTC timestamps
   */
  private static getUnixForDayBoundaries(dateStr: string, timezone: string) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const utc00 = Date.UTC(y, m - 1, d, 0, 0, 0) / 1000;
    const utc23 = Date.UTC(y, m - 1, d, 23, 59, 59) / 1000;
    
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' });
    const parts = fmt.formatToParts(new Date(utc00 * 1000));
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+00:00';
    const match = offsetPart.match(/[+-](\d{2}):(\d{2})/);
    let offsetMinutes = 0;
    if (match) {
      const sign = offsetPart.includes('+') ? 1 : -1;
      offsetMinutes = sign * (parseInt(match[1]) * 60 + parseInt(match[2]));
    }
    
    const startTs = utc00 - (offsetMinutes * 60);
    const endTs = utc23 - (offsetMinutes * 60);
    return { startTs, endTs };
  }

  /**
   * Fetch Product Display ID on Pancake POS by SKU
   */
  static async getPancakeProductId(shopId: string, apiKey: string, sku: string): Promise<string | null> {
    try {
      const url = `https://pos.pancake.vn/api/v1/shops/${shopId}/products/${sku}?api_key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const res = await response.json();
      return res.data?.id || null;
    } catch (err) {
      console.error(`[REVENUE_SERVICE] Failed to get Pancake Product ID for SKU ${sku} in shop ${shopId}:`, err);
      return null;
    }
  }

  /**
   * Fetch orders paginated from Pancake POS API
   */
  private static async fetchPancakeOrders(
    shopId: string,
    apiKey: string,
    pancakeProductId: string | null,
    startTs: number,
    endTs: number
  ): Promise<any[]> {
    const allRawOrders: any[] = [];
    const processedRawIds = new Set<string>();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let url = `https://pos.pancake.vn/api/v1/shops/${shopId}/orders?api_key=${apiKey}&startDateTime=${startTs}&endDateTime=${endTs}&page=${page}&page_size=1000&option_sort=inserted_at_desc`;
      if (pancakeProductId) {
        url += `&product_id[]=${pancakeProductId}`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) break;

        const resData = await response.json();
        const rawOrders = resData.data || [];
        
        for (const raw of rawOrders) {
          const rawId = String(raw.id);
          if (processedRawIds.has(rawId)) continue;
          processedRawIds.add(rawId);
          allRawOrders.push(raw);
        }

        if (rawOrders.length < 1000 || page >= 10) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (err) {
        console.error(`[REVENUE_SERVICE] Fetch error for shop ${shopId}:`, err);
        hasMore = false;
      }
    }

    return allRawOrders;
  }

  /**
   * Fetch and calculate statistics from Pancake POS CRM
   */
  static async fetchCrmDataForDate(
    productCode: string,
    adsAccountIdsArray: string[],
    dateStr: string,
    fallbackImportPrice: number
  ) {
    if (adsAccountIdsArray.length === 0) {
      return null;
    }

    // Find active Pancake integrations for these accounts
    const integrations = await db.select({
      shopId: pancakeAccounts.shopId,
      apiKey: pancakeAccounts.apiKey,
      customerId: adsAccounts.customerId,
      timeZone: adsAccounts.timeZone,
      config: crmConnections.config
    })
    .from(crmIntegrations)
    .innerJoin(crmConnections, eq(crmIntegrations.crmConnectionId, crmConnections.id))
    .innerJoin(pancakeAccounts, eq(crmConnections.pancakeAccountId, pancakeAccounts.id))
    .innerJoin(adsAccounts, eq(crmIntegrations.adsAccountId, adsAccounts.id))
    .where(
      and(
        eq(crmIntegrations.isEnabled, true),
        eq(crmConnections.type, 'pancake'),
        inArray(adsAccounts.customerId, adsAccountIdsArray)
      )
    );

    if (integrations.length === 0) {
      return null;
    }

    // Deduplicate integrations by shopId to avoid redundant fetches
    const uniqueShops = new Map<string, typeof integrations[0]>();
    for (const integration of integrations) {
      uniqueShops.set(integration.shopId, integration);
    }

    let totalOrders = 0;
    let totalRevenue = 0;
    let totalQuantity = 0;
    let totalGoodsCost = 0;
    const processedOrderIds = new Set<string>();

    // Support both active status set: original legacy statuses [0, 1, 2, 8, 9, 12, 13] and expanded shipping/received [3, 4, 5, 10, 14]
    const validStatuses = [0, 1, 2, 3, 4, 5, 8, 9, 10, 12, 13, 14];
    const canceledStatuses = [6, 7];

    for (const [shopId, integration] of uniqueShops.entries()) {
      const tz = integration.timeZone || 'Asia/Ho_Chi_Minh';
      const { startTs, endTs } = this.getUnixForDayBoundaries(dateStr, tz);

      // Get Pancake Product Display ID using the SKU code
      let pancakeProductId = await this.getPancakeProductId(shopId, integration.apiKey, productCode);
      
      // Safe fallback to connection-level productDisplayId if SKU search fails
      const connConfig = integration.config as any;
      if (!pancakeProductId && connConfig?.productDisplayId) {
        const displayIds = String(connConfig.productDisplayId).split(/[,;|\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        if (displayIds.length > 0) {
          pancakeProductId = displayIds[0];
          console.log(`[REVENUE_SERVICE] SKU search failed for ${productCode}. Fell back to configured productDisplayId: ${pancakeProductId}`);
        }
      }

      if (!pancakeProductId) {
        console.warn(`[REVENUE_SERVICE] Product display ID not found for SKU ${productCode} in shop ${shopId}`);
        continue;
      }

      // Fetch all orders
      const rawOrders = await this.fetchPancakeOrders(shopId, integration.apiKey, pancakeProductId, startTs, endTs);

      // Process orders
      for (const order of rawOrders) {
        const orderId = String(order.id);
        if (processedOrderIds.has(orderId)) continue;

        // Filter status
        const status = order.status !== undefined ? Number(order.status) : null;
        if (status === null || !validStatuses.includes(status) || canceledStatuses.includes(status)) {
          continue;
        }

        // Exclude Facebook sources
        const adsSource = String(order.ads_source || '').toLowerCase();
        const utmSource = String(order.p_utm_source || '').toLowerCase();
        if (adsSource === 'facebook' || utmSource === 'facebook') {
          continue;
        }

        // Must have phone
        const phone = order.bill_phone_number || order.customer_phone || '';
        if (!phone) continue;

        let orderContainsProduct = true;
        let orderGoodsCost = 0;

        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            const qty = Number(item.quantity || 1);

            // Fallback import price if 0 or null (Phương án A!)
            const rawImportPrice = item.variation_info?.last_imported_price;
            const importPrice = rawImportPrice && Number(rawImportPrice) > 0 
              ? Number(rawImportPrice) 
              : fallbackImportPrice;

            orderGoodsCost += qty * importPrice;
          }
        }

        if (orderContainsProduct) {
          processedOrderIds.add(orderId);
          totalOrders++;
          totalRevenue += Number(order.money_to_collect || order.total_price || 0);
          totalGoodsCost += orderGoodsCost;
        }
      }
    }

    return {
      orders: totalOrders,
      revenue: totalRevenue,
      quantity: 0, // Quantity is not needed for Pancake mapped reports (only used internally to calculate goods cost)
      goodsCost: totalGoodsCost
    };
  }

  /**
   * Pure function to calculate PnL values in standard VND currency
   */
  static calculateDailyPnL(
    orders: number,
    quantity: number,
    revenue: number,
    adsCost: number,
    rates: RatesConfig,
    goodsCostOverride?: number
  ) {
    const goodsCost = goodsCostOverride !== undefined ? goodsCostOverride : quantity * rates.importPrice;
    const shipCost = orders * rates.shippingFee;
    
    // Return cost calculation with negative safeguard
    let returnCost = ((revenue - goodsCost) * rates.returnRate) + (orders * rates.returnRate * (rates.shippingFee / 2));
    if (returnCost < 0) returnCost = 0;
    
    const totalCost = goodsCost + shipCost + returnCost + adsCost + 
                      (adsCost * rates.adsTax) + 
                      (adsCost * rates.paymentFee) + 
                      (revenue * rates.incomeTax);
                      
    const profit = revenue - totalCost;
    
    return {
      goodsCost,
      shipCost,
      returnCost,
      totalCost,
      profit
    };
  }

  /**
   * Calculates daily PnL stats and returns micros-compatible object for DB upsert
   */
  static async calculateDailyProfit(userId: string, reportId: string, dateStr: string) {
    const report = await db.query.revenueReports.findFirst({
      where: and(eq(revenueReports.id, reportId), eq(revenueReports.userId, userId))
    });
    if (!report) throw new Error("Report not found");

    const product = await db.query.products.findFirst({
      where: eq(products.id, report.productId!)
    });
    if (!product) throw new Error("Product not found");

    // Parse rates from report rates JSONB
    const rates = report.rates as unknown as Partial<RatesConfig>;
    const importPrice = rates.importPrice !== undefined ? Number(rates.importPrice) : Number(product.importPriceMicros || 0) / 1000000;
    const shippingFee = rates.shippingFee !== undefined ? Number(rates.shippingFee) : Number(product.shippingFee || 0) / 1000000;
    const returnRate = rates.returnRate !== undefined ? Number(rates.returnRate) : Number(product.returnRate || 0);
    const incomeTax = rates.incomeTax !== undefined ? Number(rates.incomeTax) : 0.015;
    const adsTax = rates.adsTax !== undefined ? Number(rates.adsTax) : 0.10;
    const paymentFee = rates.paymentFee !== undefined ? Number(rates.paymentFee) : 0.012;

    const ratesConfig: RatesConfig = {
      importPrice,
      shippingFee,
      returnRate,
      incomeTax,
      adsTax,
      paymentFee
    };

    // Get mapped customer IDs from the product configuration
    const adsAccountIdsArray = Array.isArray(product.adsAccountIds)
      ? product.adsAccountIds as string[]
      : typeof product.adsAccountIds === 'string'
        ? JSON.parse(product.adsAccountIds)
        : [];

    // 1. Fetch Ads Cost from campaignsSnapshot across mapped accounts
    let adsCost = 0;
    if (adsAccountIdsArray.length > 0) {
      const snapshots = await db.select().from(campaignsSnapshot).where(
        and(
          eq(campaignsSnapshot.date, dateStr),
          inArray(campaignsSnapshot.customerId, adsAccountIdsArray)
        )
      );

      const matched = product.keywordCampaign
        ? snapshots.filter(s => s.name?.toLowerCase().includes(product.keywordCampaign!.toLowerCase()))
        : snapshots;

      const adsCostMicros = matched.reduce((sum, s) => sum + Number(s.costMicros || 0), 0);
      adsCost = adsCostMicros / 1000000;
    }

    // 2. Fetch CRM Data if active Pancake mapping exists
    const crmData = await this.fetchCrmDataForDate(product.code, adsAccountIdsArray, dateStr, importPrice);

    let orders = 0;
    let quantity = 0;
    let revenue = 0;
    let goodsCostOverride: number | undefined = undefined;

    if (crmData) {
      orders = crmData.orders;
      quantity = crmData.quantity;
      revenue = crmData.revenue;
      goodsCostOverride = crmData.goodsCost;
    } else {
      // Unmapped: read existing daily statistics to preserve manual overrides (orders, quantity, revenue)
      const existingDaily = await db.query.revenueReportDaily.findFirst({
        where: and(
          eq(revenueReportDaily.reportId, reportId),
          eq(revenueReportDaily.date, dateStr)
        )
      });
      if (existingDaily) {
        orders = existingDaily.orders || 0;
        quantity = existingDaily.quantity || 0;
        revenue = Number(existingDaily.revenueMicros || 0) / 1000000;
      }
    }

    // 3. Compute PnL metrics
    const pnl = this.calculateDailyPnL(orders, quantity, revenue, adsCost, ratesConfig, goodsCostOverride);

    // Represent as strings for precise Numeric fields in DB
    return {
      adsCostMicros: Math.round(adsCost * 1000000).toString(),
      orders,
      quantity,
      revenueMicros: Math.round(revenue * 1000000).toString(),
      shipCostMicros: Math.round(pnl.shipCost * 1000000).toString(),
      goodsCostMicros: Math.round(pnl.goodsCost * 1000000).toString(),
      profitMicros: Math.round(pnl.profit * 1000000).toString()
    };
  }

  /**
   * Triggers a daily PnL calculation and writes to the DB daily table
   */
  static async syncDailyRevenue(userId: string, reportId: string, dateStr: string) {
    const report = await db.query.revenueReports.findFirst({
      where: and(eq(revenueReports.id, reportId), eq(revenueReports.userId, userId))
    });
    if (!report) throw new Error("Report not found");

    const product = await db.query.products.findFirst({
      where: eq(products.id, report.productId!)
    });
    if (!product) throw new Error("Product not found");

    // Get mapped customer IDs from the product configuration
    const adsAccountIdsArray = Array.isArray(product.adsAccountIds)
      ? product.adsAccountIds as string[]
      : typeof product.adsAccountIds === 'string'
        ? JSON.parse(product.adsAccountIds)
        : [];

    if (adsAccountIdsArray.length > 0) {
      // Find all mapped ads accounts for this product
      const mappedAccounts = await db.select({
        id: adsAccounts.id,
        customerId: adsAccounts.customerId
      })
      .from(adsAccounts)
      .where(inArray(adsAccounts.customerId, adsAccountIdsArray));

      // Trigger actual Google Ads API & CRM synchronization for these accounts first!
      for (const acc of mappedAccounts) {
        try {
          console.log(`[REVENUE_SERVICE] Triggering live Google Ads API sync for account ${acc.customerId} on date ${dateStr}`);
          await CampaignSyncService.syncCampaigns(userId, acc.id, acc.customerId, dateStr);
        } catch (err) {
          console.error(`[REVENUE_SERVICE] Failed live Google Ads sync for ${acc.customerId} on date ${dateStr}:`, err);
        }
      }
    }

    const data = await this.calculateDailyProfit(userId, reportId, dateStr);

    await db.insert(revenueReportDaily).values({
      reportId,
      date: dateStr,
      ...data
    }).onConflictDoUpdate({
      target: [revenueReportDaily.reportId, revenueReportDaily.date],
      set: data
    });
  }

  /**
   * Bulk synchronizes the entire month's report:
   * - Current Month: Syncs from the 1st up to yesterday (incomplete today is skipped)
   * - Past Months: Syncs the entire month completely
   */
  static async bulkSyncMonth(userId: string, reportId: string) {
    const report = await db.query.revenueReports.findFirst({
      where: and(eq(revenueReports.id, reportId), eq(revenueReports.userId, userId))
    });
    if (!report) throw new Error("Report not found");

    const [year, month] = report.month.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Get today's local date (Asia/Ho_Chi_Minh)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
    const localTodayStr = formatter.format(now);
    const [currYear, currMonth, currDay] = localTodayStr.split('-').map(Number);

    const isCurrentMonth = (year === currYear && month === currMonth);

    let endDay = totalDaysInMonth;
    if (isCurrentMonth) {
      endDay = currDay - 1;
      if (endDay < 1) {
        console.warn(`[REVENUE_SERVICE] Bulk sync skipped: Today is the 1st day of the month.`);
        return { success: true, syncedDays: 0 };
      }
    }

    const datesToSync: string[] = [];
    for (let d = 1; d <= endDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      datesToSync.push(dateStr);
    }

    console.log(`[REVENUE_SERVICE] Bulk sync started for ${datesToSync.length} days of ${report.month}`);

    let syncedDays = 0;
    for (const dateStr of datesToSync) {
      try {
        await this.syncDailyRevenue(userId, reportId, dateStr);
        syncedDays++;
      } catch (err) {
        console.error(`[REVENUE_SERVICE] Failed to sync daily PnL for date ${dateStr}:`, err);
      }
    }

    return { success: true, syncedDays };
  }
}
