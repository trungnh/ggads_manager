import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, campaignSettings, adsAccounts } from "@repo/db";
import { CampaignsService } from "@repo/google-ads";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { customerId, campaignId, type, value } = body;

  if (!customerId || !campaignId || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // 1. Resolve account details to get oauthConnectionId
    const [acc] = await db.select({
      oauthConnectionId: adsAccounts.oauthConnectionId,
      loginCustomerId: adsAccounts.loginCustomerId
    })
    .from(adsAccounts)
    .where(eq(adsAccounts.customerId, customerId))
    .limit(1);

    if (!acc || !acc.oauthConnectionId) {
      return NextResponse.json({ error: "Account not linked or not found" }, { status: 404 });
    }

    const campaignsService = new CampaignsService(acc.oauthConnectionId, customerId, acc.loginCustomerId || undefined);

    switch (type) {
      case 'budget':
        // Update Google Ads
        await campaignsService.updateCampaignBudget(campaignId, value.toString());
        // No local DB update needed here as the next sync will pick it up, 
        // but for immediate feedback we can update settings or just return success.
        break;

      case 'target_cpa':
        // Update Google Ads
        await campaignsService.updateCampaignTargetCpa(campaignId, value.toString());
        break;

      case 'status':
        // Update Google Ads (ENABLED, PAUSED)
        await campaignsService.updateCampaignStatus(campaignId, value);
        break;

      case 'is_excluded':
        await db.insert(campaignSettings).values({
          customerId, campaignId, isExcluded: !!value
        }).onConflictDoUpdate({
          target: [campaignSettings.customerId, campaignSettings.campaignId],
          set: { isExcluded: !!value, updatedAt: new Date() }
        });
        break;

      case 'cflc_reset':
      case 'cflc_override': {
        const { currentCost, currentConversions } = body;
        const inputCflcMicros = type === 'cflc_reset' ? BigInt(0) : BigInt(Math.round(parseFloat(value) * 1000000));
        const impliedCheckpoint = BigInt(currentCost || '0') - inputCflcMicros;
        
        await db.insert(campaignSettings).values({
          customerId,
          campaignId,
          lastConvCostMicros: impliedCheckpoint.toString(),
          lastConvCount: Math.round(parseFloat(currentConversions || '0')),
          updatedAt: new Date()
        }).onConflictDoUpdate({
          target: [campaignSettings.customerId, campaignSettings.campaignId],
          set: { 
            lastConvCostMicros: impliedCheckpoint.toString(),
            lastConvCount: Math.round(parseFloat(currentConversions || '0')),
            updatedAt: new Date() 
          }
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid update type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[CAMPAIGN_UPDATE] Error updating ${type}:`, error);
    return NextResponse.json({ error: error.message || "Failed to update campaign" }, { status: 500 });
  }
}
