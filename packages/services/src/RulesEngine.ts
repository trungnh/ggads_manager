import { db, ruleLogs, campaignsSnapshot, optimizationRules, ruleConditions, ruleActions, adsAccounts, campaignSettings } from '@repo/db';
import { MutationsService } from '@repo/google-ads';
import { eq, and, sql } from 'drizzle-orm';
import { TelegramService } from './TelegramService';

export interface RuleWithDetails {
  id: string;
  name: string;
  isEnabled: boolean;
  targetType: string;
  targetValue: any;
  schedule: any;
  conditions: any[];
  actions: any[];
  executionsTodayDate?: string | null;
  executionsTodayCount?: number;
  lastExecutedAt?: string | null;
  guardrailLearningProtection?: boolean;
  guardrail3xKill?: boolean;
  guardrailBudgetSuffocation?: boolean;
}

export class RulesEngine {
  /**
   * Main entry point to run all rules for an account
   */
  static async runAccountOptimization(userId: string, adsAccountId: string, customerId: string, dryRun: boolean = false) {
    if (dryRun) console.log(`[RULE_ENGINE] DRY RUN ENABLED - No actions will be performed.`);
    
    // 1. Fetch all enabled rules with their conditions and actions
    const rules = await this.fetchRulesWithDetails(adsAccountId);
    if (rules.length === 0) {
      console.log(`[RULE_ENGINE] No enabled rules found for account ${customerId}`);
      return;
    }

    // 2. Fetch today's campaign snapshots
    const today = new Date().toISOString().split('T')[0];
    const snapshots = await db.select()
      .from(campaignsSnapshot)
      .where(and(
        eq(campaignsSnapshot.customerId, customerId),
        eq(campaignsSnapshot.date, today)
      ));

    if (snapshots.length === 0) {
      console.log(`[RULE_ENGINE] No snapshots found for today (${today}) for account ${customerId}`);
      return;
    }

    console.log(`[RULE_ENGINE] Processing ${rules.length} rules against ${snapshots.length} campaigns...`);

    const [account] = await db.select({ 
      oauthConnectionId: adsAccounts.oauthConnectionId,
      loginCustomerId: adsAccounts.loginCustomerId
    }).from(adsAccounts).where(eq(adsAccounts.id, adsAccountId)).limit(1);
    
    const oauthConnectionId = account?.oauthConnectionId;
    if (!oauthConnectionId) {
      console.error(`[RULE_ENGINE] No OAuth connection linked to account ${customerId}`);
      return;
    }

    const mutationsService = new MutationsService(
      oauthConnectionId, 
      customerId, 
      account?.loginCustomerId || undefined
    );
    const processedCampaignIds = new Set<string>();

    // Fetch excluded campaigns (AUTO turned off) from settings
    const excludedCampaigns = await db.select({
      campaignId: campaignSettings.campaignId
    })
    .from(campaignSettings)
    .where(and(
      eq(campaignSettings.customerId, customerId),
      eq(campaignSettings.isExcluded, true)
    ));
    const excludedCampaignIds = new Set(excludedCampaigns.map(c => c.campaignId));

    // 3. Process each rule (ordered by priority/created)
    for (const rule of rules) {
      if (!this.isRuleInSchedule(rule)) continue;

      // 4. Identify target campaigns
      const targetSnapshots = snapshots.filter(s => {
        if (processedCampaignIds.has(s.campaignId)) return false;
        if (excludedCampaignIds.has(s.campaignId)) {
          console.log(`[RULE_ENGINE] Campaign ${s.name} (${s.campaignId}) skipped because it is excluded from auto-optimization (Bỏ AUTO).`);
          return false;
        }
        return this.isCampaignTargeted(s, rule);
      });

      for (const snapshot of targetSnapshots) {
        // Guardrail: Learning Phase Protection
        if (rule.guardrailLearningProtection && snapshot.primaryStatus === 'LEARNING') {
          console.log(`[RULE_ENGINE] Guardrail: Skip rule "${rule.name}" for campaign ${snapshot.name} due to active LEARNING phase.`);
          continue;
        }

        // Guardrail: 3x Kill Rule
        let is3xKillTriggered = false;
        let killReason = "";
        if (rule.guardrail3xKill) {
          const targetCpa = Number(snapshot.targetCpaMicros || 0) / 1000000;
          const cost = Number(snapshot.costMicros || 0) / 1000000;
          const realConv = snapshot.realConversions || 0;
          if (targetCpa > 0 && cost > 3 * targetCpa) {
            const actualCpa = realConv > 0 ? cost / realConv : cost;
            if (actualCpa > 3 * targetCpa) {
              is3xKillTriggered = true;
              killReason = `Cầu chì an toàn 3x Kill: CPA thực tế (${actualCpa.toLocaleString()} đ) vượt quá 3x CPA mục tiêu (${targetCpa.toLocaleString()} đ) khi tiêu phí đạt ${cost.toLocaleString()} đ (Số đơn: ${realConv})`;
            }
          }
        }

        if (is3xKillTriggered) {
          if (dryRun) {
            console.log(`[RULE_ENGINE][DRY_RUN][3X_KILL] Would force pause campaign ${snapshot.name} due to: ${killReason}`);
          } else {
            await this.execute3xKill(rule, snapshot, mutationsService, userId, adsAccountId, customerId, killReason);
          }
          processedCampaignIds.add(snapshot.campaignId);
          continue;
        }

        // 5. Evaluate AND/OR conditions
        const { matched, reason } = this.evaluateRuleConditions(snapshot, rule.conditions);
        if (matched) {
          console.log(`[RULE_ENGINE] Rule "${rule.name}" matched for campaign ${snapshot.name}: ${reason}`);
          
          if (dryRun) {
            console.log(`[RULE_ENGINE][DRY_RUN] Would execute actions for ${snapshot.name}`);
          } else {
            // 6. Execute actions
            await this.executeActions(rule, snapshot, mutationsService, userId, adsAccountId, customerId, reason);
          }
          
          // 7. Mark as processed to avoid conflicting rules in same run
          processedCampaignIds.add(snapshot.campaignId);
        }
      }

      if (!dryRun) {
        // Update last executed status
        await db.update(optimizationRules)
          .set({ 
            lastExecutedAt: new Date(),
            executionsTodayCount: sql`${optimizationRules.executionsTodayCount} + 1`,
            executionsTodayDate: today
          })
          .where(eq(optimizationRules.id, rule.id));
      }
    }
  }

