import { db, campaignSchedules, adsAccounts, userAdsAccounts } from '@repo/db';
import { eq, and } from 'drizzle-orm';
import { GoogleAdsClient, MutationsService } from '@repo/google-ads';

export class ScheduleEngine {
  /**
   * Run schedule execution for all active schedules that match the current 5-minute interval
   */
  static async executeAllSchedules(mockMode: boolean = true) {
    const now = new Date();
    // Get current time in HH:MM format
    const hours = String(now.getHours()).padStart(2, '0');
    // Round minutes to nearest 5 for strict 5-min intervals
    const roundedMinutes = Math.floor(now.getMinutes() / 5) * 5;
    const minutes = String(roundedMinutes).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    console.log(`[SCHEDULE_ENGINE] Checking schedules for time: ${currentTimeStr} (Mock Mode: ${mockMode})`);

    const activeSchedules = await db.query.campaignSchedules.findMany({
      where: and(
        eq(campaignSchedules.status, 'active'),
        eq(campaignSchedules.executionTime, currentTimeStr)
      )
    });

    if (activeSchedules.length === 0) {
      console.log(`[SCHEDULE_ENGINE] No schedules matched for ${currentTimeStr}.`);
      return;
    }

    console.log(`[SCHEDULE_ENGINE] Found ${activeSchedules.length} schedules to execute.`);

    for (const schedule of activeSchedules) {
      try {
        await this.executeSchedule(schedule, mockMode);
      } catch (error: any) {
        console.error(`[SCHEDULE_ENGINE] Error executing schedule ${schedule.id}:`, error);
      }
    }
  }

  static async executeSchedule(schedule: any, mockMode: boolean) {
    console.log(`[SCHEDULE_ENGINE] Executing schedule: "${schedule.name}" (Action: ${schedule.actionType}) on ${schedule.campaignIds.length} campaigns.`);

    const account = await db.query.adsAccounts.findFirst({
      where: eq(adsAccounts.id, schedule.adsAccountId)
    });

    if (!account) {
      throw new Error(`Ads Account not found for schedule ${schedule.id}`);
    }

    const userAccount = await db.query.userAdsAccounts.findFirst({
      where: eq(userAdsAccounts.adsAccountId, account.id)
    });

    if (!userAccount) {
      throw new Error(`User mapping not found for ads account ${account.id}`);
    }

    // Process campaigns
    for (const campaignId of schedule.campaignIds) {
      if (mockMode) {
        console.log(`[SCHEDULE_ENGINE] [MOCK] Applying ${schedule.actionType} to campaign ${campaignId} (Customer: ${account.customerId})`);
        if (['set_budget', 'increase_budget', 'decrease_budget'].includes(schedule.actionType)) {
          console.log(`[SCHEDULE_ENGINE] [MOCK] Budget Value: ${schedule.budgetValue}, Is Percentage: ${schedule.budgetIsPercentage}`);
        }
      } else {
        // Real Google Ads API execution
        const mutations = new MutationsService(
          account.oauthConnectionId!,
          account.customerId,
          account.loginCustomerId || undefined
        );
        
        switch (schedule.actionType) {
          case 'pause_campaign':
            await mutations.toggleCampaignStatus(campaignId, 'PAUSED');
            break;
          case 'enable_campaign':
            await mutations.toggleCampaignStatus(campaignId, 'ENABLED');
            break;
          case 'set_budget':
            if (schedule.budgetValue) {
              const micros = Math.floor(Number(schedule.budgetValue) * 1_000_000).toString();
              await mutations.updateCampaignBudget(campaignId, micros);
            }
            break;
          case 'increase_budget':
          case 'decrease_budget':
            console.log(`[SCHEDULE_ENGINE] Action ${schedule.actionType} requires reading current budget first. Not fully implemented for real API yet.`);
            // A full implementation would fetch the current budget, calculate the new value, and update.
            break;
          default:
            console.warn(`[SCHEDULE_ENGINE] Unknown action type: ${schedule.actionType}`);
        }
      }
    }

    // Update last executed date
    await db.update(campaignSchedules)
      .set({ lastExecutedDate: new Date().toISOString().split('T')[0], updatedAt: new Date() })
      .where(eq(campaignSchedules.id, schedule.id));
      
    console.log(`[SCHEDULE_ENGINE] Completed schedule: "${schedule.name}".`);
  }
}
