import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, optimizationRules, adsAccounts, userAdsAccounts } from "@repo/db";
import { eq, inArray, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Sliders, Play, Pause, Trash2, Edit3, History, ExternalLink } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RunRulesButton } from "./RunRulesButton";
import { RuleCardActions } from "./RuleCardActions";

export default async function RulesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Get accessible accounts
  const userAccounts = await db
    .select({ 
      id: adsAccounts.id,
      name: adsAccounts.name,
      customerId: adsAccounts.customerId 
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, session.user.id));

  const accountIds = userAccounts.map(a => a.id);
  const accountMap = userAccounts.reduce((acc, a) => {
    acc[a.id] = a;
    return acc;
  }, {} as any);

  let rules: any[] = [];
  if (accountIds.length > 0) {
    rules = await db.query.optimizationRules.findMany({
      where: inArray(optimizationRules.adsAccountId, accountIds),
      orderBy: [desc(optimizationRules.priority), desc(optimizationRules.createdAt)],
      with: {
        conditions: true,
        actions: true
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-6 rounded-[var(--radius)] border border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[calc(var(--radius)*0.8)] bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)]">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-1)]">Rule Engine</h1>
            <p className="text-sm text-[var(--text-3)]">Tự động hóa tối ưu chiến dịch dựa trên dữ liệu CRM thời gian thực.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RunRulesButton />
          <Link href="/rules/logs">
            <Button variant="outline" size="sm" className="gap-2 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]">
              <History className="w-4 h-4" /> Nhật ký chạy
            </Button>
          </Link>
          <Link href="/rules/new">
            <Button size="sm" className="gap-2 shadow-sm rounded-[calc(var(--radius)*0.8)]">
              <Plus className="w-4 h-4" /> Tạo Rule mới
            </Button>
          </Link>
        </div>
      </div>

      {/* --- Rules Grid --- */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="border-dashed border-[var(--border)] rounded-[var(--radius)] bg-[var(--bg-card)] py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
              <Sliders className="w-8 h-8 text-[var(--text-3)]" />
            </div>
            <CardTitle className="text-xl mb-2 text-[var(--text-1)]">Chưa có Rule nào</CardTitle>
            <CardDescription className="max-w-xs mb-6 text-[var(--text-3)]">
              Bắt đầu bằng việc tạo một Rule để tự động hóa việc tắt camp khi lỗ hoặc tăng ngân sách khi lãi.
            </CardDescription>
            <Link href="/rules/new">
              <Button className="rounded-[calc(var(--radius)*0.8)]">Tạo Rule đầu tiên</Button>
            </Link>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] group hover:border-[var(--primary)]/40 transition-all shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                {/* Status bar (vertical on desktop) */}
                <div className={`w-1 sm:h-full self-stretch ${rule.isEnabled ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                
                <div className="flex-1 p-6 grid sm:grid-cols-[1fr_200px_150px_120px] items-center gap-6">
                  {/* Name & Target */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-[var(--text-1)]">{rule.name}</h3>
                      {rule.priority > 0 && <Badge variant="secondary" className="text-[10px] rounded-[calc(var(--radius)*0.4)]">Ưu tiên {rule.priority}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {accountMap[rule.adsAccountId]?.name}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{rule.targetType === 'all' ? 'Tất cả camp' : 'Camp cụ thể'}</span>
                    </div>
                  </div>

                  {/* Conditions Summary */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-3)]">Điều kiện</p>
                    <div className="flex flex-wrap gap-1">
                      {rule.conditions.slice(0, 2).map((c: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-normal py-0 rounded-[calc(var(--radius)*0.4)] border-[var(--border)]">
                          {c.metric} {c.operator === 'gt' ? '>' : '<'} {Number(c.value).toLocaleString()}
                        </Badge>
                      ))}
                      {rule.conditions.length > 2 && <span className="text-[10px] text-[var(--text-3)]">+{rule.conditions.length - 2} nữa</span>}
                    </div>
                  </div>

                  {/* Last Run */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-3)]">Chạy lần cuối</p>
                    <p className="text-xs text-[var(--text-1)]">
                      {rule.lastExecutedAt 
                        ? new Date(rule.lastExecutedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : 'Chưa chạy'}
                    </p>
                    <p className="text-[9px] text-[var(--text-3)]">
                      Hôm nay: {rule.executionsTodayCount || 0} lần
                    </p>
                  </div>

                  {/* Actions */}
                  <RuleCardActions ruleId={rule.id} isEnabled={rule.isEnabled} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* --- Footer Stats --- */}
      {rules.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-[var(--text-3)] p-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{rules.filter(r => r.isEnabled).length} đang bật</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
            <span>{rules.filter(r => !r.isEnabled).length} tạm dừng</span>
          </div>
        </div>
      )}
    </div>
  );
}
