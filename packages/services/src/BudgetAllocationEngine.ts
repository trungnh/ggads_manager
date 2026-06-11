import { CampaignHistoricalProfile, DayOfWeekProfile, MarginalReturn } from './CampaignProfileBuilder';

export interface OptimizationConstraints {
  totalMonthlyBudgetMicros: number;
  remainingBudgetMicros: number;
  minCampaignBudgetMicros: number;
  maxCampaignBudgetMicros?: number;
  maxCpaMicros?: number;
  minRoas?: number;
  lockedCampaignIds: string[];
  maxBudgetIncreasePercentage: number;
  maxBudgetDecreasePercentage: number;
  stagedRolloutDays?: number;
}

export interface OptimizationObjective {
  primary: 'maximize_conversions' | 'maximize_revenue' | 'maximize_profit' | 'hit_target_cpa';
  targetCpaMicros?: number;
  targetRoas?: number;
  targetMonthlyConversions?: number;
  targetMonthlyRevenueMicros?: number;
}

export interface OptimizationInput {
  adsAccountIds: string[];
  userId: string;
  constraints: OptimizationConstraints;
  objective: OptimizationObjective;
  campaigns: CampaignHistoricalProfile[];
  optimizationDate: Date;
  horizonDays: number;
}

export interface AdScheduleRecommendation {
  activeHours: { start: number; end: number }[];
  dowAdjustments: {
    dow: number;
    adjustmentPct: number;
    reason: string;
  }[];
}

export interface AllocationRationale {
  action: 'increase' | 'decrease' | 'maintain' | 'suspend';
  primaryReason: RationaleType;
  supportingReasons: RationaleType[];
  keyMetric: string;
}

export type RationaleType =
  | 'cpa_below_target'
  | 'roas_above_target'
  | 'budget_exhausted_daily'
  | 'high_efficiency_score'
  | 'strong_dow_performance'
  | 'cpa_above_target'
  | 'zero_conversions'
  | 'budget_underutilized'
  | 'low_efficiency_score'
  | 'locked_by_user'
  | 'below_minimum_budget'
  | 'cpa_improving_trend'
  | 'marginal_return_too_low';

export interface CampaignAllocation {
  campaignId: string;
  campaignName: string;
  currentBudgetMicros: number;
  recommendedBudgetMicros: number;
  budgetChangeMicros: number;
  budgetChangePct: number;
  recommendedAdSchedule?: AdScheduleRecommendation;
  projectedConversions: number;
  projectedCpaMicros: number;
  projectedRevenueMicros: number;
  rationale: AllocationRationale;
  isLocked: boolean;
  isSuspended: boolean;
  suspendReason?: string;
}

export interface ProjectedOutcome {
  projectedConversions: number;
  projectedRevenueMicros: number;
  projectedCostMicros: number;
  projectedCpaMicros: number;
  projectedRoas: number;
  vsStatusQuo: {
    conversionDelta: number;
    conversionDeltaPct: number;
    cpaDelta: number;
    revenueDeltaMicros: number;
  };
  monthlyForecast: {
    conversions: number;
    revenueMicros: number;
    costMicros: number;
    cpaMicros: number;
  };
  confidenceInterval: {
    conversionsLow: number;
    conversionsHigh: number;
  };
}

