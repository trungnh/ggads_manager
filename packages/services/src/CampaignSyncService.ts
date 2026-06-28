import { db, campaignsSnapshot, adsAccounts, crmIntegrations, crmConnections, oauthConnections, campaignSettings, pancakeAccounts } from '@repo/db';
import { CampaignsService, CustomersService } from '@repo/google-ads';
import { PancakeAdapter, GSheetAdapter, CrmConversions } from '@repo/crm';
import { TokenService } from '@repo/shared';
import { eq, and, desc, lt } from 'drizzle-orm';
import { Redis } from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface AccountSyncInfo {
  customerId: string;
  loginCustomerId?: string;
}

export class CampaignSyncService {
  /**
   * Sync accounts across all connections
   */
  static async syncUserAccounts(userId: string) {
    const activeConnections = await db.select({ id: oauthConnections.id })
      .from(oauthConnections)
      .where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.status, 'ACTIVE')));

    if (activeConnections.length === 0) throw new Error('No active Google OAuth connections found');

    let totalSynced = 0;
    for (const conn of activeConnections) {
      try {
        const cs = new CustomersService(conn.id);
        const allAccounts = await cs.listAllAccessibleAccounts();
        const targetAccounts = allAccounts.filter(a => !a.isManager);
        
        for (const info of targetAccounts) {
          const details = await cs.getCustomerDetails(info.id, info.loginCustomerId);
          if (!details) continue;

          await db.insert(adsAccounts).values({
            customerId: details.id,
            loginCustomerId: info.loginCustomerId,
            oauthConnectionId: conn.id,
            name: details.name,
            currencyCode: details.currencyCode,
            timeZone: details.timeZone,
            status: details.status,
          }).onConflictDoUpdate({
            target: adsAccounts.customerId,
            set: {
              loginCustomerId: info.loginCustomerId,
              oauthConnectionId: conn.id,
              name: details.name,
              currencyCode: details.currencyCode,
              timeZone: details.timeZone,
              status: details.status,
            }
          });
          totalSynced++;
        }
      } catch (err) {
        console.error(`[SYNC_SERVICE] Failed connection ${conn.id}:`, err);
      }
    }
    return totalSynced;
  }

  /**
   * Main sync logic: Google Ads + CRM Data Aggregation + CFLC Calculation
   */
  static async syncCampaigns(userId: string, adsAccountId: string, customerId: string, dateStr: string) {
    const [acc] = await db.select().from(adsAccounts).where(eq(adsAccounts.id, adsAccountId)).limit(1);
    if (!acc || !acc.oauthConnectionId) throw new Error('Account not found or not linked to Google OAuth');

    const campaignsService = new CampaignsService(acc.oauthConnectionId, customerId, acc.loginCustomerId || undefined);
    
    // 1. Fetch ALL campaigns (to ensure mapping works even for 0-spend ones)
    const allAdsCampaigns = await campaignsService.listCampaigns();
    const metricsForDate = await campaignsService.getCampaignsForDate(dateStr);
    
    const idMap = new Map<string, any>(); // campaignId -> full raw data
    const nameMap = new Map<string, string>(); // campaignName -> campaignId
    
    for (const campaign of allAdsCampaigns) {
      idMap.set(campaign.campaign.id, { ...campaign, metrics: { costMicros: '0', clicks: '0', ctr: 0, averageCpc: '0', conversions: 0, conversionsValue: 0 } });
      nameMap.set(campaign.campaign.name, campaign.campaign.id);
    }

    // Merge metrics into the map
    for (const metric of metricsForDate) {
      const existing = idMap.get(metric.campaign.id);
      if (existing) {
        existing.metrics = metric.metrics;
        existing.campaignBudget = metric.campaignBudget;
        
        // Strategy info: Only update if present in the metric report
        if (metric.maximizeConversions) {
          existing.maximizeConversions = metric.maximizeConversions;
        }
        if (metric.maximizeConversionValue) {
          existing.maximizeConversionValue = metric.maximizeConversionValue;
        }
        
        // Also check campaign-level fields
        if ((metric.campaign as any)?.targetCpa) {
          if (!existing.campaign) existing.campaign = {} as any;
          (existing.campaign as any).targetCpa = (metric.campaign as any).targetCpa;
        }
        if ((metric.campaign as any)?.targetRoas) {
          if (!existing.campaign) existing.campaign = {} as any;
          (existing.campaign as any).targetRoas = (metric.campaign as any).targetRoas;
        }
      }
    }

    // 2. Fetch CRM Integrations
    const integrations = await db.select({
      provider: crmConnections.type,
      config: crmConnections.config,
      isEnabled: crmIntegrations.isEnabled,
      accessToken: oauthConnections.accessToken,
      refreshToken: oauthConnections.refreshToken,
      expiresAt: oauthConnections.expiresAt,
      oauthConnectionId: oauthConnections.id,
      pancakeShopId: pancakeAccounts.shopId,
      pancakeApiKey: pancakeAccounts.apiKey
    })
    .from(crmIntegrations)
    .innerJoin(crmConnections, eq(crmIntegrations.crmConnectionId, crmConnections.id))
    .leftJoin(oauthConnections, eq(crmConnections.oauthConnectionId, oauthConnections.id))
    .leftJoin(pancakeAccounts, eq(crmConnections.pancakeAccountId, pancakeAccounts.id))
    .where(eq(crmIntegrations.adsAccountId, adsAccountId));

    const activeIntegrations = integrations.filter(i => i.isEnabled);
    
    // 3. Aggregate CRM Metrics with proper Timezone handling
    const tz = acc.timeZone || 'Asia/Ho_Chi_Minh';
    
    const getUnixForDayBoundaries = (dateStr: string, timezone: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      // Construct UTC timestamps for 00:00:00 and 23:59:59 of that date
      const utc00 = Date.UTC(y, m - 1, d, 0, 0, 0) / 1000;
      const utc23 = Date.UTC(y, m - 1, d, 23, 59, 59) / 1000;
      
      // Find offset for this timezone at this specific time
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' });
      const parts = fmt.formatToParts(new Date(utc00 * 1000));
      const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+00:00';
      const match = offsetPart.match(/[+-](\d{2}):(\d{2})/);
      let offsetMinutes = 0;
      if (match) {
        const sign = offsetPart.includes('+') ? 1 : -1;
        offsetMinutes = sign * (parseInt(match[1]) * 60 + parseInt(match[2]));
      }
      
      // UTC = Local - Offset. So 00:00:00 Local is (00:00:00 UTC) - Offset
      const startTs = utc00 - (offsetMinutes * 60);
      const endTs = utc23 - (offsetMinutes * 60);
      return { startTs, endTs };
    };

    const { startTs, endTs } = getUnixForDayBoundaries(dateStr, tz);
    const startDate = new Date(startTs * 1000);
    const endDate = new Date(endTs * 1000);

    let combinedMetrics: Record<string, CrmConversions> = {};
    const campaignPhoneSets = new Map<string, Set<string>>();

    for (const integration of activeIntegrations) {
      try {
        let currentAccessToken = integration.accessToken || undefined;
        
        // Ensure we have a fresh token if it's a Google integration
        if (integration.provider === 'google_sheet' && integration.oauthConnectionId) {
          try {
            currentAccessToken = await TokenService.getValidToken(integration.oauthConnectionId);
          } catch (tokenErr) {
            console.error(`[SYNC-SERVICE] Failed to refresh token for ${integration.oauthConnectionId}:`, tokenErr);
          }
        }

        const adapter = integration.provider === 'pancake' 
          ? new PancakeAdapter({
              ...(integration.config as any),
              shopId: integration.pancakeShopId,
              apiKey: integration.pancakeApiKey
            })
          : new GSheetAdapter(integration.config as any, currentAccessToken);
        
        const rawOrders = await adapter.fetchOrders(startDate, endDate);
        
        console.log(`[SYNC-DEBUG] Integration ${integration.provider} fetched ${rawOrders.length} raw orders`);
        if (rawOrders.length > 0) {
          console.log(`[SYNC-DEBUG] Sample order:`, JSON.stringify(rawOrders[0]));
        }
        
        let matchedCount = 0;
        let unmatchedCount = 0;

        for (const order of rawOrders) {
          let targetId = order.campaignId ? String(order.campaignId).trim() : null;
          
          // Try matching by ID first, then by Name
          if (targetId && !idMap.has(targetId)) {
            const resolvedId = nameMap.get(targetId);
            if (resolvedId) {
              targetId = resolvedId;
            }
          }

          if (!targetId || !idMap.has(targetId)) {
            unmatchedCount++;
            // Handle Offline Orders if enabled in Ads Account settings
            if (acc.showOfflineOrders && !targetId) {
              targetId = 'offline';
              if (!idMap.has('offline')) {
                idMap.set('offline', { 
                  campaign: { id: 'offline', name: 'Đơn hàng OFFLINE', status: 'ENABLED', biddingStrategyType: 'OFFLINE' },
                  metrics: { costMicros: '0', clicks: '0', ctr: 0, averageCpc: '0', conversions: 0, conversionsValue: 0 } 
                });
              }
            } else {
              continue;
            }
          }

          matchedCount++;

          // Deduplication by phone per campaign (Normalize to last 9 digits to ignore leading 0/84)
          let normalizedPhone = order.phone.replace(/\D/g, '');
          if (normalizedPhone.length >= 9) {
            normalizedPhone = normalizedPhone.slice(-9);
          }
          if (!campaignPhoneSets.has(targetId)) {
            campaignPhoneSets.set(targetId, new Set());
          }
          const phoneSet = campaignPhoneSets.get(targetId)!;
          if (phoneSet.has(normalizedPhone)) continue;
          phoneSet.add(normalizedPhone);

          if (!combinedMetrics[targetId]) {
            combinedMetrics[targetId] = { 
              real_conversions: 0, real_conversions_pending: 0, real_conversions_success: 0, 
              real_conversion_value: 0, real_conversion_value_success: 0 
            };
          }
          const m = combinedMetrics[targetId];
          m.real_conversions++;
          m.real_conversion_value += order.value;
          
          // Expanded success statuses for Pancake: 4(Shipped), 5(Collected), 8(Success), 9(Reconciled), 14(Received)
          const isSuccess = [4, 5, 8, 9, 14].includes(order.status as number);
          const isPending = [0, 1, 2, 3, 10, 12, 13].includes(order.status as number);

          if (isSuccess) {
            m.real_conversions_success++;
            m.real_conversion_value_success += order.value;
          } else if (isPending) {
            m.real_conversions_pending++;
          }
        }
        console.log(`[SYNC] Integration ${integration.provider} - Matched: ${matchedCount}, Unmatched: ${unmatchedCount}`);
      } catch (err) {
        console.error(`[SYNC_SERVICE] Source error ${integration.provider}:`, err);
      }
    }

    // 4. Calculate CFLC (Cost From Last Conversion) - High Precision Checkpoint
    const todayStr = new Date().toISOString().split('T')[0];
    const isSyncingToday = dateStr === todayStr;

    for (const [cId, raw] of idMap.entries()) {
      const crm = combinedMetrics[cId] || { 
        real_conversions: 0, real_conversions_pending: 0, real_conversions_success: 0, 
        real_conversion_value: 0, real_conversion_value_success: 0 
      };

      const dailyCost = BigInt(raw.metrics.costMicros || '0');
      let cfCost = BigInt(0);

      // Debugging: Log bidding info for the first campaign to trace why Target CPA might be missing
      if (raw.campaign?.name.includes('Váy')) {
        console.log(`[DEBUG_BIDDING] Campaign: ${raw.campaign.name}`);
        console.log(`- Type: ${raw.campaign.biddingStrategyType}`);
        console.log(`- MaxConv:`, JSON.stringify(raw.maximizeConversions));
        console.log(`- TargetCPA Obj:`, JSON.stringify(raw.campaign.targetCpa));
      }

      if (isSyncingToday) {
        let settings = await db.query.campaignSettings.findFirst({
          where: and(eq(campaignSettings.customerId, customerId), eq(campaignSettings.campaignId, cId))
        });

        const successCount = crm.real_conversions || 0;

        if (!settings) {
          // Initialize settings for this campaign
          await db.insert(campaignSettings).values({
            customerId,
            campaignId: cId,
            lastConvCount: successCount,
            lastConvCostMicros: dailyCost.toString(),
            updatedAt: new Date()
          }).onConflictDoNothing();
          
          settings = await db.query.campaignSettings.findFirst({
            where: and(eq(campaignSettings.customerId, customerId), eq(campaignSettings.campaignId, cId))
          });
        }

        const lastUpdate = settings?.updatedAt ? new Date(settings.updatedAt) : new Date(0);
        const isNewDay = lastUpdate.toISOString().split('T')[0] !== todayStr;

        if (isNewDay) {
          // New day rule: Everything resets to 0
          cfCost = BigInt(0);
          await db.update(campaignSettings).set({
            lastConvCount: successCount,
            lastConvCostMicros: dailyCost.toString(),
            isExcluded: false,
            updatedAt: new Date()
          }).where(and(eq(campaignSettings.customerId, customerId), eq(campaignSettings.campaignId, cId)));
        } else {
          // Same day: check for new conversion
          if (successCount === 0) {
            // Rule: 0 orders = 0 CFLC
            cfCost = BigInt(0);
          } else if (successCount > (settings?.lastConvCount || 0)) {
            // New conversion detected
            cfCost = BigInt(0);
            await db.update(campaignSettings).set({
              lastConvCount: successCount,
              lastConvCostMicros: dailyCost.toString(),
              updatedAt: new Date()
            }).where(and(eq(campaignSettings.customerId, customerId), eq(campaignSettings.campaignId, cId)));
          } else {
            // Normal calculation
            const prevCostAtConv = BigInt(settings?.lastConvCostMicros || "0");
            cfCost = dailyCost - prevCostAtConv;
            if (cfCost < BigInt(0)) cfCost = BigInt(0);
          }
        }
      } else {
        // Not syncing today: Rule: If 0 orders, CFLC is 0
        cfCost = BigInt(0);
      }

      // Comprehensive search for Target CPA
      const targetCpaMicros = 
        raw.campaign?.maximizeConversions?.targetCpaMicros ||
        raw.maximizeConversions?.targetCpaMicros || 
        raw.campaign?.targetCpa?.targetCpaMicros || 
        raw.targetCpa?.targetCpaMicros ||
        raw.biddingStrategy?.maximizeConversions?.targetCpaMicros ||
        raw.biddingStrategy?.targetCpa?.targetCpaMicros ||
        null;
      
      // Comprehensive search for Target ROAS
      const targetRoasRaw = 
        raw.campaign?.maximizeConversionValue?.targetRoas ||
        raw.maximizeConversionValue?.targetRoas ||
        raw.campaign?.targetRoas?.targetRoas ||
        raw.targetRoas?.targetRoas ||
        raw.biddingStrategy?.maximizeConversionValue?.targetRoas ||
        raw.biddingStrategy?.targetRoas?.targetRoas ||
        null;

      const targetRoasBps = targetRoasRaw ? Math.round(targetRoasRaw * 100) : null;

      const searchBudgetLostIS = raw.metrics?.searchBudgetLostImpressionShare !== undefined && raw.metrics?.searchBudgetLostImpressionShare !== null
        ? String(raw.metrics.searchBudgetLostImpressionShare) 
        : null;
      const searchRankLostIS = raw.metrics?.searchRankLostImpressionShare !== undefined && raw.metrics?.searchRankLostImpressionShare !== null
        ? String(raw.metrics.searchRankLostImpressionShare) 
        : null;

      await this.upsertSnapshot(
        customerId, 
        raw, 
        dateStr, 
        crm, 
        cfCost.toString(), 
        targetCpaMicros, 
        targetRoasBps,
        searchBudgetLostIS,
        searchRankLostIS
      );
    }

    await db.update(adsAccounts).set({ lastSyncedAt: new Date() }).where(eq(adsAccounts.id, adsAccountId));
    await redisClient.publish(`sync:complete:${customerId}`, JSON.stringify({ timestamp: Date.now() }));
  }

  private static async upsertSnapshot(
    customerId: string, 
    raw: any, 
    dateStr: string, 
    crm: CrmConversions, 
    cfCostMicros: string,
    targetCpaMicros?: string | null,
    targetRoasBps?: number | null,
    searchBudgetLostImpressionShare?: string | null,
    searchRankLostImpressionShare?: string | null
  ) {
    const googleConvRaw = (raw.metrics.conversions || 0).toString();
    const googleValRaw = (raw.metrics.conversionsValue ? raw.metrics.conversionsValue * 1000000 : 0).toString();
    
    // Standard display fields -> Map to TOTAL VALID CRM conversions (to match legacy ROAS logic)
    // Legacy system counts all non-cancelled orders for ROAS.
    const realConv = (crm.real_conversions || 0).toString(); 
    const valRaw = (crm.real_conversion_value || 0) * 1000000;
    const realVal = (isNaN(valRaw) ? 0 : Math.floor(valRaw)).toString();

    return db.insert(campaignsSnapshot).values({
      customerId,
      campaignId: raw.campaign.id,
      date: dateStr,
      name: raw.campaign.name,
      status: raw.campaign.status,
      biddingStrategyType: raw.campaign.biddingStrategyType || null,
      budgetMicros: raw.campaignBudget?.amountMicros || "0",
      costMicros: raw.metrics.costMicros || "0",
      clicks: parseInt(raw.metrics.clicks || "0", 10),
      ctrBps: raw.metrics.ctr ? Math.floor(raw.metrics.ctr * 10000) : 0,
      avgCpcMicros: raw.metrics.averageCpc || "0",
      
      // Standard display fields -> map to TOTAL VALID
      googleConversions: realConv, 
      googleConversionValueMicros: realVal,
      
      // Detailed CRM fields
      realConversions: crm.real_conversions || 0,
      realConversionsPending: crm.real_conversions_pending || 0,
      realConversionsSuccess: crm.real_conversions_success || 0,
      realConversionValueMicros: (isNaN(crm.real_conversion_value * 1000000) ? 0 : Math.floor(crm.real_conversion_value * 1000000)).toString(),
      realConversionValueSuccessMicros: realVal,
      
      // CFLC Implementation
      cfCostMicros: cfCostMicros,
      
      targetCpaMicros: targetCpaMicros,
      targetRoasBps: targetRoasBps,
      searchBudgetLostImpressionShare: searchBudgetLostImpressionShare || null,
      searchRankLostImpressionShare: searchRankLostImpressionShare || null,
      primaryStatus: raw.campaign.primaryStatus || "ELIGIBLE",
    }).onConflictDoUpdate({
      target: [campaignsSnapshot.customerId, campaignsSnapshot.campaignId, campaignsSnapshot.date],
      set: {
        updatedAt: new Date(),
        status: raw.campaign.status,
        name: raw.campaign.name,
        biddingStrategyType: raw.campaign.biddingStrategyType || null,
        budgetMicros: raw.campaignBudget?.amountMicros || "0",
        costMicros: raw.metrics.costMicros || "0",
        clicks: parseInt(raw.metrics.clicks || "0", 10),
        ctrBps: raw.metrics.ctr ? Math.floor(raw.metrics.ctr * 10000) : 0,
        avgCpcMicros: raw.metrics.averageCpc || "0",
        
        googleConversions: realConv,
        googleConversionValueMicros: realVal,
        
        realConversions: crm.real_conversions || 0,
        realConversionsPending: crm.real_conversions_pending || 0,
        realConversionsSuccess: crm.real_conversions_success || 0,
        realConversionValueMicros: (isNaN(crm.real_conversion_value * 1000000) ? 0 : Math.floor(crm.real_conversion_value * 1000000)).toString(),
        realConversionValueSuccessMicros: realVal,
        
        cfCostMicros: cfCostMicros,
        
        targetCpaMicros: targetCpaMicros,
        targetRoasBps: targetRoasBps,
        searchBudgetLostImpressionShare: searchBudgetLostImpressionShare || null,
        searchRankLostImpressionShare: searchRankLostImpressionShare || null,
        primaryStatus: raw.campaign.primaryStatus || "ELIGIBLE",
      }
    });
  }
}
