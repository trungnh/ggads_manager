import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, ruleLogs, adsAccounts, userAdsAccounts } from "@repo/db";
import { eq, inArray, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Calendar } from "lucide-react";
import Link from "next/link";

export default async function RuleLogsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Get accessible accounts
  const userAccounts = await db
    .select({ id: adsAccounts.id })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, session.user.id));

  const accountIds = userAccounts.map(a => a.id);

  let logs: any[] = [];
  if (accountIds.length > 0) {
    logs = await db.query.ruleLogs.findMany({
      where: inArray(ruleLogs.adsAccountId, accountIds),
      orderBy: [desc(ruleLogs.executedAt)],
      limit: 100
    });
  }

  return (
    <div className="space-y-6">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/rules">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Nhật ký thực thi Rule</h1>
            <p className="text-xs text-muted-foreground">Theo dõi các hành động tự động đã được thực hiện.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" /> Hôm nay
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" /> Lọc
          </Button>
        </div>
      </div>

      {/* --- Logs Table --- */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-bottom text-[10px] uppercase font-bold text-muted-foreground">
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Tài khoản</th>
                <th className="px-4 py-3">Chiến dịch</th>
                <th className="px-4 py-3 text-center">Hành động</th>
                <th className="px-4 py-3">Chi tiết điều kiện khớp</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Chưa có nhật ký nào.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {new Date(log.executedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs">{log.adsAccountId.split('-')[0]}...</p>
                      <p className="text-[10px] text-muted-foreground">{log.customerId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[250px]">
                        <p className="font-medium text-xs truncate" title={log.campaignName}>{log.campaignName}</p>
                        <p className="text-[10px] text-muted-foreground">{log.campaignId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge 
                        variant={log.actionType === 'pause_campaign' ? 'destructive' : 'default'}
                        className="text-[10px] font-medium py-0 px-2"
                      >
                        {log.actionType === 'pause_campaign' ? 'Tạm dừng' : 
                         log.actionType === 'enable_campaign' ? 'Bật' : 
                         log.actionType === 'adjust_budget' ? 'Tăng/Giảm NS' : 'Telegram'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground italic">
                        {/* @ts-ignore */}
                        {log.metricsSnapshot?.reason || 'N/A'}
                      </p>
                      <div className="flex gap-2 mt-1">
                         {/* @ts-ignore */}
                        <span className="text-[9px] bg-muted px-1.5 rounded">Cost: {Math.round(Number(log.metricsSnapshot?.cost || 0)/1000000).toLocaleString()}đ</span>
                        {/* @ts-ignore */}
                        <span className="text-[9px] bg-muted px-1.5 rounded">CPA: {Math.round(log.metricsSnapshot?.cpa || 0).toLocaleString()}đ</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