  private static async fetchRulesWithDetails(adsAccountId: string): Promise<RuleWithDetails[]> {
    const rules = await db.query.optimizationRules.findMany({
      where: eq(optimizationRules.adsAccountId, adsAccountId),
      orderBy: (rules, { desc }) => [desc(rules.priority)],
    });

    const detailedRules: RuleWithDetails[] = [];
    for (const rule of rules) {
      if (!rule.isEnabled) continue;

      const conditions = await db.query.ruleConditions.findMany({
        where: eq(ruleConditions.ruleId, rule.id),
      });

      const actions = await db.query.ruleActions.findMany({
        where: eq(ruleActions.ruleId, rule.id),
      });

      // Trim values to avoid spacing issues causing match failure
      const trimmedConditions = conditions.map(c => ({
        ...c,
        metric: c.metric ? c.metric.trim() : "",
        operator: c.operator ? c.operator.trim() : "",
      }));

      const trimmedActions = actions.map(a => ({
        ...a,
        actionType: a.actionType ? a.actionType.trim() : "",
      }));

      detailedRules.push({
        ...rule,
        conditions: trimmedConditions,
        actions: trimmedActions,
      } as RuleWithDetails);
    }

    return detailedRules;
  }

  private static isRuleInSchedule(rule: RuleWithDetails): boolean {
    const schedule = rule.schedule || {};
    const now = new Date();
    
    // Check days (1-7, Mon-Sun)
    if (schedule.days && Array.isArray(schedule.days) && schedule.days.length > 0) {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      if (!schedule.days.includes(day)) {
        console.log(`[RULE_ENGINE] Rule ${rule.name} skipped: Wrong day (Today: ${day}, Allowed: ${schedule.days})`);
        return false;
      }
    }

    // Check hours (HH:mm)
    if (schedule.hoursStart || schedule.hoursEnd) {
      const currentHourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (schedule.hoursStart && currentHourMin < schedule.hoursStart) {
        console.log(`[RULE_ENGINE] Rule ${rule.name} skipped: Before start time (${currentHourMin} < ${schedule.hoursStart})`);
        return false;
      }
      if (schedule.hoursEnd && currentHourMin > schedule.hoursEnd) {
        console.log(`[RULE_ENGINE] Rule ${rule.name} skipped: After end time (${currentHourMin} > ${schedule.hoursEnd})`);
        return false;
      }
    }

    // Check max executions per day
    if (schedule.maxExecutionsPerDay) {
      const today = now.toISOString().split('T')[0];
      if (rule.executionsTodayDate === today && typeof rule.executionsTodayCount === 'number' && rule.executionsTodayCount >= schedule.maxExecutionsPerDay) {
        console.log(`[RULE_ENGINE] Rule ${rule.name} skipped: Max executions reached (${rule.executionsTodayCount})`);
        return false;
      }
    }

    // Check cooldown
    if (rule.lastExecutedAt && schedule.cooldownMinutes) {
      const diffMs = now.getTime() - new Date(rule.lastExecutedAt).getTime();
      if (diffMs < schedule.cooldownMinutes * 60 * 1000) {
        console.log(`[RULE_ENGINE] Rule ${rule.name} skipped: Cooldown active (${Math.round(diffMs/60000)}m < ${schedule.cooldownMinutes}m)`);
        return false;
      }
    }

    return true;
  }

