import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, campaignsSnapshot, adsAccounts } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { CampaignsService } from "@repo/google-ads";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ adsAccountId: string }> }
) {
  const { adsAccountId } = await params;
  const session = await auth();
  
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Find the ads account info
  const account = await db.select({
    customerId: adsAccounts.customerId,
    loginCustomerId: adsAccounts.loginCustomerId,
    oauthConnectionId: adsAccounts.oauthConnectionId
  })
  .from(adsAccounts)
  .where(eq(adsAccounts.id, adsAccountId))
  .limit(1)
  .then(res => res[0]);

  if (!account) {
    return new NextResponse("Account not found", { status: 404 });
  }

  // 1. Try to fetch campaigns directly from Google Ads API
  try {
    if (account.oauthConnectionId) {
      console.log(`[API_CAMPAIGNS_LIST] Fetching campaigns directly from Google Ads API for customer: ${account.customerId}`);
      const campaignsService = new CampaignsService(
        account.oauthConnectionId,
        account.customerId,
        account.loginCustomerId || undefined
      );

      const rawCampaigns = await campaignsService.listCampaigns();
      const mappedCampaigns = rawCampaigns.map(rc => ({
        id: rc.campaign.id,
        name: rc.campaign.name,
        status: rc.campaign.status
      }));

      return NextResponse.json({ campaigns: mappedCampaigns });
    }
  } catch (apiError: any) {
    console.error("[API_CAMPAIGNS_LIST] Google Ads API fetch failed, falling back to DB snapshots:", apiError);
  }

  // 2. Fallback: Fetch from DB snapshots using customerId
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch latest snapshots for this account
    // We use today's date if possible, otherwise just the latest available
    const campaigns = await db.select({
      id: campaignsSnapshot.campaignId,
      name: campaignsSnapshot.name,
      status: campaignsSnapshot.status
    })
    .from(campaignsSnapshot)
    .where(and(
      eq(campaignsSnapshot.customerId, account.customerId),
      eq(campaignsSnapshot.date, today)
    ));

    // If no snapshots today (e.g. before sync), try to get the most recent ones
    if (campaigns.length === 0) {
      const latestSnapshots = await db.select({
        id: campaignsSnapshot.campaignId,
        name: campaignsSnapshot.name,
        status: campaignsSnapshot.status
      })
      .from(campaignsSnapshot)
      .where(eq(campaignsSnapshot.customerId, account.customerId))
      .orderBy(campaignsSnapshot.date)
      .limit(100); // Just a heuristic
      
      return NextResponse.json({ campaigns: latestSnapshots });
    }

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error("[API_CAMPAIGNS_LIST] Fallback Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
