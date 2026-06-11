import { NextResponse } from "next/server";
import { CampaignSyncService } from "@repo/services";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { adsAccountId, customerId, dateStr, accounts } = body;

    if (accounts && Array.isArray(accounts)) {
      // Sync SPECIFIC accounts - find connection that has access
      let totalCount = 0;
      for (const account of accounts) {
        // We'll perform a quick deep search or use the first active one if it's a selection
        // Ideally the frontend should pass connectionId, but for now we fallback to the robust search
        const count = await CampaignSyncService.syncUserAccounts(session.user.id);
        totalCount += count;
      }
      return NextResponse.json({ success: true, mode: 'selection', count: totalCount });
    }

    if (!adsAccountId || !customerId) {
      // Global discovery: Iterates through ALL active connections
      const count = await CampaignSyncService.syncUserAccounts(session.user.id);
      return NextResponse.json({ success: true, mode: 'discovery', count });
    }

    const syncDate = dateStr || new Date().toISOString().split('T')[0];

    // Trigger sync service for a specific account
    await CampaignSyncService.syncCampaigns(session.user.id, adsAccountId, customerId, syncDate);

    return NextResponse.json({ success: true, mode: 'campaigns', date: syncDate });
  } catch (error: any) {
    console.error("Failed to sync:", error);
    return new NextResponse(JSON.stringify({ error: error.message || "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
