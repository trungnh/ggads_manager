import { GoogleAdsClient } from './client';

export interface CampaignRawData {
  campaign: {
    id: string;
    name: string;
    status: string;
    primaryStatus?: string;
    biddingStrategyType?: string;
  };
  campaignBudget: {
    resourceName: string;
    amountMicros: string;
  };
  metrics: {
    costMicros: string;
    clicks: string;
    ctr: number;
    averageCpc: string;
    conversions: number;
    conversionsValue: number;
    searchBudgetLostImpressionShare?: number;
    searchRankLostImpressionShare?: number;
  };
  // Detailed bidding strategy info
  maximizeConversions?: {
    targetCpaMicros?: string;
  };
  maximizeConversionValue?: {
    targetRoas?: number;
  };
}

export class CampaignsService {
  private client: GoogleAdsClient;

  constructor(userId: string, customerId: string, loginCustomerId?: string) {
    this.client = new GoogleAdsClient(userId, customerId, loginCustomerId);
  }

  /**
   * Fetches campaign metrics for a specific date via GAQL
   */
  async getCampaignsForDate(dateStr: string): Promise<CampaignRawData[]> {
    const query = `
      SELECT 
        campaign.id, 
        campaign.name, 
        campaign.status, 
        campaign.primary_status,
        campaign.bidding_strategy_type,
        campaign_budget.resource_name,
        campaign_budget.amount_micros, 
        metrics.cost_micros, 
        metrics.clicks, 
        metrics.ctr, 
        metrics.average_cpc, 
        metrics.conversions, 
        metrics.conversions_value,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share,
        campaign.maximize_conversions.target_cpa_micros,
        campaign.maximize_conversion_value.target_roas,
        campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas,
        bidding_strategy.maximize_conversions.target_cpa_micros,
        bidding_strategy.maximize_conversion_value.target_roas
      FROM campaign 
      WHERE segments.date = '${dateStr}'
        AND campaign.status != 'REMOVED'
    `;

    return await this.client.searchStream<any>(query);
  }

  async getCampaignsToday(): Promise<CampaignRawData[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getCampaignsForDate(today);
  }


  async updateCampaignStatus(campaignId: string, status: 'ENABLED' | 'PAUSED') {
    const operation = {
      update: {
        resourceName: `customers/${this.client.customerId}/campaigns/${campaignId}`,
        status: status
      },
      updateMask: 'status'
    };
    return await this.client.mutate(`customers/${this.client.customerId}/campaigns:mutate`, [operation]);
  }

  async updateCampaignBudget(campaignId: string, amountMicros: string) {
    // 1. Get budget resource name first
    const query = `SELECT campaign.id, campaign_budget.resource_name FROM campaign WHERE campaign.id = '${campaignId}'`;
    const results = await this.client.searchStream<any>(query);
    const budgetResourceName = results[0]?.campaignBudget?.resourceName;

    if (!budgetResourceName) throw new Error("Could not find budget for campaign");

    const operation = {
      update: {
        resourceName: budgetResourceName,
        amountMicros: amountMicros
      },
      updateMask: 'amount_micros'
    };
    return await this.client.mutate(`customers/${this.client.customerId}/campaignBudgets:mutate`, [operation]);
  }

  async updateCampaignTargetCpa(campaignId: string, targetCpaMicros: string) {
    const operation = {
      update: {
        resourceName: `customers/${this.client.customerId}/campaigns/${campaignId}`,
        maximizeConversions: {
          targetCpaMicros: targetCpaMicros
        }
      },
      updateMask: 'maximize_conversions.target_cpa_micros'
    };
    return await this.client.mutate(`customers/${this.client.customerId}/campaigns:mutate`, [operation]);
  }

  /**
   * Lists basic campaign info (Enabled and Paused)
   */
  async listCampaigns(): Promise<CampaignRawData[]> {
    const query = `
      SELECT 
        campaign.id, 
        campaign.name, 
        campaign.status, 
        campaign.primary_status,
        campaign.bidding_strategy_type,
        campaign_budget.amount_micros,
        campaign.maximize_conversions.target_cpa_micros,
        campaign.maximize_conversion_value.target_roas,
        campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas,
        bidding_strategy.maximize_conversions.target_cpa_micros,
        bidding_strategy.maximize_conversion_value.target_roas,
        bidding_strategy.target_cpa.target_cpa_micros,
        bidding_strategy.target_roas.target_roas
      FROM campaign 
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
    `;
    return await this.client.searchStream<CampaignRawData>(query);
  }
}
