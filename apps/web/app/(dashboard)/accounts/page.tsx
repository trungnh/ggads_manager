import { auth } from "@/auth";
import { db, userAdsAccounts, adsAccounts } from "@repo/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import AccountListClient from "./AccountListClient";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const accounts = await db.select({
    id: adsAccounts.id,
    customerId: adsAccounts.customerId,
    name: adsAccounts.name,
    currencyCode: adsAccounts.currencyCode,
    timeZone: adsAccounts.timeZone,
    status: adsAccounts.status,
  })
  .from(adsAccounts)
  .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
  .where(eq(userAdsAccounts.userId, session.user.id));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-card)] p-6 rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-1)]">Danh sách tài khoản</h1>
          <p className="text-sm text-[var(--text-3)]">Quản lý các tài khoản Google Ads đã kết nối</p>
        </div>
        <Link href="/accounts/new">
          <Button className="h-10 px-5 rounded-[calc(var(--radius)*0.8)] gap-2 flex items-center cursor-pointer shadow-sm">
            <Plus size={16} />
            Kết nối thêm
          </Button>
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] py-16 px-6 text-center shadow-sm">
          <div className="w-14 h-14 rounded-[calc(var(--radius)*0.8)] bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--text-3)]">
            <LayoutGrid size={24} />
          </div>
          <h3 className="text-base font-bold text-[var(--text-1)] mb-2">Chưa có tài khoản nào</h3>
          <p className="text-sm text-[var(--text-3)] max-w-sm mx-auto mb-6">
            Hãy kết nối tài khoản Google Ads của bạn để bắt đầu tối ưu hóa.
          </p>
          <Link href="/accounts/new">
            <Button variant="outline" className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-transparent hover:bg-[var(--bg-secondary)] cursor-pointer">Bắt đầu ngay</Button>
          </Link>
        </div>
      ) : (
        <AccountListClient initialAccounts={accounts} />
      )}
    </div>
  );
}
