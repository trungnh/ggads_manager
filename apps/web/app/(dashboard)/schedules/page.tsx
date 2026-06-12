import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, campaignSchedules, optimizationRules, telegramPerformanceReports, ruleLogs, userAdsAccounts, adsAccounts } from "@repo/db";
import { eq, inArray, desc } from "drizzle-orm";
import SchedulesPageClient from "./SchedulesPageClient";

export default async function SchedulesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch connected accounts
  const accountsData = await db.select({
    id: adsAccounts.id,
    name: adsAccounts.name,
    customerId: adsAccounts.customerId
  })
  .from(adsAccounts)
  .innerJoin(userAdsAccounts, eq(adsAccounts.id, userAdsAccounts.adsAccountId))
  .where(eq(userAdsAccounts.userId, session.user.id));

  if (accountsData.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">Bảng điều khiển lịch trình</h1>
        <p className="text-xs text-muted-foreground mb-6">Giám sát và quản lý toàn bộ lịch hoạt động của chiến dịch, quy tắc và báo cáo tự động.</p>
        <div className="p-12 text-center bg-card rounded-[var(--radius)] border border-border">
          <p className="text-sm text-muted-foreground italic">Không tìm thấy tài khoản quảng cáo liên kết. Vui lòng kết nối tài khoản quảng cáo trước.</p>
        </div>
      </div>
    );
  }

  const accountIds = accountsData.map(a => a.id);

  // 2. Fetch campaign schedules (Dayparting)
  const schedules = await db.query.campaignSchedules.findMany({
    where: inArray(campaignSchedules.adsAccountId, accountIds),
    orderBy: [desc(campaignSchedules.createdAt)]
  });

  // 3. Fetch active rules
  const rules = await db.query.optimizationRules.findMany({
    where: inArray(optimizationRules.adsAccountId, accountIds),
    orderBy: [desc(optimizationRules.createdAt)]
  });

  // 4. Fetch telegram performance reports
  const reports = await db.query.telegramPerformanceReports.findMany({
    where: eq(telegramPerformanceReports.userId, session.user.id),
    orderBy: [desc(telegramPerformanceReports.createdAt)]
  });

  // 5. Fetch recent execution logs (limit 10)
  const logs = await db.query.ruleLogs.findMany({
    where: inArray(ruleLogs.adsAccountId, accountIds),
    orderBy: [desc(ruleLogs.executedAt)],
    limit: 10
  });

  // 6. Serialize fields before passing to Client Component
  const serializedSchedules = schedules.map(s => ({
    ...s,
    createdAt: s.createdAt?.toISOString(),
    updatedAt: s.updatedAt?.toISOString(),
    lastExecutedDate: s.lastExecutedDate?.toString() || null,
  }));

  const serializedRules = rules.map(r => ({
    ...r,
    createdAt: r.createdAt?.toISOString(),
    updatedAt: r.updatedAt?.toISOString(),
    lastExecutedAt: r.lastExecutedAt?.toISOString() || null,
    executionsTodayDate: r.executionsTodayDate?.toString() || null,
  }));

  const serializedReports = reports.map(r => ({
    ...r,
    createdAt: r.createdAt?.toISOString(),
    updatedAt: r.updatedAt?.toISOString(),
    lastSentAt: r.lastSentAt?.toISOString() || null,
  }));

  const serializedLogs = logs.map(l => ({
    ...l,
    executedAt: l.executedAt?.toISOString() || null,
  }));

  return (
    <div className="p-6">
      <SchedulesPageClient 
        initialSchedules={serializedSchedules as any}
        initialRules={serializedRules as any}
        initialReports={serializedReports as any}
        initialLogs={serializedLogs as any}
        accounts={accountsData}
      />
    </div>
  );
}
