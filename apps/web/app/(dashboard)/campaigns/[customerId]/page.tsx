import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, adsAccounts, campaignsSnapshot, campaignSettings, userAdsAccounts } from "@repo/db";
import { eq, and, desc, sql } from "drizzle-orm";
import CampaignListClient from "../CampaignListClient";
import { Suspense } from "react";

export default async function CampaignDetailsPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ customerId: string }>,
  searchParams: Promise<{ startDate?: string, endDate?: string }> 
}) {
  const { customerId } = await params;
  const { startDate, endDate } = await searchParams;
  
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const defaultDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const start = startDate || defaultDate;
  const end = endDate || start;
  
  // Fetch account details & user preferences
  const [accountData] = await db.select({
    account: adsAccounts,
    showPausedByDefault: userAdsAccounts.showPausedByDefault
  })
  .from(adsAccounts)
  .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
  .where(and(
    eq(adsAccounts.customerId, customerId),
    eq(userAdsAccounts.userId, session.user.id)
  ))
  .limit(1);

  if (!accountData) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu cho tài khoản {customerId}. Hãy đồng bộ tài khoản trước.</div>;
  }

  const { account, showPausedByDefault } = accountData;

  // Fetch all ads accounts for the user (for the dropdown)
  const allAccounts = await db
    .select({
      id: adsAccounts.id,
      customerId: adsAccounts.customerId,
      name: adsAccounts.name,
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, session.user.id));

  // Fetch and aggregate campaigns for this account and date range
  const campaigns = await db.select({
    id: campaignsSnapshot.campaignId,
    name: sql`MAX(${campaignsSnapshot.name})`.as('name'),
    status: sql`MAX(${campaignsSnapshot.status})`.as('status'),
    bidding_strategy_type: sql`MAX(${campaignsSnapshot.biddingStrategyType})`.as('bidding_strategy_type'),
    budget: sql`MAX(${campaignsSnapshot.budgetMicros})`.as('budget'),
    cost: sql`SUM(CAST(${campaignsSnapshot.costMicros} AS NUMERIC))`.as('cost'),
    clicks: sql`SUM(${campaignsSnapshot.clicks})`.as('clicks'),
    conversions: sql`SUM(${campaignsSnapshot.realConversions})`.as('conversions'),
    conversion_value: sql`SUM(CAST(${campaignsSnapshot.realConversionValueMicros} AS NUMERIC))`.as('conversion_value'),
    ctr_bps: sql`AVG(${campaignsSnapshot.ctrBps})`.as('ctr_bps'),
    avg_cpc: sql`AVG(CAST(${campaignsSnapshot.avgCpcMicros} AS NUMERIC))`.as('avg_cpc'),
    target_cpa: sql`MAX(CAST(${campaignsSnapshot.targetCpaMicros} AS NUMERIC))`.as('target_cpa'),
    target_roas: sql`MAX(${campaignsSnapshot.targetRoasBps})`.as('target_roas'),
    google_conversions: sql`SUM(CAST(${campaignsSnapshot.googleConversions} AS NUMERIC))`.as('google_conversions'),
    google_conversion_value: sql`SUM(CAST(${campaignsSnapshot.googleConversionValueMicros} AS NUMERIC))`.as('google_conversion_value'),
    cf_cost: sql`SUM(CAST(${campaignsSnapshot.cfCostMicros} AS NUMERIC))`.as('cf_cost'),
    real_pending: sql`SUM(${campaignsSnapshot.realConversionsPending})`.as('real_pending'),
    real_success: sql`SUM(${campaignsSnapshot.realConversionsSuccess})`.as('real_success'),
    real_success_value: sql`SUM(CAST(${campaignsSnapshot.realConversionValueSuccessMicros} AS NUMERIC))`.as('real_success_value'),
    is_excluded: sql`BOOL_OR(${campaignSettings.isExcluded})`.as('is_excluded'),
  })
  .from(campaignsSnapshot)
  .leftJoin(campaignSettings, and(
    eq(campaignSettings.customerId, campaignsSnapshot.customerId),
    eq(campaignSettings.campaignId, campaignsSnapshot.campaignId)
  ))
  .where(and(
    eq(campaignsSnapshot.customerId, customerId),
    sql`${campaignsSnapshot.date} >= ${start}::date`,
    sql`${campaignsSnapshot.date} <= ${end}::date`
  ))
  .groupBy(campaignsSnapshot.campaignId, campaignsSnapshot.customerId)
  .orderBy(desc(sql`SUM(CAST(${campaignsSnapshot.costMicros} AS NUMERIC))`));

  const formattedCampaigns = campaigns.map((c: any) => ({
    id: String(c.id),
    name: String(c.name || ''),
    status: String(c.status || ''),
    biddingStrategyType: String(c.bidding_strategy_type || ''),
    budget: String(c.budget || '0'),
    cost: String(c.cost || '0'),
    clicks: Number(c.clicks || 0),
    conversions: String(c.conversions || '0'),
    conversionValue: String(c.conversion_value || '0'),
    ctr: Number(c.ctr_bps || 0),
    avgCpc: String(Math.round(Number(c.avg_cpc || 0))),
    targetCpa: c.target_cpa ? String(c.target_cpa) : undefined,
    targetRoas: c.target_roas ? Number(c.target_roas) : undefined,
    realConversions: Number(c.conversions || 0),
    realConversionValue: String(c.conversion_value || '0'),
    realPending: Number(c.real_pending || 0),
    realSuccess: Number(c.real_success || 0),
    realSuccessValue: String(c.real_success_value || '0'),
    cfCost: String(c.cf_cost || '0'),
    isExcluded: Boolean(c.is_excluded),
  }));

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Đang tải chiến dịch...</div>}>
      <CampaignListClient 
        account={{
          id: account.id,
          name: account.name || 'Tài khoản không tên',
          customerId: account.customerId,
          showOfflineOrders: account.showOfflineOrders ?? undefined,
        }}
        accounts={allAccounts}
        initialCampaigns={formattedCampaigns}
        startDate={start}
        endDate={end}
        showPausedByDefault={showPausedByDefault ?? undefined}
      />
    </Suspense>
  );
}