export interface OptimizationScenario {
  id: 'conservative' | 'recommended' | 'aggressive';
  name: string;
  description: string;
  allocations: CampaignAllocation[];
  projectedConversions: number;
  projectedCpaMicros: number;
  totalBudgetMicros: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OptimizerInsight {
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  campaignId?: string;
}

export interface OptimizationOutput {
  allocations: CampaignAllocation[];
  projectedOutcome: ProjectedOutcome;
  scenarios: OptimizationScenario[];
  optimizerInsights: OptimizerInsight[];
  algorithmVersion: string;
  computedAt: Date;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason: string;
}

export function computeEfficiencyScore(
  profile: CampaignHistoricalProfile,
  targetCpaMicros: number,
  targetRoas: number
): number {
  let score = 50; // Base score

  // 1. CPA vs Target (±30 points)
  if (profile.avgDailyCpaMicros && targetCpaMicros > 0) {
    const cpaRatio = profile.avgDailyCpaMicros / targetCpaMicros;
    if (cpaRatio <= 0.7) score += 30; // CPA is 30%+ cheaper than target
    else if (cpaRatio <= 0.9) score += 20;
    else if (cpaRatio <= 1.0) score += 10;
    else if (cpaRatio <= 1.2) score -= 10;
    else if (cpaRatio <= 1.5) score -= 20;
    else score -= 30;
  }

  // 2. ROAS vs Target (±20 points)
  if (profile.avgDailyRoas > 0 && targetRoas > 0) {
    const roasRatio = profile.avgDailyRoas / targetRoas;
    if (roasRatio >= 1.3) score += 20;
    else if (roasRatio >= 1.0) score += 10;
    else if (roasRatio >= 0.8) score -= 5;
    else score -= 20;
  }

  // 3. Budget utilization (±15 points)
  if (profile.activeDays > 0) {
    const exhaustedRatio = profile.daysExhaustedEarly / profile.activeDays;
    if (exhaustedRatio > 0.5) score += 15; // budget capped early = good scale candidates
    else if (profile.avgBudgetSpentPct > 85) score += 8;
    else if (profile.avgBudgetSpentPct < 50) score -= 10;
  }

  // 4. CPA stability (±10 points)
  const cpaCV = profile.cpaStdDev / (profile.avgDailyCpaMicros || 1_000_000);
  if (cpaCV < 0.2) score += 10; // highly stable
  else if (cpaCV < 0.4) score += 5;
  else if (cpaCV > 0.8) score -= 10; // high volatility = risky

  // 5. Conversion trend (±5 points)
  if (profile.conversionTrend === 'up') score += 5;
  else if (profile.conversionTrend === 'down') score -= 5;

  // 6. Zero conversion penalty
  if (profile.totalConversions === 0) score = Math.min(score, 20);

  return Math.max(0, Math.min(100, score));
}

export class BudgetAllocationEngine {
  allocate(input: OptimizationInput): OptimizationOutput {
    const { campaigns, constraints, objective, horizonDays } = input;

    // Remaining daily budget pool
    const remainingDays = Math.max(horizonDays, 1);
    const dailyBudgetPool = constraints.remainingBudgetMicros / remainingDays;

    console.log(`[OPTIMIZER] Budget pool daily: ${dailyBudgetPool / 1_000_000} VND for ${remainingDays} remaining days.`);

    // Classify campaigns
    const locked: CampaignHistoricalProfile[] = [];
    const eligible: CampaignHistoricalProfile[] = [];
    const suspended: CampaignHistoricalProfile[] = [];

    const minBudget = constraints.minCampaignBudgetMicros;

    for (const c of campaigns) {
      if (constraints.lockedCampaignIds.includes(c.campaignId)) {
        locked.push(c);
      } else if (c.status === 'PAUSED' || c.totalConversions === 0) {
        // Zero orders or paused -> Minimize/Suspend allocation
        suspended.push(c);
      } else {
        eligible.push(c);
      }
    }

    // Run scoring
    const scoredEligible = eligible.map(c => ({
      ...c,
      efficiencyScore: computeEfficiencyScore(c, objective.targetCpaMicros || 0, objective.targetRoas || 0)
    })).sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    // Subtract locked budget from pool
    const lockedBudgetSum = locked.reduce((sum, c) => sum + c.currentBudgetMicros, 0);
    let availablePool = dailyBudgetPool - lockedBudgetSum;

    // Direct allocation Map (campaignId -> budgetMicros)
    const budgetMap = new Map<string, number>();

    // Fund locked budgets
    for (const c of locked) {
      budgetMap.set(c.campaignId, c.currentBudgetMicros);
    }

    // Fund suspended budgets with minBudget fallback or current budget capped
    for (const c of suspended) {
      const current = c.currentBudgetMicros;
      const budget = Math.min(current, minBudget);
      budgetMap.set(c.campaignId, budget);
      availablePool -= budget;
    }

    // Run core Marginal-CPA Bidding algorithm for eligible campaigns
    const eligibleAllocations = this.marginalCpaBidding(
      scoredEligible,
      Math.max(availablePool, 0),
      objective,
      constraints
    );

    // Merge allocations
    const finalAllocations: CampaignAllocation[] = [];

    for (const alloc of eligibleAllocations) {
      finalAllocations.push(alloc);
    }

    for (const c of locked) {
      finalAllocations.push(this.buildStaticAllocation(c, true, false, 'Khóa ngân sách theo thiết lập người dùng.'));
    }

    for (const c of suspended) {
      const isSuspended = c.totalConversions === 0;
      const reason = isSuspended 
        ? 'Dừng/Giảm thiểu do chiến dịch không ghi nhận đơn hàng thực tế trên Pancake CRM.' 
        : 'Chiến dịch đang tạm ngưng hoạt động trên Google Ads.';
      finalAllocations.push(this.buildStaticAllocation(c, false, isSuspended, reason));
    }

    // Calculate overall projections
    const projectedOutcome = this.projectOutcomes(finalAllocations, remainingDays, campaigns);

    // Generate comparison scenarios
    const scenarios = this.generateScenarios(input, finalAllocations);

    // Extract optimizer insights
    const optimizerInsights = this.extractInsights(finalAllocations, constraints, objective);

    // Compute data confidence
    const confidenceResult = this.computeConfidence(campaigns);

    return {
      allocations: finalAllocations,
      projectedOutcome,
      scenarios,
      optimizerInsights,
      algorithmVersion: '2.0.0',
      computedAt: new Date(),
      confidence: confidenceResult.level,
      confidenceReason: confidenceResult.reason
    };
  }

