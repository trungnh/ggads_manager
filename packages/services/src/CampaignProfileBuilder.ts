import { db, campaignsSnapshot } from '@repo/db';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

export interface DayOfWeekProfile {
  dow: number; // 0 = Sunday
  label: string; // "T2", "T3"... "CN"
  avgCostMicros: number;
  avgConversions: number;
  avgCpaMicros: number;
  relativeCpaIndex: number;
  sampleDays: number;
}

export interface HourlyProfile {
  hour: number;
  avgCostMicros: number;
  avgConversions: number;
  avgCpaMicros: number | null;
  relativePerformanceIndex: number;
  sampleCount: number;
}

export interface MarginalReturn {
  budgetMicros: number;
  expectedConversions: number;
  expectedCpaMicros: number;
  marginalCpaMicros: number;
}

export interface CampaignHistoricalProfile {
  campaignId: string;
  campaignName: string;
  status: 'ENABLED' | 'PAUSED';
  currentBudgetMicros: number;

  activeDays: number;
  avgDailyCostMicros: number;
  avgDailyConversions: number;
  avgDailyCpaMicros: number | null;
  avgDailyRoas: number;
  avgDailyRevenueMicros: number;
  totalCostMicros: number;
  totalConversions: number;
  totalRevenueMicros: number;

  avgBudgetSpentPct: number;
  daysExhaustedEarly: number;
  daysUnderutilized: number;

  efficiencyScore: number;
  cpaStdDev: number;
  conversionTrend: 'up' | 'flat' | 'down';

  // Seasonality
  dowPerformance: DayOfWeekProfile[];
  hourlyPerformance: HourlyProfile[];

  // Impression Share
  searchBudgetLostImpressionShare: number; // 0.0 - 1.0
  searchRankLostImpressionShare: number;   // 0.0 - 1.0

  // Marginal returns
  marginalReturnCurve: MarginalReturn[];
  biddingStrategyType?: string | null;
}

export class CampaignProfileBuilder {
  /**
   * Builds historical profiles for eligible campaigns across multiple customer accounts
   */
  async buildProfiles(
    customerIds: string[],
    daysToLookback = 30,
    excludedStatuses: string[] = [],
    excludedTags: string[] = []
  ): Promise<CampaignHistoricalProfile[]> {
    if (customerIds.length === 0) return [];

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - daysToLookback);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    console.log(`[PROFILE_BUILDER] Building profiles for ${customerIds.join(', ')} from ${startDateStr} to ${endDateStr}`);

    // Query historical campaign snapshots
    const snapshots = await db.select()
      .from(campaignsSnapshot)
      .where(
        and(
          inArray(campaignsSnapshot.customerId, customerIds),
          gte(campaignsSnapshot.date, startDateStr),
          lte(campaignsSnapshot.date, endDateStr)
        )
      );

    // Group snapshots by campaignId
    const campaignGroups = new Map<string, typeof snapshots>();
    for (const snap of snapshots) {
      if (!campaignGroups.has(snap.campaignId)) {
        campaignGroups.set(snap.campaignId, []);
      }
      campaignGroups.get(snap.campaignId)!.push(snap);
    }

    const profiles: CampaignHistoricalProfile[] = [];