  private static isCampaignTargeted(snapshot: any, rule: RuleWithDetails): boolean {
    if (snapshot.status === 'REMOVED') return false;

    const isEnableRule = rule.actions.some(a => a.actionType === 'enable_campaign');
    const isPauseOrBudgetRule = rule.actions.some(a => ['pause_campaign', 'adjust_budget'].includes(a.actionType));
    
    // By default, rules only apply to ENABLED campaigns.
    // If a rule is explicitly enabling a campaign, it should target PAUSED campaigns.
    const requiredStatus = (isEnableRule && !isPauseOrBudgetRule) ? 'PAUSED' : 'ENABLED';

    if (snapshot.status !== requiredStatus) {
      return false;
    }

    const { targetType, targetValue } = rule;
    
    switch (targetType) {
      case 'all': 
        return true;
      case 'specific':
        return Array.isArray(targetValue) && targetValue.includes(snapshot.campaignId);
      case 'name_contains':
        return typeof targetValue === 'string' && snapshot.name.toLowerCase().includes(targetValue.toLowerCase());
      case 'name_not_contains':
        return typeof targetValue === 'string' && !snapshot.name.toLowerCase().includes(targetValue.toLowerCase());
      default:
        return false;
    }
  }

  private static evaluateRuleConditions(snapshot: any, conditions: any[]): { matched: boolean, reason: string } {
    if (conditions.length === 0) return { matched: false, reason: "" };

    // Group by conditionGroup
    const groups = new Map<number, any[]>();
    for (const c of conditions) {
      const gId = c.conditionGroup || 0;
      if (!groups.has(gId)) groups.set(gId, []);
      groups.get(gId)!.push(c);
    }

    // ANY group must pass (OR logic between groups)
    for (const [_, groupConditions] of groups) {
      // ALL conditions in group must pass (AND logic within group)
      let groupPassed = true;
      let groupReasons: string[] = [];
      
      for (const condition of groupConditions) {
        const { result, reason } = this.evaluateSingleCondition(snapshot, condition);
        if (!result) {
          groupPassed = false;
          break;
        }
        groupReasons.push(reason);
      }
      
      if (groupPassed) {
        return { matched: true, reason: groupReasons.join(" VÀ ") };
      }
    }

    return { matched: false, reason: "" };
  }

