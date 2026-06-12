import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, adsAccounts, userAdsAccounts } from "@repo/db";
import { eq } from "drizzle-orm";
import AccountCard from '@/components/dashboard/AccountCard'

export default async function CampaignsRootPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Show account selector
  const accounts = await db
    .select({
      id: adsAccounts.id,
      customerId: adsAccounts.customerId,
      name: adsAccounts.name,
      status: adsAccounts.status,
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, session.user.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Chọn tài khoản chiến dịch</h1>
        <p className="text-xs text-muted-foreground mt-1">Chọn một tài khoản Google Ads để xem và quản lý các chiến dịch.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-border rounded-[var(--radius)] bg-card text-muted-foreground font-medium">
            Bạn chưa kết nối tài khoản Google Ads nào.
          </div>
        ) : (
          accounts.map(account => (
            <AccountCard 
              key={account.id} 
              account={{
                id: account.id,
                customerId: account.customerId,
                name: account.name || 'Tài khoản không tên',
                status: account.status || 'ACTIVE'
              }} 
            />
          ))
        )}
      </div>
    </div>
  );
}
