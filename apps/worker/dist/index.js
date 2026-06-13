"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueQueue = exports.healthAuditQueue = exports.placementsQueue = exports.scheduleQueue = exports.evaluationQueue = exports.budgetOptimizationQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const db_1 = require("@repo/db");
const services_1 = require("@repo/services");
const google_ads_1 = require("@repo/google-ads");
const drizzle_orm_1 = require("drizzle-orm");
const redisConnection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
exports.budgetOptimizationQueue = new bullmq_1.Queue('BudgetOptimizationQueue', { connection: redisConnection });
exports.evaluationQueue = new bullmq_1.Queue('RuleEvaluationQueue', { connection: redisConnection });
const worker = new bullmq_1.Worker('RuleEvaluationQueue', async (job) => {
    console.log(`[Worker] Processing job ${job.id} - ${job.name}`);
    if (job.name === 'evaluate-all-rules') {
        // 1. Get all active Ads accounts
        const activeAccounts = await db_1.db.query.adsAccounts.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.adsAccounts.status, 'ACTIVE')
        });
        if (activeAccounts.length === 0) {
            console.log(`[Worker] No active accounts to process.`);
            return;
        }
        // 2. Process each account
        for (const account of activeAccounts) {
            try {
                // Get a user associated with this account to handle tokens
                const userAccount = await db_1.db.query.userAdsAccounts.findFirst({
                    where: (0, drizzle_orm_1.eq)(db_1.userAdsAccounts.adsAccountId, account.id)
                });
                if (!userAccount) {
                    console.warn(`[Worker] No user found for account ${account.customerId}, skipping...`);
                    continue;
                }
                console.log(`[Worker] Running optimization for account ${account.customerId}...`);
                // We call runAccountOptimization which handles everything:
                // - Fetching enabled rules
                // - Fetching today's campaign data
                // - Evaluating targeting & conditions
                // - Executing actions & logging
                await services_1.RulesEngine.runAccountOptimization(userAccount.userId, account.id, account.customerId);
            }
            catch (error) {
                console.error(`[Worker] Error processing account ${account.customerId}:`, error.message);
            }
        }
    }
    else if (job.name === 'check-performance-reports') {
        await checkAndSendPerformanceReports();
    }
    else if (job.name === 'sync-all-campaigns') {
        await runAutoCampaignSync();
    }
}, { connection: redisConnection });
worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});
worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});
// --- SCHEDULE WORKER (DAYPARTING) ---
exports.scheduleQueue = new bullmq_1.Queue('ScheduleQueue', { connection: redisConnection });
const scheduleWorker = new bullmq_1.Worker('ScheduleQueue', async (job) => {
    if (job.name === 'execute-all-schedules') {
        // False = Real Google Ads API calls
        await services_1.ScheduleEngine.executeAllSchedules(false);
    }
}, { connection: redisConnection });
scheduleWorker.on('failed', (job, err) => {
    console.error(`[Schedule Worker] Job ${job?.id} failed:`, err);
});
// --- TELEGRAM NOTIFICATION WORKER ---
const services_2 = require("@repo/services");
const notificationWorker = new bullmq_1.Worker('NotificationQueue', async (job) => {
    if (job.name === 'send-telegram') {
        const { chatId, botToken, title, message } = job.data;
        const formattedMessage = `<b>${title}</b>\n\n${message}`;
        if (botToken) {
            await services_2.TelegramService.sendMessageWithBot(botToken, chatId, formattedMessage);
        }
        else {
            await services_2.TelegramService.sendMessage(chatId, formattedMessage);
        }
        console.log(`[Notification Worker] Sent Telegram message to ${chatId}`);
    }
}, { connection: redisConnection });
notificationWorker.on('failed', (job, err) => {
    console.error(`[Notification Worker] Job ${job?.id} failed:`, err);
});
console.log('[Worker] Started successfully, waiting for jobs...');
// --- PLACEMENTS AUTO-EXCLUSION WORKER ---
exports.placementsQueue = new bullmq_1.Queue('PlacementsQueue', { connection: redisConnection });
const placementsWorker = new bullmq_1.Worker('PlacementsQueue', async (job) => {
    if (job.name === 'auto-exclude-placements') {
        await runPlacementsAutoExclusion();
    }
}, { connection: redisConnection });
placementsWorker.on('failed', (job, err) => {
    console.error(`[Placements Worker] Job ${job?.id} failed:`, err);
});
async function runPlacementsAutoExclusion() {
    console.log(`[Worker] Running Placements Auto-Exclusion Checker...`);
    try {
        const enabledAccounts = await db_1.db.query.adsAccounts.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.adsAccounts.placementsAutoExcludeEnabled, true)
        });
        if (enabledAccounts.length === 0) {
            console.log(`[Worker] No accounts have Placements Auto-Exclusion enabled.`);
            return;
        }
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
        const currentHourMin = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
        console.log(`[Worker] Found ${enabledAccounts.length} accounts configured for placements auto-exclusion. VN time: ${currentHourMin}`);
        for (const account of enabledAccounts) {
            try {
                if (account.placementsAutoExcludeLastRun === todayStr) {
                    console.log(`[Worker] Placements auto-exclusion already executed today for account ${account.customerId}, skipping.`);
                    continue;
                }
                const targetTime = account.placementsAutoExcludeTime || "08:00";
                if (currentHourMin < targetTime) {
                    console.log(`[Worker] Account ${account.customerId} skipped: Scheduled for ${targetTime} (current: ${currentHourMin})`);
                    continue;
                }
                console.log(`[Worker] Triggering PlacementsAutoService.runAutoExclusion for account ${account.customerId}...`);
                const success = await services_1.PlacementsAutoService.runAutoExclusion(account.id);
                if (success) {
                    await db_1.db.update(db_1.adsAccounts)
                        .set({ placementsAutoExcludeLastRun: todayStr })
                        .where((0, drizzle_orm_1.eq)(db_1.adsAccounts.id, account.id));
                    console.log(`[Worker] Placements auto-exclusion successfully executed and logged for account ${account.customerId}.`);
                }
            }
            catch (error) {
                console.error(`[Worker] Error running placements auto-exclusion for account ${account.customerId}:`, error.message);
            }
        }
    }
    catch (err) {
        console.error(`[Worker] Error querying accounts for placements auto-exclusion:`, err.message);
    }
}
// --- REVENUE WORKER ---
const revenueWorker = new bullmq_1.Worker('RevenueQueue', async (job) => {
    if (job.name === 'sync-daily-revenue') {
        const dateStr = new Date().toISOString().split('T')[0];
        console.log(`[Revenue Worker] Syncing daily revenue for ${dateStr}...`);
        const activeReports = await db_1.db.query.revenueReports.findMany();
        for (const report of activeReports) {
            try {
                await services_1.RevenueService.syncDailyRevenue(report.userId, report.id, dateStr);
            }
            catch (error) {
                console.error(`[Revenue Worker] Failed to sync report ${report.id}:`, error.message);
            }
        }
    }
}, { connection: redisConnection });
// --- HEALTH AUDIT BACKGROUND WORKER ---
exports.healthAuditQueue = new bullmq_1.Queue('HealthAuditQueue', { connection: redisConnection });
const healthAuditWorker = new bullmq_1.Worker('HealthAuditQueue', async (job) => {
    if (job.name === 'auto-run-health-audits') {
        await runAutoHealthAudits();
    }
}, { connection: redisConnection });
healthAuditWorker.on('failed', (job, err) => {
    console.error(`[Health Audit Worker] Job ${job?.id} failed:`, err);
});
async function runAutoHealthAudits() {
    console.log(`[Worker] Running Auto Health Audits Checker...`);
    try {
        const enabledAccounts = await db_1.db.query.adsAccounts.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.adsAccounts.healthAuditAutoEnabled, true)
        });
        if (enabledAccounts.length === 0) {
            console.log(`[Worker] No accounts have Auto Health Audits enabled.`);
            return;
        }
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
        for (const account of enabledAccounts) {
            try {
                let shouldRun = false;
                if (!account.healthAuditLastRun) {
                    shouldRun = true;
                }
                else {
                    const lastRunDate = new Date(account.healthAuditLastRun);
                    const diffTime = Math.abs(now.getTime() - lastRunDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const freq = account.healthAuditCronFrequency || "WEEKLY";
                    if (freq === "DAILY" && diffDays >= 1) {
                        shouldRun = true;
                    }
                    else if (freq === "WEEKLY" && diffDays >= 7) {
                        shouldRun = true;
                    }
                    else if (freq === "MONTHLY" && diffDays >= 30) {
                        shouldRun = true;
                    }
                }
                if (shouldRun) {
                    console.log(`[Worker] Triggering Auto Audit for account ${account.customerId}...`);
                    await services_1.HealthAuditService.runAccountAudit(account.id, "AUTO");
                }
            }
            catch (err) {
                console.error(`[Worker] Error running auto audit for account ${account.customerId}:`, err.message);
            }
        }
    }
    catch (err) {
        console.error(`[Worker] Error in runAutoHealthAudits:`, err.message);
    }
}
async function runAutoCampaignSync() {
    console.log(`[Worker] Running Auto Campaign Sync...`);
    try {
        const activeAccounts = await db_1.db.query.adsAccounts.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.adsAccounts.status, 'ACTIVE')
        });
        if (activeAccounts.length === 0) {
            console.log(`[Worker] No active accounts to sync.`);
            return;
        }
        const todayStr = new Date().toISOString().split('T')[0];
        for (const account of activeAccounts) {
            try {
                const userAccount = await db_1.db.query.userAdsAccounts.findFirst({
                    where: (0, drizzle_orm_1.eq)(db_1.userAdsAccounts.adsAccountId, account.id)
                });
                if (!userAccount) {
                    console.warn(`[Worker] No user found for account ${account.customerId}, skipping sync...`);
                    continue;
                }
                console.log(`[Worker] Syncing campaigns for account ${account.customerId} (${account.id})...`);
                await services_1.CampaignSyncService.syncCampaigns(userAccount.userId, account.id, account.customerId, todayStr);
            }
            catch (err) {
                console.error(`[Worker] Failed to sync campaigns for account ${account.customerId}:`, err.message);
            }
        }
    }
    catch (error) {
        console.error(`[Worker] Error in runAutoCampaignSync:`, error.message);
    }
}
async function checkAndSendPerformanceReports() {
    console.log(`[Worker] Checking for performance reports to send...`);
    const activeReports = await db_1.db.query.telegramPerformanceReports.findMany({
        where: (0, drizzle_orm_1.eq)(db_1.telegramPerformanceReports.isEnabled, true),
        with: {
            connection: true
        }
    });
    if (activeReports.length === 0) {
        console.log(`[Worker] No active performance reports configured.`);
        return;
    }
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
    const currentHourMin = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    console.log(`[Worker] Found ${activeReports.length} enabled performance reports. Current VN time: ${currentHourMin}`);
    for (const report of activeReports) {
        try {
            // 1. Check time window
            if (report.hoursStart && report.hoursEnd) {
                if (currentHourMin < report.hoursStart || currentHourMin > report.hoursEnd) {
                    console.log(`[Worker] Report ${report.name} skipped: Out of time window (${currentHourMin} not in [${report.hoursStart}, ${report.hoursEnd}])`);
                    continue;
                }
            }
            // 2. Check cooldown/frequency
            if (report.lastSentAt) {
                const diffMs = now.getTime() - new Date(report.lastSentAt).getTime();
                const freq = report.frequencyMinutes || 60;
                if (diffMs < freq * 60 * 1000) {
                    console.log(`[Worker] Report ${report.name} skipped: Cooldown active (${Math.round(diffMs / 60000)}m < ${freq}m)`);
                    continue;
                }
            }
            // 3. Compile today's stats across all user's reports
            const userReports = await db_1.db.query.revenueReports.findMany({
                where: (0, drizzle_orm_1.eq)(db_1.revenueReports.userId, report.userId)
            });
            if (userReports.length === 0) {
                console.log(`[Worker] Report ${report.name} skipped: No active spreadsheet reports configured for user.`);
                continue;
            }
            let adsCost = 0;
            let orders = 0;
            let revenue = 0;
            let profit = 0;
            for (const uRep of userReports) {
                try {
                    const stats = await services_1.RevenueService.calculateDailyProfit(report.userId, uRep.id, todayStr);
                    adsCost += Number(stats.adsCostMicros) / 1000000;
                    orders += stats.orders;
                    revenue += Number(stats.revenueMicros) / 1000000;
                    profit += Number(stats.profitMicros) / 1000000;
                }
                catch (err) {
                    console.error(`[Worker] Error computing stats for report ${uRep.id}:`, err.message);
                }
            }
            const roas = adsCost > 0 ? (revenue / adsCost) : 0;
            const vars = {
                report_name: report.name,
                ads_cost: adsCost.toLocaleString("vi-VN", { maximumFractionDigits: 0 }),
                crm_success_orders: orders.toLocaleString("vi-VN"),
                net_revenue: revenue.toLocaleString("vi-VN", { maximumFractionDigits: 0 }),
                roas: roas.toFixed(2),
                profit: profit.toLocaleString("vi-VN", { maximumFractionDigits: 0 }),
                time: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            };
            const defaultTemplate = `📊 <b>BÁO CÁO HIỆU SUẤT P&L HÔM NAY</b>\n\n` +
                `📝 <b>Lịch báo cáo:</b> {report_name}\n\n` +
                `💸 <b>Chi tiêu Ads:</b> <code>{ads_cost}</code> đ\n` +
                `📦 <b>Đơn thành công:</b> <code>{crm_success_orders}</code> đơn\n` +
                `💰 <b>Doanh thu thực:</b> <code>{net_revenue}</code> đ\n` +
                `📈 <b>ROAS thực tế:</b> <code>{roas}</code>\n` +
                `🟢 <b>Lợi nhuận ròng:</b> <b>{profit}</b> đ\n\n` +
                `⏰ <i>Cập nhật tự động lúc: {time}</i>`;
            const rawTemplate = report.customMessage || defaultTemplate;
            const message = services_2.TelegramService.renderTemplate(rawTemplate, vars);
            // Queue sending
            await services_1.notificationQueue.add('send-telegram', {
                botToken: report.connection?.botToken,
                chatId: report.connection?.chatId,
                title: "GGAds Periodic Report",
                message,
                userId: report.userId
            });
            // Update lastSentAt
            await db_1.db.update(db_1.telegramPerformanceReports)
                .set({ lastSentAt: new Date() })
                .where((0, drizzle_orm_1.eq)(db_1.telegramPerformanceReports.id, report.id));
            console.log(`[Worker] Sent performance report "${report.name}" to connection "${report.connection?.name}"`);
        }
        catch (error) {
            console.error(`[Worker] Failed to process report "${report.name}":`, error.message);
        }
    }
}
exports.revenueQueue = new bullmq_1.Queue('RevenueQueue', { connection: redisConnection });
// --- BUDGET OPTIMIZER WORKER (STAGED ROLLOUT & SAFETY BREAKER) ---
const budgetOptimizationWorker = new bullmq_1.Worker('BudgetOptimizationQueue', async (job) => {
    console.log(`[Budget Optimization Worker] Processing job ${job.id} - ${job.name}`);
    if (job.name === 'apply-staged-rollout-step') {
        await runStagedRolloutSteps();
    }
    else if (job.name === 'check-safety-breakers') {
        await runSafetyBreakerChecks();
    }
}, { connection: redisConnection });
budgetOptimizationWorker.on('failed', (job, err) => {
    console.error(`[Budget Optimization Worker] Job ${job?.id} failed:`, err);
});
async function runStagedRolloutSteps() {
    console.log(`[Worker] Running Staged Rollout steps checker...`);
    const todayStr = new Date().toISOString().split('T')[0];
    // Fetch in-progress done optimizations
    const activeOpts = await db_1.db.select()
        .from(db_1.budgetOptimizations)
        .where((0, drizzle_orm_1.eq)(db_1.budgetOptimizations.status, 'done'));
    for (const opt of activeOpts) {
        if (!opt.stagedRolloutSchedule)
            continue;
        if (opt.safetyBreakerTriggeredAt)
            continue; // safety tripped, bypass
        const schedule = opt.stagedRolloutSchedule;
        // Find pending step for today
        const todayStep = schedule.find(step => step.date === todayStr && step.status === 'pending');
        if (!todayStep)
            continue;
        console.log(`[Worker] Applying Staged Rollout Step for Optimization ${opt.id}, Day Index ${todayStep.dayIndex}...`);
        try {
            const userAdsAcc = await db_1.db.query.userAdsAccounts.findFirst({
                where: (0, drizzle_orm_1.eq)(db_1.userAdsAccounts.userId, opt.userId)
            });
            if (!userAdsAcc)
                continue;
            const [adsAcc] = await db_1.db.select()
                .from(db_1.adsAccounts)
                .where((0, drizzle_orm_1.eq)(db_1.adsAccounts.id, userAdsAcc.adsAccountId))
                .limit(1);
            if (!adsAcc || !adsAcc.oauthConnectionId)
                continue;
            const budgetPct = todayStep.budgetPct;
            const algOutput = opt.algorithmOutput;
            const allocations = algOutput?.allocations || [];
            const campaignsService = new google_ads_1.CampaignsService(adsAcc.oauthConnectionId, adsAcc.customerId, adsAcc.loginCustomerId || undefined);
            for (const alloc of allocations) {
                if (alloc.isLocked || alloc.isSuspended)
                    continue;
                const campaignId = alloc.campaignId;
                const currentBudget = alloc.currentBudgetMicros;
                // Target step budget = currentBudget * (budgetPct / 100)
                const targetBudget = Math.round(currentBudget * (budgetPct / 100));
                console.log(`[Worker] Staged Rollout: Scaling budget of campaign "${alloc.campaignName}" to ${targetBudget / 1000000} VND (${budgetPct}% of status-quo)...`);
                await campaignsService.updateCampaignBudget(campaignId, targetBudget.toString());
            }
            todayStep.status = 'applied';
            todayStep.appliedAt = new Date().toISOString();
            await db_1.db.update(db_1.budgetOptimizations)
                .set({ stagedRolloutSchedule: schedule })
                .where((0, drizzle_orm_1.eq)(db_1.budgetOptimizations.id, opt.id));
            console.log(`[Worker] Staged Rollout step applied successfully for optimization ${opt.id}`);
        }
        catch (err) {
            console.error(`[Worker] Failed to apply Staged Rollout step for ${opt.id}:`, err.message);
            todayStep.status = 'failed';
            await db_1.db.update(db_1.budgetOptimizations)
                .set({ stagedRolloutSchedule: schedule })
                .where((0, drizzle_orm_1.eq)(db_1.budgetOptimizations.id, opt.id));
        }
    }
}
async function runSafetyBreakerChecks() {
    console.log(`[Worker] Running Safety Breaker checks...`);
    const todayStr = new Date().toISOString().split('T')[0];
    const activeOpts = await db_1.db.select()
        .from(db_1.budgetOptimizations)
        .where((0, drizzle_orm_1.eq)(db_1.budgetOptimizations.status, 'done'));
    for (const opt of activeOpts) {
        if (opt.safetyBreakerTriggeredAt)
            continue;
        const input = opt.optimizationInput;
        const safetyConfig = input?.safetyBreaker || { cpaThresholdPct: 30, paceCheckEnabled: true, minSpendMicros: 2000000000 };
        const cpaCeilingPct = safetyConfig.cpaThresholdPct || 30;
        const algOutput = opt.algorithmOutput;
        const allocations = algOutput?.allocations || [];
        for (const alloc of allocations) {
            if (alloc.isLocked || alloc.isSuspended)
                continue;
            const [todaySnap] = await db_1.db.select()
                .from(db_1.campaignsSnapshot)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.campaignsSnapshot.campaignId, alloc.campaignId), (0, drizzle_orm_1.eq)(db_1.campaignsSnapshot.date, todayStr)))
                .limit(1);
            if (!todaySnap)
                continue;
            const todayCost = BigInt(todaySnap.costMicros || '0');
            const todayConvs = todaySnap.realConversionsSuccess || 0;
            const minSpend = BigInt(safetyConfig.minSpendMicros || '2000000000'); // 2M VND default
            if (todayCost < minSpend)
                continue;
            // 1. CPA Ceiling Breach
            const targetCpa = alloc.projectedCpaMicros;
            if (targetCpa > 0 && todayConvs > 0) {
                const todayCpa = Number(todayCost / BigInt(todayConvs));
                const breachThreshold = targetCpa * (1 + cpaCeilingPct / 100);
                if (todayCpa > breachThreshold) {
                    console.log(`[Worker] SAFETY BREAKER TRIPPED! CPA breach on "${alloc.campaignName}": Today CPA ${todayCpa / 1000000} exceeds benchmark ${targetCpa / 1000000} by ${cpaCeilingPct}%`);
                    await triggerSafetyBreaker(opt.id, alloc.campaignId, alloc.campaignName, `CPA thực tế (${(todayCpa / 1000000).toLocaleString()} đ) vượt quá ${cpaCeilingPct}% CPA mục tiêu (${(targetCpa / 1000000).toLocaleString()} đ)`);
                    break;
                }
            }
            // 2. Intra-day Pacing morning breach (spent > 60% of budget with 0 CRM conversions before noon)
            if (safetyConfig.paceCheckEnabled) {
                const now = new Date();
                const currentHour = now.getUTCHours() + 7; // VN timezone
                const isMorning = currentHour >= 6 && currentHour < 12;
                if (isMorning && todayConvs === 0) {
                    const dailyBudget = BigInt(alloc.recommendedBudgetMicros);
                    const spentRatio = dailyBudget > BigInt(0) ? Number((todayCost * BigInt(100)) / dailyBudget) : 0;
                    if (spentRatio > 60) {
                        console.log(`[Worker] SAFETY BREAKER TRIPPED! Morning pacing breach on "${alloc.campaignName}": Spent ${spentRatio}% of budget before noon with 0 conversions.`);
                        await triggerSafetyBreaker(opt.id, alloc.campaignId, alloc.campaignName, `Chi tiêu nhanh sáng sớm (${spentRatio}% ngân sách ngày) nhưng ghi nhận 0 đơn hàng thực tế trên Pancake CRM`);
                        break;
                    }
                }
            }
        }
    }
}
async function triggerSafetyBreaker(optimizationId, campaignId, campaignName, reason) {
    const now = new Date();
    await db_1.db.update(db_1.budgetOptimizations)
        .set({
        safetyBreakerTriggeredAt: now,
        safetyBreakerDetails: { campaignId, campaignName, reason, triggeredAt: now.toISOString() }
    })
        .where((0, drizzle_orm_1.eq)(db_1.budgetOptimizations.id, optimizationId));
    const [opt] = await db_1.db.select().from(db_1.budgetOptimizations).where((0, drizzle_orm_1.eq)(db_1.budgetOptimizations.id, optimizationId)).limit(1);
    if (!opt)
        return;
    const userAdsAcc = await db_1.db.query.userAdsAccounts.findFirst({
        where: (0, drizzle_orm_1.eq)(db_1.userAdsAccounts.userId, opt.userId)
    });
    if (!userAdsAcc)
        return;
    const [adsAcc] = await db_1.db.select().from(db_1.adsAccounts).where((0, drizzle_orm_1.eq)(db_1.adsAccounts.id, userAdsAcc.adsAccountId)).limit(1);
    if (!adsAcc || !adsAcc.oauthConnectionId)
        return;
    const algOutput = opt.algorithmOutput;
    const allocations = algOutput?.allocations || [];
    const campaignsService = new google_ads_1.CampaignsService(adsAcc.oauthConnectionId, adsAcc.customerId, adsAcc.loginCustomerId || undefined);
    // Rollback all campaign budgets to status-quo
    for (const alloc of allocations) {
        if (alloc.isLocked || alloc.isSuspended)
            continue;
        try {
            console.log(`[Worker] Safety Breaker Rollback: Reverting campaign "${alloc.campaignName}" budget to ${alloc.currentBudgetMicros / 1000000} VND...`);
            await campaignsService.updateCampaignBudget(alloc.campaignId, alloc.currentBudgetMicros.toString());
        }
        catch (err) {
            console.error(`[Worker] Safety Rollback failed for campaign ${alloc.campaignId}:`, err.message);
        }
    }
    // Send High Priority Telegram warning alert!
    const notificationReports = await db_1.db.query.telegramPerformanceReports.findMany({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.telegramPerformanceReports.userId, opt.userId), (0, drizzle_orm_1.eq)(db_1.telegramPerformanceReports.isEnabled, true)),
        with: { connection: true }
    });
    const alertMessage = `🚨 <b>CẦU CHÌ AN TOÀN ĐÃ SẬP! (SAFETY BREAKER TRIGGERED)</b>\n\n` +
        `📌 <b>Tài khoản Ads:</b> ${adsAcc.name || adsAcc.customerId}\n` +
        `🎯 <b>Chiến dịch cảnh báo:</b> ${campaignName}\n` +
        `⚠️ <b>Nguyên nhân:</b> <code>${reason}</code>\n\n` +
        `⚡ <b>Hành động tự động:</b> Hệ thống đã lập tức kích hoạt hạ ngân sách toàn bộ chiến dịch quảng cáo về mốc thầu an toàn cũ trước khi scale để cắt lỗ thành công.\n\n` +
        `⏰ <i>Sập lúc: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</i>`;
    for (const report of notificationReports) {
        try {
            await services_1.notificationQueue.add('send-telegram', {
                botToken: report.connection?.botToken,
                chatId: report.connection?.chatId,
                title: "GGAds Safety Breaker Tripped",
                message: alertMessage,
                userId: opt.userId
            });
        }
        catch (teleErr) {
            console.error(`[Worker] Failed sending Telegram warning for safety breaker:`, teleErr);
        }
    }
}
// Schedule repeatable jobs
async function scheduleJobs() {
    await exports.evaluationQueue.add('evaluate-all-rules', {}, {
        repeat: {
            pattern: '*/5 * * * *', // Every 5 minutes
        }
    });
    console.log('[Worker] Scheduled evaluation job to run every 5 minutes.');
    await exports.evaluationQueue.add('check-performance-reports', {}, {
        repeat: {
            pattern: '*/5 * * * *', // Every 5 minutes
        }
    });
    console.log('[Worker] Scheduled performance report job to run every 5 minutes.');
    await exports.evaluationQueue.add('sync-all-campaigns', {}, {
        repeat: {
            pattern: '*/5 * * * *', // Every 5 minutes
        }
    });
    console.log('[Worker] Scheduled campaigns sync job to run every 5 minutes.');
    await exports.scheduleQueue.add('execute-all-schedules', {}, {
        repeat: {
            pattern: '*/5 * * * *', // Every 5 minutes
        }
    });
    console.log('[Worker] Scheduled dayparting job to run every 5 minutes.');
    await exports.revenueQueue.add('sync-daily-revenue', {}, {
        repeat: {
            pattern: '0 23 * * *', // Every day at 23:00
        }
    });
    console.log('[Worker] Scheduled revenue sync job to run daily at 23:00.');
    await exports.placementsQueue.add('auto-exclude-placements', {}, {
        repeat: {
            pattern: '*/5 * * * *', // Every 5 minutes
        }
    });
    console.log('[Worker] Scheduled placements auto-exclusion job to run every 5 minutes.');
    // Schedule Budget Optimization Staged Rollout (Every day at 00:05 AM)
    await exports.budgetOptimizationQueue.add('apply-staged-rollout-step', {}, {
        repeat: {
            pattern: '5 0 * * *',
        }
    });
    console.log('[Worker] Scheduled Budget Staged Rollout steps job to run daily at 00:05.');
    // Schedule Budget Optimization Safety Breaker checks (Every 15 minutes)
    await exports.budgetOptimizationQueue.add('check-safety-breakers', {}, {
        repeat: {
            pattern: '*/15 * * * *',
        }
    });
    console.log('[Worker] Scheduled Budget Safety Breaker checks job to run every 15 minutes.');
    // Schedule Health Audits checks (Every 1 hour)
    await exports.healthAuditQueue.add('auto-run-health-audits', {}, {
        repeat: {
            pattern: '0 * * * *', // Every hour
        }
    });
    console.log('[Worker] Scheduled health audits auto check to run every hour.');
}
scheduleJobs().catch(console.error);
