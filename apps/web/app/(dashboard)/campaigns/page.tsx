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
    <div style={{ maxWidth: 1200, padding: 24 }} className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)' }}>Chọn tài khoản chiến dịch</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Chọn một tài khoản Google Ads để xem và quản lý các chiến dịch.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {accounts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', border: '0.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', color: 'var(--text-3)' }}>
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
