export interface CrmOrder {
  id: string;
  phone: string;
  campaignId: string | null;
  status: number | string;
  value: number; // in local currency (e.g., VND)
  createdAt: Date;
}

export interface CrmConversions {
  real_conversions: number;
  real_conversions_pending: number;
  real_conversions_success: number;
  real_conversion_value: number;
  real_conversion_value_success: number;
}

export interface CrmAdapter {
  /**
   * Fetches raw orders from the CRM provider.
   */
  fetchOrders(startDate: Date, endDate: Date): Promise<CrmOrder[]>;

  /**
   * Processes raw orders into campaign-level conversion metrics.
   * Dedups by phone number per campaign.
   */
  processConversions(
    orders: CrmOrder[], 
    targetCampaignIds: string[]
  ): Record<string, CrmConversions>;
}
