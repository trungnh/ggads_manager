import { NextResponse } from "next/server";
import { db, adsAccounts, userAdsAccounts, optimizationRules, campaignsSnapshot } from "@repo/db";
import { eq, inArray, and, sql } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Fetch connected ads accounts for the user
    const accounts = await db
      .select({
        id: adsAccounts.id,
        customerId: adsAccounts.customerId,
      })
      .from(adsAccounts)
      .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
      .where(eq(userAdsAccounts.userId, session.user.id));

    if (accounts.length === 0) {
      return NextResponse.json({ campaignsCount: 0, rulesCount: 0 });
    }

    const accountIds = accounts.map(a => a.id);
    const customerIds = accounts.map(a => a.customerId);

    // 2. Count active/enabled rules
    const rulesCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(optimizationRules)
      .where(
        and(
          inArray(optimizationRules.adsAccountId, accountIds),
          eq(optimizationRules.isEnabled, true)
        )
      );
    
    const rulesCount = Number(rulesCountResult[0]?.count || 0);

    // 3. Count unique enabled campaigns from the latest snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`max(${campaignsSnapshot.date})` })
      .from(campaignsSnapshot)
      .where(inArray(campaignsSnapshot.customerId, customerIds));
    
    const latestDate = latestDateResult[0]?.maxDate;

    let campaignsCount = 0;
    if (latestDate) {
      const campaignsCountResult = await db
        .select({ count: sql<number>`count(distinct ${campaignsSnapshot.campaignId})` })
        .from(campaignsSnapshot)
        .where(
          and(
            inArray(campaignsSnapshot.customerId, customerIds),
            eq(campaignsSnapshot.date, sql`${latestDate}::date`),
            eq(campaignsSnapshot.status, "ENABLED")
          )
        );
      campaignsCount = Number(campaignsCountResult[0]?.count || 0);
    }

    return NextResponse.json({
      campaignsCount,
      rulesCount
    });
  } catch (error: any) {
    console.error("Failed to fetch sidebar stats:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
