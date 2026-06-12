import { auth } from "@/auth";
import { db, campaignSchedules, userAdsAccounts, adsAccounts } from "@repo/db";
import { eq, inArray, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import ScheduleListClient from "@/components/dayparting/ScheduleListClient";

export default async function DaypartingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch all ads accounts for the user
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
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">Dayparting (Lịch trình Chiến dịch)</h1>
        <p className="text-xs text-muted-foreground mb-6">Tự động bật/tắt hoặc điều chỉnh ngân sách theo khung giờ cố định.</p>
        <div className="p-12 text-center bg-card rounded-[var(--radius)] border border-border">
          <p className="text-sm text-muted-foreground italic">Không tìm thấy tài khoản quảng cáo. Vui lòng kết nối tài khoản trước.</p>
        </div>
      </div>
    );
  }

  const accountIds = accountsData.map(a => a.id);

  const schedules = await db.query.campaignSchedules.findMany({
    where: inArray(campaignSchedules.adsAccountId, accountIds),
    orderBy: [desc(campaignSchedules.createdAt)]
  });

  // Convert dates or non-serializable fields to strings before passing to Client Component
  const serializedSchedules = schedules.map(s => ({
    ...s,
    createdAt: s.createdAt?.toISOString(),
    updatedAt: s.updatedAt?.toISOString(),
    lastExecutedDate: s.lastExecutedDate?.toString() || null,
  }));

  return (
    <div className="p-6">
      <ScheduleListClient 
        initialSchedules={serializedSchedules as any} 
        accounts={accountsData} 
      />
    </div>
  );
}