  private static evaluateSingleCondition(snapshot: any, condition: any): { result: boolean, reason: string } {
    const actualValue = this.getMetricValue(snapshot, condition.metric);
    const targetValue = Number(condition.value);
    
    // Diagnostic log
    console.log(`[RULE_DEBUG] Campaign: ${snapshot.name}, Metric: ${condition.metric}, Actual: ${actualValue}, Target: ${targetValue}, Op: ${condition.operator}`);

    let result = false;
    switch (condition.operator) {
      case 'gt': result = actualValue > targetValue; break;
      case 'lt': result = actualValue < targetValue; break;
      case 'gte': result = actualValue >= targetValue; break;
      case 'lte': result = actualValue <= targetValue; break;
      case 'eq': result = actualValue === targetValue; break;
      case 'not_eq': result = actualValue !== targetValue; break;
    }

    const metricNames: Record<string, string> = {
      'cflc_cost': 'Chi tiêu thêm từ lần đơn cuối',
      'real_cpa': 'CPA đơn thực',
      'real_roas': 'ROAS đơn thực',
      'cost': 'Tổng chi tiêu',
      'real_conversions': 'Số đơn thực',
      'budget_spent_pct': '% Ngân sách tiêu',
      'clicks': 'Clicks',
      'ctr': 'CTR',
      'avg_cpc': 'CPC trung bình',
      'google_conversions': 'Số đơn Google',
      'current_hour': 'Giờ hiện tại'
    };

    const opNames: Record<string, string> = {
      'gt': '>', 'lt': '<', 'gte': '>=', 'lte': '<=', 'eq': '=', 'not_eq': '!='
    };

    const reason = `${metricNames[condition.metric] || condition.metric} (${actualValue.toLocaleString()}) ${opNames[condition.operator]} ngưỡng (${targetValue.toLocaleString()})`;
    
    return { result, reason };
  }

  private static getMetricValue(snapshot: any, metric: string): number {
    const cost = Number(snapshot.costMicros || 0) / 1000000;
    const budget = Number(snapshot.budgetMicros || 0) / 1000000;
    const realConv = snapshot.realConversions || 0;
    const convValue = Number(snapshot.realConversionValueMicros || 0) / 1000000;
    const cfCost = Number(snapshot.cfCostMicros || 0) / 1000000;

    switch (metric) {
      case 'cost': return cost;
      case 'real_conversions': return realConv;
      case 'real_conversions_success': return snapshot.realConversionsSuccess || 0;
      case 'real_cpa':
        return realConv > 0 ? cost / realConv : cost; // If 0 conversions, CPA is at least the current cost
      case 'real_roas':
        return cost > 0 ? convValue / cost : 0;
      case 'cflc_cost':
        return cost - cfCost;
      case 'budget_spent_pct':
        return budget > 0 ? (cost / budget) * 100 : 0;
      case 'clicks': return snapshot.clicks || 0;
      case 'ctr': return (snapshot.ctrBps || 0) / 100;
      case 'avg_cpc': return Number(snapshot.avgCpcMicros || 0) / 1000000;
      case 'google_conversions': return Number(snapshot.googleConversions || 0);
      case 'current_hour': return new Date().getHours();
      default: return 0;
    }
  }

