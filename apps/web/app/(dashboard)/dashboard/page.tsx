import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, adsAccounts, userAdsAccounts, campaignSchedules, ruleLogs, campaignsSnapshot } from "@repo/db";
import { eq, and, desc, lte, gte, inArray } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import AutomationActivityLog from '@/components/dashboard/AutomationActivityLog';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Bot, 
  ShieldAlert, 
  DollarSign, 
  Target, 
  Layers, 
  Activity, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  Settings, 
  AlertTriangle,
  RefreshCw,
  X,
  Sliders,
  Check,
  ChevronDown,
  Percent,
  Play,
  Pause,
  ArrowDownRight,
  TrendingDown
} from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { date?: string; accountId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 1. Fetch connected ad accounts for the active user
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

  if (accounts.length === 0) {
    return (
      <div className="w-full py-16 text-center border border-dashed border-[var(--border)] rounded-[var(--radius)] bg-[var(--bg-card)] shadow-sm max-w-2xl mx-auto mt-10">
        <Layers className="w-12 h-12 text-[var(--text-3)] mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-[var(--text-1)]">Chưa kết nối tài khoản Google Ads</h2>
        <p className="text-sm text-[var(--text-3)] mt-2 max-w-md mx-auto leading-relaxed">
          Hệ thống cần liên kết OAuth với tài khoản quảng cáo của bạn để kéo dữ liệu đối soát Pancake CRM.
        </p>
        <Link 
          href="/connections" 
          className={cn(buttonVariants({ size: "default" }), "mt-6 cursor-pointer")}
        >
          Kết nối Tài khoản ngay
        </Link>
      </div>
    );
  }

  const accountIds = accounts.map(a => a.id);
  const customerIds = accounts.map(a => a.customerId);

  // 2. Query distinct dates in the database for the date dropdown
  const distinctDatesResult = await db
    .selectDistinct({ date: campaignsSnapshot.date })
    .from(campaignsSnapshot)
    .where(inArray(campaignsSnapshot.customerId, customerIds))
    .orderBy(desc(campaignsSnapshot.date));

  const distinctDates = distinctDatesResult.map(d => d.date);

  const actualTodayDate = new Date().toISOString().split('T')[0]; // "2026-06-01"
  const dateParam = searchParams?.date || "today";
  const selectedAccountId = searchParams?.accountId || "all";

  // Calculate dynamic start and end dates based on relative ranges
  let startDateStr = actualTodayDate;
  let endDateStr = actualTodayDate;

  if (dateParam === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    startDateStr = yesterdayStr;
    endDateStr = yesterdayStr;
  } else if (dateParam === "7days") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    startDateStr = start.toISOString().split('T')[0];
    endDateStr = actualTodayDate;
  } else if (dateParam === "15days") {
    const start = new Date();
    start.setDate(start.getDate() - 14);
    startDateStr = start.toISOString().split('T')[0];
    endDateStr = actualTodayDate;
  } else if (dateParam === "30days") {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    startDateStr = start.toISOString().split('T')[0];
    endDateStr = actualTodayDate;
  }

  // Filter active customer IDs based on selection
  const activeCustomerIds = selectedAccountId === "all"
    ? customerIds
    : accounts.filter(a => a.id === selectedAccountId).map(a => a.customerId);

  // 3. Query campaign snapshots for the selected date range
  const snapshots = await db
    .select()
    .from(campaignsSnapshot)
    .where(and(
      inArray(campaignsSnapshot.customerId, activeCustomerIds),
      and(
        gte(campaignsSnapshot.date, startDateStr),
        lte(campaignsSnapshot.date, endDateStr)
      )
    ));

  // Compute KPI summaries for the selected date range
  let totalCostMicros = 0n;
  let totalBudgetMicros = 0n;
  let totalCRMConvsSuccess = 0;
  let totalCRMRevenueSuccessMicros = 0n;
  let totalGoogleConvs = 0;

  for (const snap of snapshots) {
    totalCostMicros += BigInt(snap.costMicros || "0");
    totalBudgetMicros += BigInt(snap.budgetMicros || "0");
    totalCRMConvsSuccess += snap.realConversions || 0;
    totalCRMRevenueSuccessMicros += BigInt(snap.realConversionValueSuccessMicros || "0");
    totalGoogleConvs += parseFloat(snap.googleConversions || "0");
  }

  const totalCost = Number(totalCostMicros) / 1000000;
  const totalBudget = Number(totalBudgetMicros) / 1000000;
  const totalCRMRevenue = Number(totalCRMRevenueSuccessMicros) / 1000000;
  const cpa = totalCRMConvsSuccess > 0 ? totalCost / totalCRMConvsSuccess : 0;
  const roas = totalCost > 0 ? totalCRMRevenue / totalCost : 0;
  const netProfit = totalCRMRevenue - totalCost;

  // Monthly theoretical budget projection (Daily budgets sum * 30 days)
  const monthlyBudgetGoal = totalBudget * 30;
  const budgetSpentPct = monthlyBudgetGoal > 0 ? (totalCost / monthlyBudgetGoal) * 100 : 0;

  // Timezone-safe date generator
  const getDatesRange = (startStr: string, endStr: string) => {
    const dateArr: string[] = [];
    const start = new Date(startStr + 'T00:00:00Z');
    const end = new Date(endStr + 'T00:00:00Z');
    const dt = new Date(start);
    let limit = 0;
    while (dt <= end && limit < 45) {
      dateArr.push(dt.toISOString().split('T')[0]);
      dt.setUTCDate(dt.getUTCDate() + 1);
      limit++;
    }
    return dateArr;
  };

  // Generate calendar dates for the chart based on selected relative option
  let chartDates: string[] = [];
  if (dateParam === "today") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    chartDates = getDatesRange(start.toISOString().split('T')[0], actualTodayDate);
  } else if (dateParam === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const start = new Date(yesterday);
    start.setDate(start.getDate() - 6);
    chartDates = getDatesRange(start.toISOString().split('T')[0], yesterdayStr);
  } else {
    chartDates = getDatesRange(startDateStr, endDateStr);
  }

  let chartData: any[] = [];
  if (chartDates.length > 0) {
    const chartSnaps = await db
      .select()
      .from(campaignsSnapshot)
      .where(and(
        inArray(campaignsSnapshot.customerId, activeCustomerIds),
        inArray(campaignsSnapshot.date, chartDates)
      ));

    chartData = chartDates.map(dateStr => {
      const snaps = chartSnaps.filter(s => s.date === dateStr);
      let costSum = 0;
      let convsSum = 0;
      let revSum = 0;

      for (const s of snaps) {
        costSum += Number(s.costMicros || 0) / 1000000;
        convsSum += s.realConversions || 0;
        revSum += Number(s.realConversionValueSuccessMicros || 0) / 1000000;
      }

      const roas = costSum > 0 ? Number((revSum / costSum).toFixed(2)) : 0;

      const [y, m, d] = dateStr.split('-');
      return {
        date: `${d}/${m}`,
        cost: costSum,
        leads: convsSum,
        roas: roas
      };
    });
  }

  // 5. Query active campaign schedules count
  const activeSchedulesCount = await db
    .select({ id: campaignSchedules.id })
    .from(campaignSchedules)
    .where(and(
      inArray(campaignSchedules.adsAccountId, accountIds),
      eq(campaignSchedules.status, 'active')
    ));

  // 6. Fetch recent rule logs
  const dbLogs = await db
    .select()
    .from(ruleLogs)
    .where(inArray(ruleLogs.adsAccountId, accountIds))
    .orderBy(desc(ruleLogs.executedAt))
    .limit(5);

  const mappedLogs = dbLogs.map(log => {
    let summaryStr = 'Tự động thực thi hành động tối ưu hóa chiến dịch.';
    if (log.metricsSnapshot && typeof log.metricsSnapshot === 'object') {
      const snapObj = log.metricsSnapshot as any;
      if (snapObj.reason) {
        summaryStr = String(snapObj.reason);
      } else if (snapObj.message) {
        summaryStr = String(snapObj.message);
      }
    }
    return {
      id: String(log.id),
      ruleName: log.ruleName || 'Hạ ngân sách bảo vệ tài khoản',
      actionType: log.actionType || 'pause_campaign',
      campaignName: log.campaignName || 'Chiến dịch',
      campaignId: log.campaignId || '',
      executedAtStr: log.executedAt ? new Date(log.executedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(log.executedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'Vừa xong',
      resultSummary: summaryStr
    };
  });

  // 7. Compute bottom tables campaign lists (Option 2 aligned)
  // Aggregate campaign snapshots by campaignId for the date range
  const campaignAgg: Record<string, {
    id: string;
    name: string;
    status: string;
    cost: number;
    convs: number;
    rev: number;
  }> = {};

  for (const snap of snapshots) {
    const cId = snap.campaignId;
    const cost = Number(snap.costMicros || 0) / 1000000;
    const convs = snap.realConversions || 0;
    const rev = Number(snap.realConversionValueSuccessMicros || 0) / 1000000;

    if (!campaignAgg[cId]) {
      campaignAgg[cId] = {
        id: cId,
        name: snap.name || "Chiến dịch không tên",
        status: snap.status || "PAUSED",
        cost: 0,
        convs: 0,
        rev: 0
      };
    }
    campaignAgg[cId].cost += cost;
    campaignAgg[cId].convs += convs;
    campaignAgg[cId].rev += rev;
    if (snap.status) {
      campaignAgg[cId].status = snap.status;
    }
  }

  const aggregatedCampaigns = Object.values(campaignAgg);

  // List A: Top Chiến Dịch Hiệu Quả Nhất
  const topEfficientCampaigns = aggregatedCampaigns
    .filter(c => c.convs > 0)
    .sort((a, b) => b.convs - a.convs)
    .slice(0, 5);

  // List B: Top Chiến Dịch Lãng Phí (Cảnh báo)
  const topWasteCampaigns = aggregatedCampaigns
    .filter(c => c.cost > 0 && c.convs === 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // List C: Top Chiến Dịch CPA cao (Cảnh báo)
  const topHighCpaCampaigns = aggregatedCampaigns
    .filter(c => c.cost > 0 && c.convs > 0)
    .map(c => ({
      ...c,
      cpa: c.cost / c.convs
    }))
    .sort((a, b) => b.cpa - a.cpa)
    .slice(0, 5);

  // Format visual dates range
  let showDateStr = "";
  const formatDateVN = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  if (dateParam === "today") {
    showDateStr = `Hôm nay (${formatDateVN(actualTodayDate)})`;
  } else if (dateParam === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    showDateStr = `Hôm qua (${formatDateVN(yesterdayStr)})`;
  } else if (dateParam === "7days") {
    showDateStr = `7 ngày qua (${formatDateVN(startDateStr)} - ${formatDateVN(endDateStr)})`;
  } else if (dateParam === "15days") {
    showDateStr = `15 ngày qua (${formatDateVN(startDateStr)} - ${formatDateVN(endDateStr)})`;
  } else if (dateParam === "30days") {
    showDateStr = `30 ngày qua (${formatDateVN(startDateStr)} - ${formatDateVN(endDateStr)})`;
  } else {
    showDateStr = formatDateVN(startDateStr);
  }

  return (
    <div className="w-full pb-10 space-y-6 font-sans">
      
      {/* Header controls & Filter dropdowns */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-1)] flex items-center gap-2">
            Bảng Điều Khiển Hệ Thống
          </h1>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Dữ liệu cập nhật mới nhất lúc: <span className="font-semibold text-[var(--text-2)]">{showDateStr} 21:10</span>
          </p>
        </div>

        {/* Dynamic Filters component */}
        <DashboardFilters 
          accounts={accounts}
          distinctDates={distinctDates}
          selectedAccountId={selectedAccountId}
          selectedDate={dateParam}
          actualTodayDate={actualTodayDate}
        />
      </div>

      {/* KPI Cards Grid - Real data populated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        
        {/* Card 1: Spend vs Daily Budget sum */}
        <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            <span>Chi tiêu ads / Ngân sách</span>
            <DollarSign className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2.5xl font-black text-[var(--text-1)] tracking-tight leading-none pt-1">
            {totalCost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
          </div>
          <div className="text-[10px] text-[var(--text-3)] pt-1 font-semibold leading-relaxed">
            Đã chi <span className="text-emerald-500 dark:text-emerald-400 font-bold">{budgetSpentPct.toFixed(1)}%</span> ngân sách ({monthlyBudgetGoal.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ)
          </div>
        </div>

        {/* Card 2: CRM conversions count */}
        <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            <span>Đơn hàng crm (Thực tế)</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2.5xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight leading-none pt-1">
            {totalCRMConvsSuccess} đơn
          </div>
          <div className="text-[10px] text-[var(--text-3)] pt-1 font-semibold leading-relaxed">
            Google báo cáo: <span className="font-bold text-[var(--text-2)]">{Math.round(totalGoogleConvs)} đơn</span>
          </div>
        </div>

        {/* Card 3: CPA vs ROAS */}
        <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            <span>CPA / ROAS (CRM thực tế)</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2.5xl font-black text-[var(--text-1)] tracking-tight leading-none pt-1">
            CPA {cpa.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
          </div>
          <div className="text-[10px] text-[var(--text-3)] pt-1 font-semibold leading-relaxed flex justify-between items-center">
            <span>Dựa trên đơn thực tế đối soát</span>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/25 font-bold">ROAS {roas.toFixed(2)}x</span>
          </div>
        </div>

        {/* Card 4: Net profit */}
        <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            <span>Lợi nhuận nét dự tính</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2.5xl font-black tracking-tight leading-none pt-1 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
          </div>
          <div className="text-[10px] text-[var(--text-3)] pt-1 font-semibold leading-relaxed">
            Doanh thu CRM: <span className="font-bold text-[var(--text-2)]">{totalCRMRevenue.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ</span>
          </div>
        </div>

      </div>

      {/* Main HUD Layout: Chart & Activity Log */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Real Dynamic Chart */}
        <div className="xl:col-span-2">
          <PerformanceChart data={chartData} rangeLabel={dateParam} />
        </div>

        {/* Recent Rules Logs */}
        <div className="xl:col-span-1">
          <AutomationActivityLog logs={mappedLogs} />
        </div>

      </div>

      {/* Bottom Campaign Grids (Requested specific sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Grid A: Top Chiến Dịch Hiệu Quả Nhất */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                🏆 Top Chiến Dịch Hiệu Quả Nhất
              </h2>
              <span className="text-[9px] text-[var(--text-3)] font-semibold">Đơn hàng nhiều nhất</span>
            </div>
            
            {topEfficientCampaigns.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-3)] text-xs font-medium">
                Không tìm thấy chiến dịch nào có đơn thực tế trong ngày {showDateStr}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)]/35 border-b border-[var(--border)] text-[var(--text-3)] font-bold">
                  <tr>
                    <th className="p-3.5">Chiến dịch</th>
                    <th className="p-3.5 text-right">Chi tiêu</th>
                    <th className="p-3.5 text-center">CRM Đơn</th>
                    <th className="p-3.5 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60">
                  {topEfficientCampaigns.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--bg-secondary)]/35 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-[var(--text-1)] text-xs flex items-center gap-1.5">
                          <span className="truncate max-w-[150px]" title={c.name}>{c.name}</span>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                            c.status === 'ENABLED' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          )}>
                            {c.status === 'ENABLED' ? 'Đang chạy' : 'Tạm dừng'}
                          </span>
                        </div>
                        <div className="text-[9px] text-[var(--text-3)] font-mono mt-0.5">ID: {c.id}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono text-[var(--text-2)]">
                        {c.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-extrabold font-mono">
                          {c.convs}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-500">
                        {c.rev.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Grid B: Top Chiến Dịch Lãng Phí (Cảnh báo) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                ⚠️ Top Chiến Dịch Lãng Phí (Cảnh báo)
              </h2>
              <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Tiêu tiền 0 đơn CRM</span>
            </div>
            
            {topWasteCampaigns.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-3)] text-xs font-medium">
                Chúc mừng! Không có chiến dịch lãng phí tiền cắn 0 đơn trong ngày {showDateStr}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)]/35 border-b border-[var(--border)] text-[var(--text-3)] font-bold">
                  <tr>
                    <th className="p-3.5">Chiến dịch</th>
                    <th className="p-3.5 text-right">Chi tiêu</th>
                    <th className="p-3.5 text-center">Đơn hàng</th>
                    <th className="p-3.5 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 font-medium">
                  {topWasteCampaigns.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--bg-secondary)]/35 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-[var(--text-1)] text-xs flex items-center gap-1.5">
                          <span className="truncate max-w-[150px]" title={c.name}>{c.name}</span>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                            c.status === 'ENABLED' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          )}>
                            {c.status === 'ENABLED' ? 'Đang chạy' : 'Tạm dừng'}
                          </span>
                        </div>
                        <div className="text-[9px] text-[var(--text-3)] font-mono mt-0.5">ID: {c.id}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono text-rose-500 font-bold">
                        {c.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                      </td>
                      <td className="p-3.5 text-center text-[var(--text-3)] font-mono font-semibold">
                        0.0
                      </td>
                      <td className="p-3.5 text-center">
                        <Link 
                          href={`/campaigns?id=${c.id}`}
                          className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-rose-500 hover:text-rose-500 rounded text-[10px] font-bold tracking-tight text-[var(--text-2)] transition duration-150"
                        >
                          XEM CHI TIẾT
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Grid C: Top Chiến Dịch CPA Cao (Cảnh báo) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                🚨 Top Chiến Dịch CPA cao (Cảnh báo)
              </h2>
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Tiêu tiền CPA cực cao</span>
            </div>
            
            {topHighCpaCampaigns.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-3)] text-xs font-medium">
                Không ghi nhận chiến dịch kém hiệu quả / CPA cao trong ngày {showDateStr}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)]/35 border-b border-[var(--border)] text-[var(--text-3)] font-bold">
                  <tr>
                    <th className="p-3.5">Chiến dịch</th>
                    <th className="p-3.5 text-right">Chi tiêu</th>
                    <th className="p-3.5 text-center">CPA / CRM Đơn</th>
                    <th className="p-3.5 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 font-medium">
                  {topHighCpaCampaigns.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--bg-secondary)]/35 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-[var(--text-1)] text-xs flex items-center gap-1.5">
                          <span className="truncate max-w-[200px]" title={c.name}>{c.name}</span>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                            c.status === 'ENABLED' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          )}>
                            {c.status === 'ENABLED' ? 'Đang chạy' : 'Tạm dừng'}
                          </span>
                        </div>
                        <div className="text-[9px] text-[var(--text-3)] font-mono mt-0.5">ID: {c.id}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono text-rose-500 font-bold">
                        {c.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-[var(--text-1)]">
                        {c.cpa.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ <span className="text-[10px] text-[var(--text-3)] font-medium">({c.convs} đơn)</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <Link 
                          href={`/campaigns?id=${c.id}`}
                          className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-amber-500 hover:text-amber-500 rounded text-[10px] font-bold tracking-tight text-[var(--text-2)] transition duration-150"
                        >
                          XEM CHI TIẾT
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Small Google Ads details widget */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-500 animate-pulse" />
              Tài khoản liên kết ({accounts.length})
            </h3>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">
              Các tài khoản Google Ads đang đối soát POS Pancake CRM.
            </p>
          </div>

          <div className="space-y-2.5">
            {accounts.map(acc => (
              <div key={acc.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-1)]">{acc.name || "Không rõ tên"}</h4>
                  <span className="text-[9px] text-[var(--text-3)] font-mono font-medium">{acc.customerId}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  Hoạt động
                </span>
              </div>
            ))}
          </div>

          <Link 
            href="/connections" 
            className="w-full py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-bold rounded-lg text-center block text-[var(--text-2)] transition"
          >
            Quản lý Kết nối
          </Link>
        </div>
      </div>

    </div>
  );
}
