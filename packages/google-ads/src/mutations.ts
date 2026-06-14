import { GoogleAdsClient } from './client';

export class MutationsService {
  private client: GoogleAdsClient;

  constructor(userId: string, customerId: string, loginCustomerId?: string) {
    this.client = new GoogleAdsClient(userId, customerId, loginCustomerId);
  }

  /**
   * Toggles campaign status (ENABLED or PAUSED)
   */
  async toggleCampaignStatus(campaignId: string, status: 'ENABLED' | 'PAUSED') {
    const payload = {
      operations: [
        {
          updateMask: 'status',
          update: {
            resourceName: `customers/${this.client['customerId']}/campaigns/${campaignId}`,
            status: status
          }
        }
      ]
    };

    return await this.client.request(`/customers/${this.client.customerId}/campaigns:mutate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Updates the budget of a campaign by first finding its budget resource
   */
  async updateCampaignBudget(campaignId: string, amountMicros: string) {
    // 1. Find the budget resource name for this campaign
    const query = `SELECT campaign.id, campaign_budget.resource_name FROM campaign WHERE campaign.id = '${campaignId}'`;
    const results = await this.client.searchStream<any>(query);
    const budgetResourceName = results[0]?.campaignBudget?.resourceName;

    if (!budgetResourceName) {
      throw new Error(`Could not find budget resource for campaign ${campaignId}`);
    }

    const payload = {
      operations: [
        {
          updateMask: 'amount_micros',
          update: {
            resourceName: budgetResourceName,
            amountMicros: amountMicros
          }
        }
      ]
    };

    return await this.client.request(`/customers/${this.client.customerId}/campaignBudgets:mutate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Excludes placement URLs at the account level using CustomerNegativeCriterion
   */
  async excludePlacementsAtAccountLevel(urls: string[]) {
    const operations = urls.map(url => {
      // 1. YouTube Channel Detection
      if (url.includes("youtube.com/channel/")) {
        const channelId = url.split("youtube.com/channel/")[1]?.split("/")[0] || url;
        return {
          create: {
            youtubeChannel: {
              channelId: channelId
            }
          }
        };
      }
      
      // 2. Mobile App Detection
      if (url.startsWith("mobileapp::")) {
        const appId = url.replace("mobileapp::", "");
        return {
          create: {
            mobileApplication: {
              appId: appId
            }
          }
        };
      }
      
      // 3. Default Website Placement
      return {
        create: {
          placement: {
            url: url
          }
        }
      };
    });

    return await this.client.request(`/customers/${this.client.customerId}/customerNegativeCriteria:mutate`, {
      method: 'POST',
      body: JSON.stringify({ operations })
    });
  }
}
