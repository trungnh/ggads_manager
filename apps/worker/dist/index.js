"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueQueue = exports.placementsQueue = exports.scheduleQueue = exports.evaluationQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const db_1 = require("@repo/db");
const services_1 = require("@repo/services");
const drizzle_orm_1 = require("drizzle-orm");
const redisConnection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
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
}
scheduleJobs().catch(console.error);