  private marginalCpaBidding(
    campaigns: (CampaignHistoricalProfile & { efficiencyScore: number })[],
    availablePoolMicros: number,
    objective: OptimizationObjective,
    constraints: OptimizationConstraints
  ): CampaignAllocation[] {
    const allocations: CampaignAllocation[] = [];
    if (campaigns.length === 0) return [];

    // Conversion rate units for easy calculation (1M micros = 1 VND standard unit)
    const minBudget = constraints.minCampaignBudgetMicros;
    const initialBudgets = new Map<string, number>();

    // 1. Give each eligible campaign its min base budget
    let remainingPool = availablePoolMicros;
    for (const c of campaigns) {
      initialBudgets.set(c.campaignId, minBudget);
      remainingPool -= minBudget;
    }

    // If remainingPool is exhausted, fund top campaigns only
    if (remainingPool < 0) {
      console.log(`[OPTIMIZER] Insufficient budget pool. Funding top campaigns only.`);
      const budgets = new Map<string, number>();
      let pool = availablePoolMicros;
      for (const c of campaigns) {
        const allocated = Math.min(pool, minBudget);
        budgets.set(c.campaignId, allocated);
        pool -= allocated;
      }
      return campaigns.map(c => this.buildAllocationFromBudget(c, budgets.get(c.campaignId) || 0, objective));
    }

    // 2. Greedy allocation steps (50,000 VND / 50M micros per step)
    const STEP_SIZE = 50_000_000; 
    const budgets = new Map<string, number>(initialBudgets);

    while (remainingPool >= STEP_SIZE) {
      let bestCampaignId: string | null = null;
      let lowestWeightedMarginalCpa = Infinity;

      for (const c of campaigns) {
        const current = budgets.get(c.campaignId)!;
        const nextBudget = current + STEP_SIZE;

        // Constraint check: max budget limit
        if (constraints.maxCampaignBudgetMicros && nextBudget > constraints.maxCampaignBudgetMicros) continue;

        // Constraint check: max increase safety cap
        const maxAllowed = c.currentBudgetMicros * (1 + constraints.maxBudgetIncreasePercentage / 100);
        if (nextBudget > maxAllowed) continue;

        // Evaluate marginal CPA at next budget step
        const marginalCpa = this.getMarginalCpaAt(c.marginalReturnCurve, nextBudget);

        // Apply objective weightings
        const weightedCpa = this.applyObjectiveWeight(marginalCpa, c, objective);

        // Target CPA ceiling check
        if (constraints.maxCpaMicros && weightedCpa > constraints.maxCpaMicros) continue;

        if (weightedCpa < lowestWeightedMarginalCpa) {
          lowestWeightedMarginalCpa = weightedCpa;
          bestCampaignId = c.campaignId;
        }
      }

      if (!bestCampaignId) break; // Capped or saturated

      budgets.set(bestCampaignId, budgets.get(bestCampaignId)! + STEP_SIZE);
      remainingPool -= STEP_SIZE;
    }

    // Add remainder pool to the absolute highest efficiency scored campaign
    if (remainingPool > 0 && campaigns.length > 0) {
      const topId = campaigns[0].campaignId;
      budgets.set(topId, budgets.get(topId)! + remainingPool);
    }

    // Build finalized allocations list
    return campaigns.map(c => this.buildAllocationFromBudget(c, budgets.get(c.campaignId) || minBudget, objective));
  }

