import { GoogleAdsClient } from './client';

export interface PlacementRawData {
  detailPlacementView: {
    placement: string;
    displayName?: string;
    placementType: string;
  };
  metrics: {
    costMicros: string;
    clicks: string;
    conversions: string;
    impressions: string;
  };
}

export class PlacementsService {
  private client: GoogleAdsClient;

  constructor(userId: string, customerId: string, loginCustomerId?: string) {
    this.client = new GoogleAdsClient(userId, customerId, loginCustomerId);
  }

  /**
   * Queries detail_placement_view for real placement performance data with dynamic date range
   */
  async getPlacementsPerformance(
    datePreset?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PlacementRawData[]> {
    let dateCondition = "segments.date DURING LAST_30_DAYS";

    if (datePreset === "CUSTOM" && startDate && endDate) {
      dateCondition = `segments.date >= '${startDate}' AND segments.date <= '${endDate}'`;
    } else if (datePreset === "YESTERDAY") {
      dateCondition = "segments.date DURING YESTERDAY";
    } else if (datePreset === "LAST_7_DAYS") {
      dateCondition = "segments.date DURING LAST_7_DAYS";
    } else if (datePreset === "LAST_30_DAYS") {
      dateCondition = "segments.date DURING LAST_30_DAYS";
    } else if (datePreset === "LAST_14_DAYS") {
      // Calculate 14 days ago up to yesterday to ensure stable and complete data
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      
      dateCondition = `segments.date >= '${formatDate(start)}' AND segments.date <= '${formatDate(yesterday)}'`;
    }

    const query = `
      SELECT 
        detail_placement_view.placement, 
        detail_placement_view.display_name, 
        detail_placement_view.placement_type, 
        metrics.cost_micros, 
        metrics.clicks, 
        metrics.conversions, 
        metrics.impressions 
      FROM detail_placement_view 
      WHERE ${dateCondition} 
        AND metrics.impressions > 0
    `;

    return await this.client.searchStream<PlacementRawData>(query);
  }
}
