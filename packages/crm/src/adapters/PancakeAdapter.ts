import { CrmAdapter, CrmOrder, CrmConversions } from '../core/CrmAdapter';

export interface PancakeConfig {
  shopId: string;
  apiKey: string;
  productDisplayId?: string; 
  excludedTags?: string[];    
  calcInUsd?: boolean;       
  usdRate?: string | number; 
  showOffline?: boolean;     
}

export class PancakeAdapter implements CrmAdapter {
  constructor(private config: PancakeConfig) {}


  async fetchOrders(startDate: Date, endDate: Date): Promise<CrmOrder[]> {
    const orders: CrmOrder[] = [];
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);
    
    // Product IDs are now stored directly (can be comma separated)
    const finalProductIds = this.config.productDisplayId 
      ? this.config.productDisplayId.split(/[,;|\n]+/).map(s => s.trim()).filter(s => s.length > 0) 
      : [null];

    console.log(`[PANCAKE] Processing ${finalProductIds.length} product IDs: ${finalProductIds.join(', ')}`);

    const allRawOrders: any[] = [];
    const processedRawIds = new Set<string>();

    // Fetch orders for each product ID
    await Promise.all(finalProductIds.map(async (productId) => {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        let url = `https://pos.pancake.vn/api/v1/shops/${this.config.shopId}/orders?api_key=${this.config.apiKey}&startDateTime=${startTs}&endDateTime=${endTs}&page=${page}&page_size=1000&option_sort=inserted_at_desc`;
        
        if (productId) {
          url += `&product_id[]=${productId}`;
        }

        try {
          const response = await fetch(url);
          if (!response.ok) break;

          const resData = await response.json();
          const rawOrders = resData.data || [];
          
          for (const raw of rawOrders) {
            if (processedRawIds.has(raw.id)) continue;
            processedRawIds.add(raw.id);
            allRawOrders.push(raw);
          }

          if (rawOrders.length < 1000 || page >= 10) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (err) {
          console.error(`[PANCAKE] Fetch error for product ${productId}:`, err);
          hasMore = false;
        }
      }
    }));

    console.log(`[PANCAKE] Fetched total ${allRawOrders.length} raw orders for all products.`);

    // Filters and Mapping (Legacy Logic)
    const canceledStatuses = [6, 7]; // Đã hủy, Đã xóa
    const excludeTags = this.config.excludedTags || [];

    for (const raw of allRawOrders) {
      // 1. LEGACY LOGIC: Exclude Facebook sources
      const adsSource = (raw.ads_source || '').toLowerCase();
      const utmSource = (raw.p_utm_source || '').toLowerCase();
      if (adsSource === 'facebook' || utmSource === 'facebook') continue;

      // 2. LEGACY LOGIC: Status filtering
      const status = parseInt(raw.status);
      if (canceledStatuses.includes(status)) continue;

      // 3. LEGACY LOGIC: Tag filtering
      if (raw.tags && excludeTags.length > 0) {
        const isExcluded = raw.tags.some((t: any) => 
          excludeTags.includes(t.id?.toString()) || 
          excludeTags.includes(t.name)
        );
        if (isExcluded) continue;
      }

      // 4. LEGACY LOGIC: Identify phone and value
      const phone = raw.bill_phone_number || raw.customer_phone || '';
      if (!phone) continue;

      // User specified campaign_id is the correct field for Pancake
      // Note: Legacy PHP prioritized p_utm_campaign. Some users might have internal campaign_id in Pancake.
      // We check p_utm_campaign first as it's the standard for Google Ads mapping.
      const rawCampaignField = raw.p_utm_campaign || raw.utm_campaign || raw.campaign_id || null;

      let orderValue = parseFloat(String(raw.money_to_collect || raw.total_price || 0).replace(/,/g, ''));
      if (isNaN(orderValue)) orderValue = 0;

      orders.push({
        id: raw.id,
        phone: phone,
        campaignId: rawCampaignField ? String(rawCampaignField) : null,
        status: status,
        value: orderValue,
        createdAt: new Date(raw.inserted_at * 1000),
      });
    }

    console.log(`[PANCAKE] Total orders processed after basic filters: ${orders.length}`);

    return orders;
  }

  processConversions(orders: CrmOrder[], targetCampaignIds: string[]): Record<string, CrmConversions> {
    const results: Record<string, CrmConversions> = {};
    const campaignPhoneSets = new Map<string, Set<string>>();

    for (const campaignId of targetCampaignIds) {
      results[campaignId] = {
        real_conversions: 0,
        real_conversions_pending: 0,
        real_conversions_success: 0,
        real_conversion_value: 0,
        real_conversion_value_success: 0,
      };
      campaignPhoneSets.set(campaignId, new Set<string>());
    }

    // LEGACY LOGIC: Offline orders campaign
    const otherCampaignId = 'other';
    if (this.config.showOffline) {
      results[otherCampaignId] = {
        real_conversions: 0,
        real_conversions_pending: 0,
        real_conversions_success: 0,
        real_conversion_value: 0,
        real_conversion_value_success: 0,
      };
      campaignPhoneSets.set(otherCampaignId, new Set<string>());
    }

    const usdRateNum = typeof this.config.usdRate === 'string' ? parseFloat(this.config.usdRate) : (this.config.usdRate || 1);
    const pendingStatuses = [0, 1, 2, 12, 13];
    const successStatuses = [8, 9];

    for (const order of orders) {
      const phoneKey = order.phone.replace(/\D/g, ''); 

      let matchedCampaignId = order.campaignId;
      if (!matchedCampaignId || !results[matchedCampaignId]) {
        if (!this.config.showOffline) continue;
        matchedCampaignId = otherCampaignId;
      }

      const phoneSet = campaignPhoneSets.get(matchedCampaignId)!;
      if (phoneSet.has(phoneKey)) continue;
      phoneSet.add(phoneKey);

      const metrics = results[matchedCampaignId];
      metrics.real_conversions++;
      
      let value = order.value;
      if (this.config.calcInUsd && usdRateNum > 0) {
        value = value / usdRateNum;
      }

      metrics.real_conversion_value += value;

      if (successStatuses.includes(order.status as number)) {
        metrics.real_conversions_success++;
        metrics.real_conversion_value_success += value;
      } else if (pendingStatuses.includes(order.status as number)) {
        metrics.real_conversions_pending++;
      }
    }

    return results;
  }
}