  private getMarginalCpaAt(curve: MarginalReturn[], budgetMicros: number): number {
    if (curve.length === 0) return 999_000_000; // Penalization

    // Locate closest index in curve
    const closest = curve.reduce((prev, curr) => 
      Math.abs(curr.budgetMicros - budgetMicros) < Math.abs(prev.budgetMicros - budgetMicros) ? curr : prev
    );

    return closest.marginalCpaMicros;
  }

  private applyObjectiveWeight(
    marginalCpa: number,
    campaign: CampaignHistoricalProfile,
    objective: OptimizationObjective
  ): number {
    let weight = marginalCpa;

    // Exclude campaigns with 0 scale room (SIS lost due to budget < 5%)
    if (campaign.searchBudgetLostImpressionShare < 0.05) {
      return Infinity; // Fully saturated, bypass
    } else if (campaign.searchBudgetLostImpressionShare < 0.15) {
      weight = weight * 1.6; // soft scale penalization
    }

    switch (objective.primary) {
      case 'maximize_conversions':
        return weight;

      case 'maximize_revenue':
        const avgOrder = campaign.avgDailyRevenueMicros / (campaign.avgDailyConversions || 1);
        const orderValueScale = avgOrder / 1_000_000; // relative scale factor
        return weight / (orderValueScale > 0 ? orderValueScale : 1);

      case 'maximize_profit':
        const marginRate = 0.35; // typical ecommerce margin fallback
        return weight / marginRate;

      case 'hit_target_cpa':
        if (weight > (objective.targetCpaMicros || Infinity)) return Infinity;
        return weight;
    }
  }

  private buildStaticAllocation(
    campaign: CampaignHistoricalProfile,
    isLocked: boolean,
    isSuspended: boolean,
    reason: string
  ): CampaignAllocation {
    const current = campaign.currentBudgetMicros;
    const recommended = isSuspended ? Math.min(current, 100_000_000) : current; // cap suspended at 100k

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      currentBudgetMicros: current,
      recommendedBudgetMicros: recommended,
      budgetChangeMicros: recommended - current,
      budgetChangePct: current > 0 ? Math.round(((recommended - current) / current) * 100) : 0,
      projectedConversions: isSuspended ? 0 : campaign.avgDailyConversions,
      projectedCpaMicros: isSuspended ? 0 : (campaign.avgDailyCpaMicros || 0),
      projectedRevenueMicros: isSuspended ? 0 : campaign.avgDailyRevenueMicros,
      isLocked,
      isSuspended,
      suspendReason: reason,
      rationale: {
        action: isLocked ? 'maintain' : 'suspend',
        primaryReason: isLocked ? 'locked_by_user' : 'zero_conversions',
        supportingReasons: [],
        keyMetric: isLocked ? 'Locked' : '0 Đơn CRM'
      },
      recommendedAdSchedule: this.buildAdScheduleRecommendation(campaign)
    };
  }