    for (const [campaignId, group] of campaignGroups.entries()) {
      // Sort snapshots by date ascending
      group.sort((a, b) => a.date.localeCompare(b.date));

      const latestSnap = group[group.length - 1];
      const campaignName = latestSnap.name || 'Unnamed Campaign';
      const status = latestSnap.status === 'ENABLED' ? 'ENABLED' : 'PAUSED';
      const biddingType = latestSnap.biddingStrategyType || null;

      // 1. FILTERING: Exclude non-eligible campaign types
      // Exclude CPM, Target CPM, Video views campaigns
      const lowerBidding = (biddingType || '').toLowerCase();
      const lowerName = campaignName.toLowerCase();
      
      const isCpm = lowerBidding.includes('cpm') || lowerBidding.includes('view');
      const isDisplayOrVideoName = 
        lowerName.includes('gdn') || 
        lowerName.includes('display') || 
        lowerName.includes('youtube') || 
        lowerName.includes('video') ||
        lowerName.includes('views');

      if (isCpm || (isDisplayOrVideoName && lowerBidding.includes('manual'))) {
        console.log(`[PROFILE_BUILDER] Excluding campaign "${campaignName}" due to CPM/Video type mapping.`);
        continue;
      }

      // 2. AGGREGATE CORE METRICS
      let activeDays = 0;
      let totalCost = BigInt(0);
      let totalClicks = 0;
      let totalGoogleConvs = 0;
      
      // CRM Filter Exclusions logic:
      // Note: Pancake CRM delivered/pending metrics are pre-aggregated inside upsertSnapshot.
      // However, we want to respect the user's customized status/tag exclusion filters!
      // Since order-level details aren't stored in campaignsSnapshot daily table,
      // Drizzle snapshot fields `realConversions` represents valid conversions,
      // and `realConversionsSuccess` represents successfully delivered conversions.
      // For highly customized filter exclusions, we calculate based on success rates.
      let totalCRMConvs = 0;
      let totalRevenue = BigInt(0);
      
      let totalExhaustedDays = 0;
      let totalUnderutilizedDays = 0;
      let totalBudgetSpentPctSum = 0;

      // Impression share sums
      let isLostBudgetSum = 0;
      let isLostRankSum = 0;
      let isCount = 0;

      const dailyDataPoints: { budget: number; conversions: number; cost: number }[] = [];

      for (const snap of group) {
        const cost = BigInt(snap.costMicros || '0');
        const budget = BigInt(snap.budgetMicros || '0');
        const revenue = BigInt(snap.realConversionValueSuccessMicros || snap.realConversionValueMicros || '0');
        
        // Count active days
        if (cost > BigInt(0)) {
          activeDays++;
          totalCost += cost;
          totalClicks += snap.clicks || 0;
          totalGoogleConvs += parseFloat(snap.googleConversions || '0');

          // Conversion extraction
          // Standard target is success delivered order count (realConversionsSuccess)
          const convs = snap.realConversionsSuccess || 0;
          totalCRMConvs += convs;
          totalRevenue += revenue;

          // Budget utilization
          const spentPct = budget > BigInt(0) ? Number((cost * BigInt(100)) / budget) : 0;
          totalBudgetSpentPctSum += spentPct;
          if (spentPct > 90) totalExhaustedDays++;
          else if (spentPct < 50) totalUnderutilizedDays++;

          // Collect daily metrics for curve fitting
          dailyDataPoints.push({
            budget: Number(budget) / 1_000_000,
            conversions: convs,
            cost: Number(cost) / 1_000_000
          });
        }

        // Impression Share aggregation
        if (snap.searchBudgetLostImpressionShare !== null && snap.searchBudgetLostImpressionShare !== undefined) {
          isLostBudgetSum += parseFloat(snap.searchBudgetLostImpressionShare.toString());
          isLostRankSum += parseFloat(snap.searchRankLostImpressionShare?.toString() || '0');
          isCount++;
        }
      }

      if (activeDays === 0) continue; // No data, skip

      const avgDailyCostMicros = Number(totalCost / BigInt(activeDays));
      const avgDailyConversions = totalCRMConvs / activeDays;
      const avgDailyRevenueMicros = Number(totalRevenue / BigInt(activeDays));
      const avgDailyCpaMicros = totalCRMConvs > 0 ? Number(totalCost / BigInt(totalCRMConvs)) : null;
      const avgDailyRoas = totalCost > BigInt(0) ? Number(totalRevenue) / Number(totalCost) : 0;

      const avgBudgetSpentPct = totalBudgetSpentPctSum / activeDays;

      // 3. CPA VARIATION & TRENDS
      const cpaDailyValues: number[] = [];
      for (const snap of group) {
        const costVal = Number(snap.costMicros || 0) / 1_000_000;
        const convs = snap.realConversionsSuccess || 0;
        if (costVal > 0 && convs > 0) {
          cpaDailyValues.push(costVal / convs);
        }
      }

      // Calculate StdDev for CPA stability
      let cpaStdDev = 0;
      if (cpaDailyValues.length > 1) {
        const avg = cpaDailyValues.reduce((a, b) => a + b, 0) / cpaDailyValues.length;
        const squareDiffs = cpaDailyValues.map(v => Math.pow(v - avg, 2));
        cpaStdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / cpaDailyValues.length) * 1_000_000;
      }