  private static async executeActions(
    rule: RuleWithDetails, 
    snapshot: any, 
    mutationsService: MutationsService,
    userId: string,
    adsAccountId: string,
    customerId: string,
    reason: string
  ) {
    for (const action of rule.actions) {
      try {
        console.log(`[RULE_ACTION] Executing ${action.actionType} for ${snapshot.name}`);
        
        switch (action.actionType) {
          case 'pause_campaign':
            await mutationsService.toggleCampaignStatus(snapshot.campaignId, 'PAUSED');
            break;
          case 'enable_campaign':
            await mutationsService.toggleCampaignStatus(snapshot.campaignId, 'ENABLED');
            break;
          case 'adjust_budget':
            const currentBudgetMicros = BigInt(snapshot.budgetMicros || "0");
            const adjustment = Number(action.actionValue); // e.g. 20 for +20%, -10 for -10%
            let newBudgetMicros = currentBudgetMicros + (currentBudgetMicros * BigInt(Math.round(adjustment))) / BigInt(100);
            
            // Guardrail: Budget Suffocation Protection
            if (rule.guardrailBudgetSuffocation && adjustment < 0) {
              const targetCpa = Number(snapshot.targetCpaMicros || 0) / 1000000;
              if (targetCpa > 0) {
                const minBudgetMicros = BigInt(Math.round(5 * targetCpa * 1000000));
                if (newBudgetMicros < minBudgetMicros) {
                  console.log(`[RULE_ENGINE] Guardrail: Capped budget reduction for campaign ${snapshot.name} at 5x Target CPA (${5 * targetCpa} đ) to prevent budget suffocation.`);
                  newBudgetMicros = minBudgetMicros;
                }
              }
            }
            
            await mutationsService.updateCampaignBudget(snapshot.campaignId, newBudgetMicros.toString());
            break;
          case 'send_telegram':
            const adsAcc = await db.query.adsAccounts.findFirst({
              where: eq(adsAccounts.id, adsAccountId)
            });
            const accountName = adsAcc?.name || customerId;

            let actionDesc = "Gửi cảnh báo";
            if (rule.actions.some(a => a.actionType === 'pause_campaign')) {
              actionDesc = "Tạm dừng chiến dịch (PAUSE)";
            } else if (rule.actions.some(a => a.actionType === 'enable_campaign')) {
              actionDesc = "Kích hoạt chiến dịch (ENABLE)";
            } else {
              const budgetAdjustAction = rule.actions.find(a => a.actionType === 'adjust_budget');
              if (budgetAdjustAction) {
                const val = Number(budgetAdjustAction.actionValue);
                actionDesc = val > 0 ? `Tăng ngân sách chiến dịch lên +${val}%` : `Giảm ngân sách chiến dịch xuống ${val}%`;
              }
            }

            const vars = {
              ads_account_name: accountName,
              action: actionDesc,
              campaign_id: snapshot.campaignId,
              campaign_name: snapshot.name,
              reason: reason,
              cost: (Number(snapshot.costMicros || 0) / 1000000).toLocaleString("vi-VN"),
              real_conversions: snapshot.realConversions || 0,
              real_cpa: snapshot.realConversions > 0 
                ? (Number(snapshot.costMicros || 0) / 1000000 / snapshot.realConversions).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) 
                : (Number(snapshot.costMicros || 0) / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 }),
              real_roas: Number(snapshot.costMicros || 0) > 0 
                ? (Number(snapshot.realConversionValueMicros || 0) / Number(snapshot.costMicros || 0)).toFixed(2) 
                : "0",
              time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            };

            const defaultTemplate = 
              `⚠️ <b>CẢNH BÁO TỐI ƯU CHIẾN DỊCH</b>\n\n` +
              `👤 <b>Tài khoản:</b> {ads_account_name}\n` +
              `🎯 <b>Chiến dịch:</b> <code>{campaign_name}</code> (ID: {campaign_id})\n` +
              `⚡ <b>Hành động:</b> <b>{action}</b>\n` +
              `📝 <b>Lý do kích hoạt:</b> {reason}\n\n` +
              `📊 <b>Chỉ số hôm nay:</b>\n` +
              `• Chi tiêu: <code>{cost}</code> đ\n` +
              `• Số đơn thực: <code>{real_conversions}</code> đơn\n` +
              `• CPA thực tế: <code>{real_cpa}</code> đ\n` +
              `• ROAS thực tế: <code>{real_roas}</code>\n\n` +
              `⏰ <i>Kích hoạt tự động lúc: {time}</i>`;

            const rawTemplate = action.alertMessage || defaultTemplate;
            const message = TelegramService.renderTemplate(rawTemplate, vars);

            if (action.telegramConnectionId) {
              await TelegramService.queueConnectionNotification(action.telegramConnectionId, "GGAds Optimizer Alert", message);
            } else {
              await TelegramService.queueNotification(userId, "GGAds Optimizer Alert", message);
            }
            break;
        }

        // Log the execution
        await db.insert(ruleLogs).values({
          ruleId: rule.id,
          ruleName: rule.name,
          adsAccountId: adsAccountId,
          customerId: customerId,
          campaignId: snapshot.campaignId,
          campaignName: snapshot.name,
          actionType: action.actionType,
          metricsSnapshot: {
            cost: snapshot.costMicros,
            conversions: snapshot.realConversions,
            cpa: snapshot.realConversions > 0 ? Number(snapshot.costMicros) / snapshot.realConversions : 0,
            reason: reason
          }
        });

      } catch (err) {
        console.error(`[RULE_ENGINE] Failed to execute action ${action.actionType} for ${snapshot.campaignId}:`, err);
      }
    }
  }

  private static async execute3xKill(
    rule: RuleWithDetails,
    snapshot: any,
    mutationsService: MutationsService,
    userId: string,
    adsAccountId: string,
    customerId: string,
    reason: string
  ) {
    try {
      console.log(`[RULE_ENGINE][3X_KILL] Force pausing campaign ${snapshot.name} (ID: ${snapshot.campaignId}) due to: ${reason}`);
      
      // 1. Force Pause campaign
      await mutationsService.toggleCampaignStatus(snapshot.campaignId, 'PAUSED');
      
      // 2. Log rule execution
      await db.insert(ruleLogs).values({
        ruleId: rule.id,
        ruleName: `${rule.name} (3x Kill)`,
        adsAccountId: adsAccountId,
        customerId: customerId,
        campaignId: snapshot.campaignId,
        campaignName: snapshot.name,
        actionType: 'pause_campaign',
        metricsSnapshot: {
          cost: snapshot.costMicros,
          conversions: snapshot.realConversions,
          cpa: snapshot.realConversions > 0 ? Number(snapshot.costMicros) / snapshot.realConversions : 0,
          reason: reason
        }
      });
      
      // 3. Send Telegram notifications if configured or general warning
      const adsAcc = await db.query.adsAccounts.findFirst({
        where: eq(adsAccounts.id, adsAccountId)
      });
      const accountName = adsAcc?.name || customerId;
      
      const alertMessage = 
        `🚨 <b>CẦU CHÌ AN TOÀN SẬP (3X KILL RULE)</b>\n\n` +
        `👤 <b>Tài khoản:</b> ${accountName}\n` +
        `🎯 <b>Chiến dịch:</b> <code>${snapshot.name}</code> (ID: ${snapshot.campaignId})\n` +
        `⚡ <b>Hành động:</b> <b>Tạm dừng chiến dịch (PAUSED)</b>\n` +
        `📝 <b>Lý do kích hoạt:</b> ${reason}\n\n` +
        `⏰ <i>Dập cầu chì lúc: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</i>`;

      // Find if rule has telegram action configured
      const teleAction = rule.actions.find(a => a.actionType === 'send_telegram');
      if (teleAction && teleAction.telegramConnectionId) {
        await TelegramService.queueConnectionNotification(teleAction.telegramConnectionId, "GGAds 3x Kill Alert", alertMessage);
      } else {
        await TelegramService.queueNotification(userId, "GGAds 3x Kill Alert", alertMessage);
      }
    } catch (err) {
      console.error(`[RULE_ENGINE][3X_KILL] Error executing 3x kill for ${snapshot.campaignId}:`, err);
    }
  }
}