  private buildAllocationFromBudget(
    campaign: CampaignHistoricalProfile & { efficiencyScore: number },
    recommendedBudget: number,
    objective: OptimizationObjective
  ): CampaignAllocation {
    const current = campaign.currentBudgetMicros;
    const change = recommendedBudget - current;
    const changePct = current > 0 ? Math.round((change / current) * 100) : 0;

    // Lookup projected metrics from the marginal return curve
    let projectedConvs = campaign.avgDailyConversions;
    let projectedCpa = campaign.avgDailyCpaMicros || 0;
    let projectedRev = campaign.avgDailyRevenueMicros;

    if (campaign.marginalReturnCurve.length > 0) {
      const closest = campaign.marginalReturnCurve.reduce((prev, curr) => 
        Math.abs(curr.budgetMicros - recommendedBudget) < Math.abs(prev.budgetMicros - recommendedBudget) ? curr : prev
      );
      projectedConvs = closest.expectedConversions;
      projectedCpa = closest.expectedCpaMicros;
      projectedRev = campaign.avgDailyConversions > 0 
        ? (projectedConvs / campaign.avgDailyConversions) * campaign.avgDailyRevenueMicros 
        : 0;
    }

    const action = changePct > 15 ? 'increase' : changePct < -15 ? 'decrease' : 'maintain';
    const primaryReason: RationaleType = changePct > 15 
      ? (campaign.avgDailyCpaMicros && objective.targetCpaMicros && campaign.avgDailyCpaMicros < objective.targetCpaMicros ? 'cpa_below_target' : 'high_efficiency_score')
      : changePct < -15 ? 'low_efficiency_score' : 'below_minimum_budget';

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      currentBudgetMicros: current,
      recommendedBudgetMicros: recommendedBudget,
      budgetChangeMicros: change,
      budgetChangePct: changePct,
      projectedConversions: projectedConvs,
      projectedCpaMicros: projectedCpa,
      projectedRevenueMicros: projectedRev,
      isLocked: false,
      isSuspended: false,
      rationale: {
        action,
        primaryReason,
        supportingReasons: campaign.daysExhaustedEarly > 5 ? ['budget_exhausted_daily'] : [],
        keyMetric: `CPA: ${Math.round(projectedCpa / 1000)}k / Điểm: ${campaign.efficiencyScore}`
      },
      recommendedAdSchedule: this.buildAdScheduleRecommendation(campaign)
    };
  }

  private buildAdScheduleRecommendation(campaign: CampaignHistoricalProfile): AdScheduleRecommendation {
    const dowAdjustments = campaign.dowPerformance
      .filter(d => d.sampleDays >= 3 && (d.relativeCpaIndex < 0.8 || d.relativeCpaIndex > 1.3))
      .map(d => ({
        dow: d.dow,
        adjustmentPct: d.relativeCpaIndex < 0.8
          ? Math.min(Math.round((1 - d.relativeCpaIndex) * 100), 30) // max +30% bid
          : -Math.min(Math.round((d.relativeCpaIndex - 1) * 60), 30), // max -30% bid
        reason: d.relativeCpaIndex < 0.8
          ? `CPA ${d.label} tốt hơn TB ${Math.round((1 - d.relativeCpaIndex) * 100)}%`
          : `CPA ${d.label} kém hơn TB ${Math.round((d.relativeCpaIndex - 1) * 100)}%`
      }));

    // Recommend standard golden hours (08:00 - 12:00, 18:00 - 22:00) by default
    const activeHours = [
      { start: 8, end: 12 },
      { start: 18, end: 22 }
    ];

    return { activeHours, dowAdjustments };
  }

  private projectOutcomes(
    allocations: CampaignAllocation[],
    horizonDays: number,
    historicalProfiles: CampaignHistoricalProfile[]
  ): ProjectedOutcome {
    let totalCost = 0;
    let totalConvs = 0;
    let totalRev = 0;

    for (const a of allocations) {
      const profile = historicalProfiles.find(p => p.campaignId === a.campaignId);
      const isPaused = profile ? profile.status === 'PAUSED' : false;
      const spentPct = profile ? profile.avgBudgetSpentPct : 100;
      const spentRate = isPaused ? 0 : (spentPct / 100);

      // Scale cost and outcomes by historical spent rate and running status
      const dailyCost = a.recommendedBudgetMicros * spentRate;
      const dailyConvs = isPaused ? 0 : a.projectedConversions;
      const dailyRev = isPaused ? 0 : a.projectedRevenueMicros;

      totalCost += dailyCost * horizonDays;
      totalConvs += dailyConvs * horizonDays;
      totalRev += dailyRev * horizonDays;
    }

    const cpa = totalConvs > 0 ? totalCost / totalConvs : 0;
    const roas = totalCost > 0 ? totalRev / totalCost : 0;

    // Status quo projections (if keeping current budget unchanged)
    let statusQuoCost = 0;
    let statusQuoConvs = 0;
    let statusQuoRev = 0;

    for (const c of historicalProfiles) {
      const isPaused = c.status === 'PAUSED';
      const spentPct = c.avgBudgetSpentPct;
      const spentRate = isPaused ? 0 : (spentPct / 100);

      statusQuoCost += c.currentBudgetMicros * spentRate * horizonDays;
      statusQuoConvs += (isPaused ? 0 : c.avgDailyConversions) * horizonDays;
      statusQuoRev += (isPaused ? 0 : c.avgDailyRevenueMicros) * horizonDays;
    }

    const statusQuoCpa = statusQuoConvs > 0 ? statusQuoCost / statusQuoConvs : 0;

    const conversionDelta = totalConvs - statusQuoConvs;
    const conversionDeltaPct = statusQuoConvs > 0 ? Math.round((conversionDelta / statusQuoConvs) * 100) : 0;

    return {
      projectedConversions: Math.round(totalConvs),
      projectedRevenueMicros: totalRev,
      projectedCostMicros: totalCost,
      projectedCpaMicros: Math.round(cpa),
      projectedRoas: roas,
      vsStatusQuo: {
        conversionDelta: Math.round(conversionDelta),
        conversionDeltaPct,
        cpaDelta: statusQuoCpa > 0 ? Math.round(((cpa - statusQuoCpa) / statusQuoCpa) * 100) : 0,
        revenueDeltaMicros: totalRev - statusQuoRev
      },
      monthlyForecast: {
        conversions: Math.round(totalConvs * 1.5), // Estimate full month expansion
        revenueMicros: totalRev * 1.5,
        costMicros: totalCost * 1.5,
        cpaMicros: Math.round(cpa)
      },
      confidenceInterval: {
        conversionsLow: Math.round(totalConvs * 0.85),
        conversionsHigh: Math.round(totalConvs * 1.15)
      }
    };
  }

  private generateScenarios(
    input: OptimizationInput,
    recommendedAllocations: CampaignAllocation[]
  ): OptimizationScenario[] {
    const horizonDays = input.horizonDays;
    const historicalProfiles = input.campaigns;

    // Helper to calculate total budget (spent-rate adjusted) and conversions for allocations
    const calculateTotals = (allocs: CampaignAllocation[]) => {
      let totalCost = 0;
      let totalConvs = 0;

      for (const a of allocs) {
        const profile = historicalProfiles.find(p => p.campaignId === a.campaignId);
        const isPaused = profile ? profile.status === 'PAUSED' : false;
        const spentPct = profile ? profile.avgBudgetSpentPct : 100;
        const spentRate = isPaused ? 0 : (spentPct / 100);

        totalCost += a.recommendedBudgetMicros * spentRate * horizonDays;
        totalConvs += (isPaused ? 0 : a.projectedConversions) * horizonDays;
      }

      return { totalCost, totalConvs };
    };

    // 1. Recommended (Calculated base)
    const { totalCost: recommendedCost, totalConvs: recommendedConvs } = calculateTotals(recommendedAllocations);

    const scenarios: OptimizationScenario[] = [
      {
        id: 'recommended',
        name: 'Đề xuất tối ưu',
        description: 'Tối đa hóa hiệu năng ngân sách, cân đối độ tin cậy dữ liệu và dư địa thị trường.',
        allocations: recommendedAllocations,
        projectedConversions: Math.round(recommendedConvs),
        projectedCpaMicros: recommendedConvs > 0 ? Math.round(recommendedCost / recommendedConvs) : 0,
        totalBudgetMicros: recommendedCost,
        riskLevel: 'medium'
      }
    ];

    // 2. Conservative scenario: tighter budget caps (max growth limited to 30%)
    const conservativeAllocations = recommendedAllocations.map(a => {
      if (a.isLocked || a.isSuspended) return { ...a };
      const current = a.currentBudgetMicros;
      const maxAllowed = current * 1.3;
      const minAllowed = current * 0.75;
      const recommended = Math.max(minAllowed, Math.min(maxAllowed, a.recommendedBudgetMicros));
      
      // Look up conversions from curve instead of linear scaling to avoid tiny-budget division explosions
      let projectedConversions = a.projectedConversions;
      const profile = historicalProfiles.find(p => p.campaignId === a.campaignId);
      if (profile && profile.marginalReturnCurve.length > 0) {
        const closest = profile.marginalReturnCurve.reduce((prev, curr) => 
          Math.abs(curr.budgetMicros - recommended) < Math.abs(prev.budgetMicros - recommended) ? curr : prev
        );
        projectedConversions = closest.expectedConversions;
      }

      return {
        ...a,
        recommendedBudgetMicros: recommended,
        budgetChangeMicros: recommended - current,
        budgetChangePct: current > 0 ? Math.round(((recommended - current) / current) * 100) : 0,
        projectedConversions
      };
    });

    const { totalCost: conservativeCost, totalConvs: conservativeConvs } = calculateTotals(conservativeAllocations);

    scenarios.push({
      id: 'conservative',
      name: 'Thận trọng',
      description: 'Lộ trình tăng trưởng chậm, giảm thiểu tối đa rủi ro, dao động giá thầu thấp.',
      allocations: conservativeAllocations,
      projectedConversions: Math.round(conservativeConvs),
      projectedCpaMicros: conservativeConvs > 0 ? Math.round(conservativeCost / conservativeConvs) : 0,
      totalBudgetMicros: conservativeCost,
      riskLevel: 'low'
    });

    // 3. Aggressive scenario: focus on maximum growth (relaxed scale caps, budget x3 max allowed)
    const aggressiveAllocations = recommendedAllocations.map(a => {
      if (a.isLocked || a.isSuspended) return { ...a };
      const current = a.currentBudgetMicros;
      const maxAllowed = current * 3.0; // scale up to 300%
      const recommended = Math.min(maxAllowed, a.recommendedBudgetMicros * 1.3);
      
      // Look up conversions from curve instead of linear scaling to avoid tiny-budget division explosions
      let projectedConversions = a.projectedConversions;
      const profile = historicalProfiles.find(p => p.campaignId === a.campaignId);
      if (profile && profile.marginalReturnCurve.length > 0) {
        const closest = profile.marginalReturnCurve.reduce((prev, curr) => 
          Math.abs(curr.budgetMicros - recommended) < Math.abs(prev.budgetMicros - recommended) ? curr : prev
        );
        projectedConversions = closest.expectedConversions;
      }

      return {
        ...a,
        recommendedBudgetMicros: recommended,
        budgetChangeMicros: recommended - current,
        budgetChangePct: current > 0 ? Math.round(((recommended - current) / current) * 100) : 0,
        projectedConversions
      };
    });

    const { totalCost: aggressiveCost, totalConvs: aggressiveConvs } = calculateTotals(aggressiveAllocations);

    scenarios.push({
      id: 'aggressive',
      name: 'Tăng trưởng mạnh',
      description: 'Ưu tiên tối đa số lượng đơn hàng, chấp nhận CPA thầu biến động tăng lên đến 30%.',
      allocations: aggressiveAllocations,
      projectedConversions: Math.round(aggressiveConvs),
      projectedCpaMicros: aggressiveConvs > 0 ? Math.round(aggressiveCost / aggressiveConvs) : 0,
      totalBudgetMicros: aggressiveCost,
      riskLevel: 'high'
    });

    return scenarios;
  }

  private extractInsights(
    allocations: CampaignAllocation[],
    constraints: OptimizationConstraints,
    objective: OptimizationObjective
  ): OptimizerInsight[] {
    const insights: OptimizerInsight[] = [];

    // Scale opportunities
    const bigScales = allocations.filter(a => a.budgetChangePct >= 50 && !a.isLocked);
    for (const c of bigScales) {
      insights.push({
        type: 'opportunity',
        title: `Scale chiến dịch hiệu quả cao`,
        description: `Chiến dịch "${c.campaignName}" có CPA thực tế rất tốt trên CRM, thuật toán đề xuất scale mạnh lên +${c.budgetChangePct}% ngân sách.`,
        campaignId: c.campaignId
      });
    }

    // Suspended warning
    const suspensions = allocations.filter(a => a.isSuspended);
    for (const c of suspensions) {
      insights.push({
        type: 'warning',
        title: `Kiến nghị cắt giảm tối đa ngân sách`,
        description: `Chiến dịch "${c.campaignName}" ghi nhận 0 đơn hàng thực giao thành công trên Pancake CRM trong 30 ngày qua. Khuyên dùng hạ ngân sách về mức tối thiểu hoặc tạm dừng để hạn chế lãng phí dòng tiền.`,
        campaignId: c.campaignId
      });
    }

    return insights;
  }

  private computeConfidence(
    campaigns: CampaignHistoricalProfile[]
  ): { level: 'high' | 'medium' | 'low'; reason: string } {
    const eligibleWithData = campaigns.filter(c => c.activeDays >= 14 && c.totalConversions >= 8);
    const eligible = campaigns.filter(c => c.totalCostMicros > 0);
    const coverage = eligible.length > 0 ? eligibleWithData.length / eligible.length : 0;

    if (coverage >= 0.8) {
      return { level: 'high', reason: 'Dữ liệu lịch sử CRM & Ads đầy đủ 3+ tuần cho toàn bộ chiến dịch.' };
    }
    if (coverage >= 0.4) {
      return { level: 'medium', reason: 'Một số chiến dịch quảng cáo mới chưa có đủ dữ liệu đối soát thực tế.' };
    }
    return { level: 'low', reason: 'Hầu hết các chiến dịch quảng cáo chưa đủ thời gian tích lũy dữ liệu. Hãy cẩn trọng khi áp dụng.' };
  }
}