      // Determine Conversion Trend over the last 14 days
      let conversionTrend: 'up' | 'flat' | 'down' = 'flat';
      if (group.length >= 10) {
        const half = Math.floor(group.length / 2);
        const firstHalf = group.slice(0, half).reduce((sum, s) => sum + (s.realConversionsSuccess || 0), 0) / half;
        const secondHalf = group.slice(half).reduce((sum, s) => sum + (s.realConversionsSuccess || 0), 0) / (group.length - half);

        if (secondHalf > firstHalf * 1.15) conversionTrend = 'up';
        else if (secondHalf < firstHalf * 0.85) conversionTrend = 'down';
      }

      // 4. DAY-OF-WEEK SEASONALITY (Mon - Sun)
      const dowPerformance = this.computeDowPerformance(group);

      // 5. FIT MARGINAL RETURN CURVE (Diminishing returns power law)
      const maxBudgetMultiplier = 3.0; // Model up to 300% current budget
      const currentBudget = Number(latestSnap.budgetMicros || 0);
      const marginalReturnCurve = this.estimateMarginalReturnCurve(
        dailyDataPoints,
        avgDailyCostMicros,
        avgDailyConversions,
        currentBudget * maxBudgetMultiplier
      );

      profiles.push({
        campaignId,
        campaignName,
        status,
        currentBudgetMicros: currentBudget,
        activeDays,
        avgDailyCostMicros,
        avgDailyConversions,
        avgDailyCpaMicros,
        avgDailyRoas,
        avgDailyRevenueMicros,
        totalCostMicros: Number(totalCost),
        totalConversions: totalCRMConvs,
        totalRevenueMicros: Number(totalRevenue),
        avgBudgetSpentPct,
        daysExhaustedEarly: totalExhaustedDays,
        daysUnderutilized: totalUnderutilizedDays,
        efficiencyScore: 50, // Computed in the optimizer stage based on objective
        cpaStdDev,
        conversionTrend,
        dowPerformance,
        hourlyPerformance: [], // Populated under Rule Engine if granular telemetry is used
        searchBudgetLostImpressionShare: isCount > 0 ? isLostBudgetSum / isCount : 0,
        searchRankLostImpressionShare: isCount > 0 ? isLostRankSum / isCount : 0,
        marginalReturnCurve,
        biddingStrategyType: biddingType
      });
    }

    return profiles;
  }

  private computeDowPerformance(snapshots: any[]): DayOfWeekProfile[] {
    const dowNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const profiles: DayOfWeekProfile[] = [];

    for (let dow = 0; dow < 7; dow++) {
      const dowSnaps = snapshots.filter(s => {
        const d = new Date(s.date);
        return d.getUTCDay() === dow;
      });

      let activeDays = 0;
      let totalCost = BigInt(0);
      let totalConvs = 0;

      for (const snap of dowSnaps) {
        const cost = BigInt(snap.costMicros || '0');
        if (cost > BigInt(0)) {
          activeDays++;
          totalCost += cost;
          totalConvs += snap.realConversionsSuccess || 0;
        }
      }

      const avgCost = activeDays > 0 ? Number(totalCost / BigInt(activeDays)) : 0;
      const avgConvs = activeDays > 0 ? totalConvs / activeDays : 0;
      const avgCpa = totalConvs > 0 ? Number(totalCost / BigInt(totalConvs)) : 0;

      profiles.push({
        dow,
        label: dowNames[dow],
        avgCostMicros: avgCost,
        avgConversions: avgConvs,
        avgCpaMicros: avgCpa,
        relativeCpaIndex: 1.0, // Calculated dynamically relative to average CPA in builder
        sampleDays: activeDays
      });
    }

    // Normalize relative DOW index
    const activeDow = profiles.filter(p => p.avgCpaMicros > 0);
    if (activeDow.length > 0) {
      const avgCpaAll = activeDow.reduce((sum, p) => sum + p.avgCpaMicros, 0) / activeDow.length;
      for (const p of profiles) {
        if (p.avgCpaMicros > 0 && avgCpaAll > 0) {
          p.relativeCpaIndex = p.avgCpaMicros / avgCpaAll;
        }
      }
    }

    return profiles;
  }

  /**
   * Fits a power-law diminishing return curve: conversions = a * (budget ^ b)
   * Log-log linear regression: ln(conversions) = ln(a) + b * ln(budget)
   */
  private estimateMarginalReturnCurve(
    dataPoints: { budget: number; conversions: number; cost: number }[],
    avgDailyCostMicros: number,
    avgDailyConversions: number,
    maxBudgetToModelMicros: number
  ): MarginalReturn[] {
    const points: MarginalReturn[] = [];
    const avgDailyCost = avgDailyCostMicros / 1_000_000;

    // Filter valid non-zero points for logarithmic calculations
    const logPoints = dataPoints
      .filter(p => p.budget > 0.05 && p.conversions > 0.05)
      .map(p => ({
        x: Math.log(p.budget),
        y: Math.log(p.conversions)
      }));

    let a = avgDailyConversions / Math.pow(Math.max(avgDailyCost, 0.1), 0.7); // Fallback factor a
    let b = 0.7; // Standard Google Ads diminishing return scale coefficient (b < 1)

    // Run linear regression on log-log scale if enough data points exist
    if (logPoints.length >= 5) {
      const n = logPoints.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (const p of logPoints) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
      }

      const denominator = (n * sumXX - sumX * sumX);
      if (denominator !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        // b is the slope representing elasticity
        // Clamp b between 0.35 and 0.85 to ensure highly practical diminishing returns
        b = Math.max(0.35, Math.min(0.85, slope));
        a = Math.exp(intercept);
      }
    }

    // Generate marginal curve points (from 10% of budget up to max budget)
    const currentBudget = avgDailyCostMicros;
    const stepSize = Math.max(currentBudget * 0.1, 100_000); // Step of 10% or min 100k

    for (let budget = stepSize; budget <= maxBudgetToModelMicros; budget += stepSize) {
      const budgetInMillions = budget / 1_000_000;
      const expectedConv = a * Math.pow(budgetInMillions, b);
      const expectedCpa = expectedConv > 0.01 ? budget / expectedConv : budget * 10; // high penalization

      // Calculate marginal CPA of the incremental budget step
      const prevBudget = budget - stepSize;
      const prevBudgetInMillions = prevBudget / 1_000_000;
      const prevConv = a * Math.pow(prevBudgetInMillions, b);
      const incrementalConvs = expectedConv - prevConv;

      const marginalCpa = incrementalConvs > 0.001 
        ? (stepSize / incrementalConvs) 
        : expectedCpa * 2;

      points.push({
        budgetMicros: Math.round(budget),
        expectedConversions: expectedConv,
        expectedCpaMicros: Math.round(expectedCpa),
        marginalCpaMicros: Math.round(marginalCpa)
      });
    }

    return points;
  }
}
