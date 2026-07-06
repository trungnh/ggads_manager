import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, adsAccounts, userAdsAccounts, campaignSchedules, ruleLogs, campaignsSnapshot, revenueReports, revenueReportDaily, products } from "@repo/db";
import { eq, and, desc, lte, gte, inArray } from "drizzle-orm";
import { RevenueService } from "@repo/services";
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

function renderSparkline(values: number[], color: string = '#3B82F6') {
  if (!values || values.length < 2) {
    return (
      <div className="w-16 h-4 bg-muted/40 rounded animate-pulse" />
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const height = 16;
  const width = 80;
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg className="w-20 h-4 opacity-80" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; accountId?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
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

  // Fetch the latest updatedAt from campaignsSnapshot for this user's accounts
  const latestSnapshotUpdate = await db
    .select({ updatedAt: campaignsSnapshot.updatedAt })
    .from(campaignsSnapshot)
    .where(inArray(campaignsSnapshot.customerId, customerIds))
    .orderBy(desc(campaignsSnapshot.updatedAt))
    .limit(1);

  const lastUpdatedAt = latestSnapshotUpdate[0]?.updatedAt || null;

  // 2. Query distinct dates in the database for the date dropdown
  const distinctDatesResult = await db
    .selectDistinct({ date: campaignsSnapshot.date })
    .from(campaignsSnapshot)
    .where(inArray(campaignsSnapshot.customerId, customerIds))
    .orderBy(desc(campaignsSnapshot.date));

  const distinctDates = distinctDatesResult.map(d => d.date);

  const actualTodayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // "2026-06-01"
  const dateParam = resolvedSearchParams.date || "today";
  const selectedAccountId = resolvedSearchParams.accountId || "all";

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

  const selectedRangeDates = getDatesRange(startDateStr, endDateStr);

  // 1. Fetch user's revenue reports to match profit calculations
  const userReports = await db
    .select({
      id: revenueReports.id,
      productId: revenueReports.productId,
      rates: revenueReports.rates,
      month: revenueReports.month,
    })
    .from(revenueReports)
    .where(eq(revenueReports.userId, session.user.id));

  // Dynamically sync today's revenue reports to fetch the latest actual Pancake CRM values (including goodsCost)
  if (endDateStr === actualTodayDate && userReports.length > 0) {
    try {
      await Promise.allSettled(
        userReports.map(report => 
          RevenueService.syncDailyRevenue(session.user.id, report.id, actualTodayDate)
        )
      );
    } catch (syncErr) {
      console.error("[DASHBOARD] Failed dynamic syncDailyRevenue for today:", syncErr);
    }
  }

  let selectedRangeReports: any[] = [];
  if (userReports.length > 0) {
    const reportIds = userReports.map(r => r.id);
    selectedRangeReports = await db
      .select({
        orders: revenueReportDaily.orders,
        revenueMicros: revenueReportDaily.revenueMicros,
        adsCostMicros: revenueReportDaily.adsCostMicros,
        profitMicros: revenueReportDaily.profitMicros,
        date: revenueReportDaily.date,
      })
      .from(revenueReportDaily)
      .where(and(
        inArray(revenueReportDaily.reportId, reportIds),
        gte(revenueReportDaily.date, startDateStr),
        lte(revenueReportDaily.date, endDateStr)
      ));
  }

  const formatDateStr = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof dateVal === 'string') {
      return dateVal.split('T')[0];
    }
    return String(dateVal);
  };

  // Fetch products and match rates to support real-time dynamic profit math
  const userProducts = await db
    .select()
    .from(products)
    .where(eq(products.userId, session.user.id));

  const matchProduct = (snapName: string) => {
    if (!snapName) return null;
    const sortedProducts = [...userProducts]
      .filter(p => p.keywordCampaign)
      .sort((a, b) => (b.keywordCampaign?.trim().length || 0) - (a.keywordCampaign?.trim().length || 0));

    return sortedProducts.find(p => 
      snapName.toLowerCase().includes(p.keywordCampaign!.trim().toLowerCase())
    );
  };

  const calculateDynamicProfit = (snapName: string, adsCost: number, orders: number, revenue: number, snapDateStr: string) => {
    // PHP Controller Defaults
    let importPrice = 0;
    let shippingFee = 30000; // Mặc định 30,000 VND
    let returnRate = 0.10;   // Mặc định 10%

    const monthStr = snapDateStr ? snapDateStr.substring(0, 7) : new Date().toISOString().substring(0, 7);

    const prod = matchProduct(snapName);
    if (prod) {
      // Find matching report for this product to read customized rates for this specific month
      const report = userReports.find(r => r.productId === prod.id && r.month === monthStr);
      if (report && report.rates) {
        const r = report.rates as any;
        importPrice = r.importPrice !== undefined ? Number(r.importPrice) : Number(prod.importPriceMicros || 0) / 1000000;
        shippingFee = r.shippingFee !== undefined ? Number(r.shippingFee) : Number(prod.shippingFee || 0) / 1000000;
        returnRate = r.returnRate !== undefined ? Number(r.returnRate) : Number(prod.returnRate || 0);
      } else {
        importPrice = Number(prod.importPriceMicros || 0) / 1000000;
        shippingFee = Number(prod.shippingFee || 0) / 1000000;
        returnRate = Number(prod.returnRate || 0);
      }
    }

    // Tính Chi phí nhập hàng (Goods Cost) - Replicating PHP COGS logic
    let goodsCost = 0;
    if (importPrice > 0) {
      goodsCost = orders * importPrice;
    } else {
      goodsCost = revenue * 0.35; // Fallback COGS trung bình 35% doanh thu
    }

    // Tính Chi phí hoàn hàng thực tế (Southeast Asia logistics formula)
    let returnCost = ((revenue - goodsCost) * returnRate) + (orders * returnRate * (shippingFee / 2));
    if (returnCost < 0) {
      returnCost = 0;
    }

    // Taxes & Fees
    const adsTaxRate = 0.10;      // TAX_ADS env default 0.10
    const paymentFeeRate = 0.012; // FEE_PAYMENT env default 0.012
    const incomeTaxRate = 0.015;  // TAX_INCOME env default 0.015
    const shipCost = orders * shippingFee;

    const totalCost = goodsCost 
      + shipCost 
      + returnCost 
      + adsCost 
      + (adsCost * adsTaxRate) 
      + (adsCost * paymentFeeRate) 
      + (revenue * incomeTaxRate);

    return revenue - totalCost;
  };

  // 2. Sum up total metrics over selected range, prioritizing report statistics
  let totalCost = 0;
  let totalCRMConvsSuccess = 0;
  let totalCRMRevenue = 0;
  let netProfit = 0;
  let totalGoogleConvs = 0;
  let totalBudgetMicros = 0n;

  for (const snap of snapshots) {
    totalBudgetMicros += BigInt(snap.budgetMicros || "0");
    totalGoogleConvs += parseFloat(snap.googleConversions || "0");
  }

  for (const dateStr of selectedRangeDates) {
    const reportRows = selectedRangeReports.filter(d => formatDateStr(d.date) === dateStr);
    const reportRevSum = reportRows.reduce((sum, r) => sum + Number(r.revenueMicros || 0), 0);

    if (reportRows.length > 0 && reportRevSum > 0) {
      for (const r of reportRows) {
        totalCost += Number(r.adsCostMicros || 0) / 1000000;
        totalCRMConvsSuccess += r.orders || 0;
        totalCRMRevenue += Number(r.revenueMicros || 0) / 1000000;
        netProfit += Number(r.profitMicros || 0) / 1000000;
      }
    } else {
      const snaps = snapshots.filter(s => formatDateStr(s.date) === dateStr);
      let dayCost = 0;
      let dayConvs = 0;
      let dayRev = 0;
      let dayProfit = 0;

      for (const s of snaps) {
        const adsCost = Number(s.costMicros || 0) / 1000000;
        const orders = s.realConversions || 0;
        const revenue = Number(s.realConversionValueSuccessMicros || 0) / 1000000;

        dayCost += adsCost;
        dayConvs += orders;
        dayRev += revenue;
        dayProfit += calculateDynamicProfit(s.name || "", adsCost, orders, revenue, formatDateStr(s.date));
      }
      totalCost += dayCost;
      totalCRMConvsSuccess += dayConvs;
      totalCRMRevenue += dayRev;
      netProfit += dayProfit;
    }
  }

  const totalBudget = Number(totalBudgetMicros) / 1000000;
  const cpa = totalCRMConvsSuccess > 0 ? totalCost / totalCRMConvsSuccess : 0;
  const roas = totalCost > 0 ? totalCRMRevenue / totalCost : 0;

  // Monthly theoretical budget projection (Daily budgets sum * 30 days)
  const monthlyBudgetGoal = totalBudget * 30;
  const budgetSpentPct = monthlyBudgetGoal > 0 ? (totalCost / monthlyBudgetGoal) * 100 : 0;

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

    let chartReportsData: any[] = [];
    if (userReports.length > 0) {
      const reportIds = userReports.map(r => r.id);
      chartReportsData = await db
        .select({
          orders: revenueReportDaily.orders,
          revenueMicros: revenueReportDaily.revenueMicros,
          adsCostMicros: revenueReportDaily.adsCostMicros,
          profitMicros: revenueReportDaily.profitMicros,
          date: revenueReportDaily.date,
        })
        .from(revenueReportDaily)
        .where(and(
          inArray(revenueReportDaily.reportId, reportIds),
          inArray(revenueReportDaily.date, chartDates)
        ));
    }

    chartData = chartDates.map(dateStr => {
      const reportRows = chartReportsData.filter(d => formatDateStr(d.date) === dateStr);
      const reportRevSum = reportRows.reduce((sum, r) => sum + Number(r.revenueMicros || 0), 0);

      let costSum = 0;
      let convsSum = 0;
      let revSum = 0;
      let profitSum = 0;

      if (reportRows.length > 0 && reportRevSum > 0) {
        for (const r of reportRows) {
          costSum += Number(r.adsCostMicros || 0) / 1000000;
          convsSum += r.orders || 0;
          revSum += Number(r.revenueMicros || 0) / 1000000;
          profitSum += Number(r.profitMicros || 0) / 1000000;
        }
      } else {
        const snaps = chartSnaps.filter(s => formatDateStr(s.date) === dateStr);
        for (const s of snaps) {
          const adsCost = Number(s.costMicros || 0) / 1000000;
          const orders = s.realConversions || 0;
          const revenue = Number(s.realConversionValueSuccessMicros || 0) / 1000000;

          costSum += adsCost;
          convsSum += orders;
          revSum += revenue;
          profitSum += calculateDynamicProfit(s.name || "", adsCost, orders, revenue, dateStr);
        }
      }

      const roasVal = costSum > 0 ? Number((revSum / costSum).toFixed(2)) : 0;
      const [y, m, d] = dateStr.split('-');

      return {
        date: `${d}/${m}`,
        cost: costSum,
        leads: convsSum,
        roas: roasVal,
        rev: revSum,
        profit: profitSum
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
    customerId: string;
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
        rev: 0,
        customerId: snap.customerId || ""
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

  // Aggregate account statistics from snapshots
  const accountStatsMap: Record<string, {
    customerId: string;
    name: string;
    cost: number;
    convs: number;
    rev: number;
  }> = {};

  for (const acc of accounts) {
    accountStatsMap[acc.customerId] = {
      customerId: acc.customerId,
      name: acc.name || "Tài khoản không tên",
      cost: 0,
      convs: 0,
      rev: 0
    };
  }

  for (const snap of snapshots) {
    const cId = snap.customerId;
    if (accountStatsMap[cId]) {
      const cost = Number(snap.costMicros || 0) / 1000000;
      const convs = snap.realConversions || 0;
      const rev = Number(snap.realConversionValueSuccessMicros || 0) / 1000000;

      accountStatsMap[cId].cost += cost;
      accountStatsMap[cId].convs += convs;
      accountStatsMap[cId].rev += rev;
    }
  }

  const accountStatsList = Object.values(accountStatsMap);

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

  // Format last updated time
  let lastUpdatedStr = "Chưa có dữ liệu";
  if (lastUpdatedAt) {
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(lastUpdatedAt);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const day = partMap.day;
    const month = partMap.month;
    const year = partMap.year;
    const hour = partMap.hour;
    const minute = partMap.minute;

    const dateStr = `${year}-${month}-${day}`;

    // Get current date and yesterday in Asia/Ho_Chi_Minh
    const now = new Date();
    const nowParts = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const nowPartMap = Object.fromEntries(nowParts.map(p => [p.type, p.value]));
    const todayStr = `${nowPartMap.year}-${nowPartMap.month}-${nowPartMap.day}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayParts = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(yesterday);
    const yesterdayPartMap = Object.fromEntries(yesterdayParts.map(p => [p.type, p.value]));
    const yesterdayStr = `${yesterdayPartMap.year}-${yesterdayPartMap.month}-${yesterdayPartMap.day}`;

    if (dateStr === todayStr) {
      lastUpdatedStr = `Hôm nay (${day}/${month}/${year}) ${hour}:${minute}`;
    } else if (dateStr === yesterdayStr) {
      lastUpdatedStr = `Hôm qua (${day}/${month}/${year}) ${hour}:${minute}`;
    } else {
      lastUpdatedStr = `${day}/${month}/${year} ${hour}:${minute}`;
    }
  }

  return (
    <div className="w-full pb-10 space-y-6 font-sans">
      
      {/* Header controls & Filter dropdowns */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-[var(--radius)] border border-border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Bảng Điều Khiển Hệ Thống
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Dữ liệu cập nhật mới nhất lúc: <span className="font-semibold text-foreground">{lastUpdatedStr}</span>
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

      {/* KPI Global Stats Panel - Rebranded to Etraverse Central Admin */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold text-foreground uppercase tracking-widest opacity-80">
            CHỈ SỐ HỆ THỐNG (GLOBAL STATS)
          </span>
          <div className="flex gap-1.5 bg-secondary/50 p-1 rounded-lg border border-border">
            {['7D', '15D', '30D'].map((range) => {
              const isActive = (range === '7D' && dateParam === '7days') ||
                               (range === '15D' && dateParam === '15days') ||
                               (range === '30D' && dateParam === '30days') ||
                               (range === '7D' && (dateParam === 'today' || dateParam === 'yesterday'));
              return (
                <span 
                  key={range}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {range}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Column 1: Cost */}
          <div className="flex flex-col justify-between pt-4 md:pt-0 md:pl-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Chi tiêu / Ngân sách</span>
              <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                {budgetSpentPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-foreground tracking-tight">
              {totalCost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">Mục tiêu: {monthlyBudgetGoal.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ</span>
              {renderSparkline(chartData.map(d => d.cost), '#3B82F6')}
            </div>
          </div>

          {/* Column 2: Conversions */}
          <div className="flex flex-col justify-between pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Đơn hàng CRM</span>
              <span className="text-[9px] font-extrabold text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded-full border border-sky-500/20">
                Thành công
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-foreground tracking-tight text-emerald-500 dark:text-emerald-400">
              {totalCRMConvsSuccess} đơn
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">GG báo cáo: {Math.round(totalGoogleConvs)}</span>
              {renderSparkline(chartData.map(d => d.leads), '#10B981')}
            </div>
          </div>

          {/* Column 3: CPA */}
          <div className="flex flex-col justify-between pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">CPA thực tế</span>
              <span className={cn(
                "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border",
                cpa > 100000 ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              )}>
                CPA
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-foreground tracking-tight">
              {cpa.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">Mỗi đơn CRM</span>
              {renderSparkline(chartData.map(d => d.leads > 0 ? d.cost / d.leads : 0), '#F59E0B')}
            </div>
          </div>

          {/* Column 4: Revenue */}
          <div className="flex flex-col justify-between pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Doanh thu CRM</span>
              <span className="text-[9px] font-extrabold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                Pancake
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-foreground tracking-tight">
              {totalCRMRevenue.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">Doanh số thực tế</span>
              {renderSparkline(chartData.map(d => d.rev), '#6366F1')}
            </div>
          </div>

          {/* Column 5: Net Profit */}
          <div className="flex flex-col justify-between pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Lợi nhuận ròng</span>
              <span className={cn(
                "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border",
                netProfit >= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
              )}>
                Net Profit
              </span>
            </div>
            <div className={cn(
              "mt-2 text-2xl font-black tracking-tight",
              netProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
            )}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">Cắt lỗ / Lợi nhuận</span>
              {renderSparkline(chartData.map(d => d.profit), netProfit >= 0 ? '#10B981' : '#F43F5E')}
            </div>
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

      {/* Account Breakdown Table - Etraverse Central Admin Style */}
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            📊 HIỆU SUẤT CHI TIẾT TỪNG TÀI KHOẢN
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold">
            Tổng số: {accountStatsList.length} tài khoản
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold font-sans">
              <tr>
                <th className="p-4 pl-5">Tài khoản</th>
                <th className="p-4 text-right">Chi tiêu</th>
                <th className="p-4 text-center">CRM Đơn</th>
                <th className="p-4 text-right">CPA</th>
                <th className="p-4 text-center">ROAS</th>
                <th className="p-4 text-right pr-5">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {accountStatsList.map(acc => {
                const cpaVal = acc.convs > 0 ? acc.cost / acc.convs : 0;
                const roasVal = acc.cost > 0 ? acc.rev / acc.cost : 0;

                return (
                  <tr key={acc.customerId} className="hover:bg-muted/10 transition duration-150">
                    <td className="p-4 pl-5">
                      <Link 
                        href={`/campaigns/${acc.customerId}`}
                        className="font-bold text-foreground hover:text-primary transition flex flex-col gap-0.5"
                      >
                        <span>{acc.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono font-medium">ID: {acc.customerId}</span>
                      </Link>
                    </td>
                    <td className="p-4 text-right font-mono text-foreground font-medium">
                      {acc.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md font-extrabold font-mono text-[10px]">
                        {acc.convs} đơn
                      </span>
                    </td>
                    <td className={cn(
                      "p-4 text-right font-mono font-semibold",
                      cpaVal > 100000 ? "text-rose-500" : "text-[var(--text-1)]"
                    )}>
                      {cpaVal > 0 ? `${Math.round(cpaVal).toLocaleString("vi-VN")}đ` : "—"}
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded border font-bold text-xs font-mono",
                        roasVal >= 2 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : roasVal > 0 
                            ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                            : "bg-muted text-muted-foreground border-border"
                      )}>
                        {roasVal > 0 ? `${roasVal.toFixed(2)}x` : "0.00x"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-500 pr-5">
                      {acc.rev.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Campaign Grids (Requested specific sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Grid A: Top Chiến Dịch Hiệu Quả Nhất */}
        <div className="bg-card text-card-foreground border border-border rounded-[var(--radius)] overflow-hidden shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="p-4 bg-muted/40 border-b border-border flex justify-between items-center">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                🏆 Top Chiến Dịch Hiệu Quả Nhất
              </h2>
              <span className="text-[10px] text-muted-foreground font-semibold">Đơn hàng nhiều nhất</span>
            </div>
            
            {topEfficientCampaigns.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground text-xs font-medium">
                Không tìm thấy chiến dịch nào có đơn thực tế trong ngày {showDateStr}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/20 border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="p-3.5 pl-5">Chiến dịch</th>
                      <th className="p-3.5 text-right">Chi tiêu</th>
                      <th className="p-3.5 text-center">CRM Đơn</th>
                      <th className="p-3.5 text-right pr-5">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {topEfficientCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-muted/10 transition duration-150">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-foreground text-xs flex items-center gap-1.5 flex-wrap">
                            <Link 
                              href={`/campaigns/${c.customerId}?id=${c.id}`}
                              className="truncate max-w-[150px] hover:text-primary transition"
                              title={c.name}
                            >
                              {c.name}
                            </Link>
                            <span className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                              c.status === 'ENABLED' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            )}>
                              {c.status === 'ENABLED' ? 'Đang chạy' : 'Tạm dừng'}
                            </span>
                          </div>
                          <div className="text-[9px] text-muted-foreground font-mono mt-0.5">ID: {c.id}</div>
                        </td>
                        <td className="p-3.5 text-right font-mono text-foreground font-medium">
                          {c.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md font-extrabold font-mono text-[10px]">
                            {c.convs}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-500 pr-5">
                          {c.rev.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Grid B: Top Chiến Dịch Lãng Phí (Cảnh báo) */}
        <div className="bg-card text-card-foreground border border-border rounded-[var(--radius)] overflow-hidden shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="p-4 bg-muted/40 border-b border-border flex justify-between items-center">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                ⚠️ Top Chiến Dịch Lãng Phí (Cảnh báo)
              </h2>
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Tiêu tiền 0 đơn CRM</span>
            </div>
            
            {topWasteCampaigns.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground text-xs font-medium">
                Chúc mừng! Không có chiến dịch lãng phí tiền cắn 0 đơn trong ngày {showDateStr}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/20 border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="p-3.5 pl-5">Chiến dịch</th>
                      <th className="p-3.5 text-right">Chi tiêu</th>
                      <th className="p-3.5 text-center">Đơn hàng</th>
                      <th className="p-3.5 text-center pr-5">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {topWasteCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-muted/10 transition duration-150">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-foreground text-xs flex items-center gap-1.5 flex-wrap">
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
                          <div className="text-[9px] text-muted-foreground font-mono mt-0.5">ID: {c.id}</div>
                        </td>
                        <td className="p-3.5 text-right font-mono text-rose-500 font-bold">
                          {c.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                        </td>
                        <td className="p-3.5 text-center text-muted-foreground font-mono font-semibold">
                          0
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <Link 
                            href={`/campaigns/${c.customerId}?id=${c.id}`}
                            className="inline-flex items-center justify-center px-3 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-rose-500 hover:text-rose-500 rounded-md text-[10px] font-bold tracking-tight transition duration-150"
                          >
                            XEM CHI TIẾT
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid C: Top Chiến Dịch CPA Cao (Cảnh báo) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="lg:col-span-2 bg-card text-card-foreground border border-border rounded-[var(--radius)] overflow-hidden shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="p-4 bg-muted/40 border-b border-border flex justify-between items-center">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                🚨 Top Chiến Dịch CPA cao (Cảnh báo)
              </h2>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Tiêu tiền CPA cực cao</span>
            </div>
            
            {topHighCpaCampaigns.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground text-xs font-medium">
                Không ghi nhận chiến dịch kém hiệu quả / CPA cao trong ngày {showDateStr}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/20 border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="p-3.5 pl-5">Chiến dịch</th>
                      <th className="p-3.5 text-right">Chi tiêu</th>
                      <th className="p-3.5 text-center">CPA / CRM Đơn</th>
                      <th className="p-3.5 text-center pr-5">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {topHighCpaCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-muted/10 transition duration-150">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-foreground text-xs flex items-center gap-1.5 flex-wrap">
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
                          <div className="text-[9px] text-muted-foreground font-mono mt-0.5">ID: {c.id}</div>
                        </td>
                        <td className="p-3.5 text-right font-mono text-rose-500 font-bold">
                          {c.cost.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ
                        </td>
                        <td className={cn(
                          "p-3.5 text-center font-mono font-bold",
                          c.cpa > 100000 ? "text-rose-500" : "text-foreground"
                        )}>
                          {c.cpa.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ <span className="text-[10px] text-muted-foreground font-medium">({c.convs} đơn)</span>
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <Link 
                            href={`/campaigns/${c.customerId}?id=${c.id}`}
                            className="inline-flex items-center justify-center px-3 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-amber-500 hover:text-amber-500 rounded-md text-[10px] font-bold tracking-tight transition duration-150"
                          >
                            XEM CHI TIẾT
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Small Google Ads details widget */}
        <div className="bg-card text-card-foreground border border-border rounded-[var(--radius)] p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500 animate-pulse" />
                Tài khoản liên kết ({accounts.length})
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Các tài khoản Google Ads đang đối soát POS Pancake CRM.
              </p>
            </div>

            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
              {accounts.map(acc => (
                <div key={acc.id} className="p-3 bg-muted/30 border border-border rounded-[calc(var(--radius)*0.8)] flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{acc.name || "Không rõ tên"}</h4>
                    <span className="text-[9px] text-muted-foreground font-mono font-medium">{acc.customerId}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Hoạt động
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link 
            href="/connections" 
            className="w-full mt-4 py-2.5 bg-muted hover:bg-muted/80 border border-border hover:border-primary text-xs font-bold rounded-lg text-center block text-foreground transition duration-150"
          >
            Quản lý Kết nối
          </Link>
        </div>
      </div>

    </div>
  );
}
