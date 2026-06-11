import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, adsAccounts, crmIntegrations, crmConnections, campaignSettings, userAdsAccounts } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { CampaignsService } from "@repo/google-ads";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id: accountId } = await params;

    // 1. Fetch Ads Account details & User Preference
    const [accountData] = await db.select({
      account: adsAccounts,
      showPausedByDefault: userAdsAccounts.showPausedByDefault
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(and(
      eq(adsAccounts.id, accountId),
      eq(userAdsAccounts.userId, session.user.id)
    ));

    if (!accountData) return new NextResponse("Account not found", { status: 404 });

    const { account, showPausedByDefault } = accountData;

    // 2. Fetch Linked Order Sources
    const linkedSources = await db.select({
      id: crmIntegrations.id,
      connectionId: crmConnections.id,
      name: crmConnections.name,
      type: crmConnections.type,
      isEnabled: crmIntegrations.isEnabled
    })
    .from(crmIntegrations)
    .innerJoin(crmConnections, eq(crmIntegrations.crmConnectionId, crmConnections.id))
    .where(eq(crmIntegrations.adsAccountId, accountId));

    // 3. Fetch All Available CRM Connections for the user (to add as new sources)
    const availableConnections = await db.select()
      .from(crmConnections)
      .where(eq(crmConnections.userId, session.user.id));

    // 4. Fetch Campaigns from Google Ads API
    const campaignsService = new CampaignsService(
      account.oauthConnectionId!, 
      account.customerId, 
      account.loginCustomerId || undefined
    );
    
    const [adsCampaigns, localSettings] = await Promise.all([
      campaignsService.listCampaigns(),
      db.select()
        .from(campaignSettings)
        .where(eq(campaignSettings.customerId, account.customerId))
    ]);

    return NextResponse.json({
      account,
      showPausedByDefault,
      linkedSources,
      availableConnections,
      adsCampaigns,
      localSettings
    });
  } catch (error) {
    console.error("[ACCOUNT_SETTINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id: accountId } = await params;
    const body = await req.json();
    const { action, crmConnectionId, campaignId, isExcluded } = body;

    if (action === 'link_source') {
      const [newLink] = await db.insert(crmIntegrations)
        .values({
          adsAccountId: accountId,
          crmConnectionId: crmConnectionId,
          isEnabled: true
        })
        .returning();
      return NextResponse.json(newLink);
    }

    if (action === 'unlink_source') {
        await db.delete(crmIntegrations)
            .where(and(
                eq(crmIntegrations.adsAccountId, accountId),
                eq(crmIntegrations.crmConnectionId, crmConnectionId)
            ));
        return new NextResponse(null, { status: 204 });
    }

    if (action === 'update_show_paused') {
        const { showPaused } = body;
        await db.update(userAdsAccounts)
            .set({ showPausedByDefault: showPaused })
            .where(and(
                eq(userAdsAccounts.userId, session.user.id),
                eq(userAdsAccounts.adsAccountId, accountId)
            ));
        
        return NextResponse.json({ success: true });
    }

    if (action === 'update_show_offline') {
        const { showOffline } = body;
        await db.update(adsAccounts)
            .set({ 
                showOfflineOrders: showOffline
            })
            .where(eq(adsAccounts.id, accountId));
        
        return NextResponse.json({ success: true });
    }


    return new NextResponse("Invalid action", { status: 400 });
  } catch (error) {
    console.error("[ACCOUNT_SETTINGS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
