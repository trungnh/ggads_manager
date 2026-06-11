import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, revenueReports, revenueReportDaily } from "@repo/db";
import { eq, and, inArray } from "drizzle-orm";
import RevenueOverviewClient from "./RevenueOverviewClient";

export default async function RevenueOverviewPage({
  searchParams
}: {
  searchParams: Promise<{
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Get active month, fallback to today's local month (Asia/Ho_Chi_Minh)
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' });
  const currentMonth = formatter.format(now); // 'YYYY-MM'
  const filterMonth = params.month || currentMonth;

  // 1. Get reports of the selected month
  const reports = await db
    .select({ id: revenueReports.id })
    .from(revenueReports)
    .where(
      and(
        eq(revenueReports.userId, session.user.id),
        eq(revenueReports.month, filterMonth)
      )
    );

  // 2. Fetch and aggregate daily statistics for the active month
  let dailyAggregates: any[] = [];
  let currTotals = { orders: 0, revenue: 0, adsCost: 0, profit: 0 };

  if (reports.length > 0) {
    const reportIds = reports.map(r => r.id);
    const dailyData = await db
      .select()
      .from(revenueReportDaily)
      .where(inArray(revenueReportDaily.reportId, reportIds));

    // Group daily metrics by date
    const dateMap = new Map<string, any>();
    for (const d of dailyData) {
      if (!dateMap.has(d.date)) {
        dateMap.set(d.date, {
          date: d.date,
          orders: 0,
          quantity: 0,
          revenueMicros: BigInt(0),
          adsCostMicros: BigInt(0),
          shipCostMicros: BigInt(0),
          goodsCostMicros: BigInt(0),
          profitMicros: BigInt(0),
        });
      }
      const existing = dateMap.get(d.date);
      existing.orders += d.orders || 0;
      existing.quantity += d.quantity || 0;
      existing.revenueMicros += BigInt(d.revenueMicros || "0");
      existing.adsCostMicros += BigInt(d.adsCostMicros || "0");
      existing.shipCostMicros += BigInt(d.shipCostMicros || "0");
      existing.goodsCostMicros += BigInt(d.goodsCostMicros || "0");
      existing.profitMicros += BigInt(d.profitMicros || "0");
    }

    dailyAggregates = Array.from(dateMap.values()).map(d => {
      const revenue = Number(d.revenueMicros) / 1000000;
      const adsCost = Number(d.adsCostMicros) / 1000000;
      const shipCost = Number(d.shipCostMicros) / 1000000;
      const goodsCost = Number(d.goodsCostMicros) / 1000000;
      const profit = Number(d.profitMicros) / 1000000;
      
      const totalCost = revenue - profit;
      let returnCost = totalCost - goodsCost - shipCost - adsCost;
      if (returnCost < 0) returnCost = 0;

      return {
        date: d.date,
        orders: d.orders,
        quantity: d.quantity,
        revenue,
        adsCost,
        shipCost,
        goodsCost,
        returnCost,
        totalCost,
        profit
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate current totals
    currTotals = dailyAggregates.reduce((acc, row) => {
      acc.orders += row.orders;
      acc.revenue += row.revenue;
      acc.adsCost += row.adsCost;
      acc.profit += row.profit;
      return acc;
    }, { orders: 0, revenue: 0, adsCost: 0, profit: 0 });
  }

  // 3. Compute growth comparison by querying previous month's aggregates
  const [yStr, mStr] = filterMonth.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  let prevYear = y;
  let prevMonth = m - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const prevReports = await db
    .select({ id: revenueReports.id })
    .from(revenueReports)
    .where(
      and(
        eq(revenueReports.userId, session.user.id),
        eq(revenueReports.month, prevMonthStr)
      )
    );

  let prevTotals = { orders: 0, revenue: 0, adsCost: 0, profit: 0 };
  if (prevReports.length > 0) {
    const prevReportIds = prevReports.map(r => r.id);
    const prevDailyData = await db
      .select()
      .from(revenueReportDaily)
      .where(inArray(revenueReportDaily.reportId, prevReportIds));

    const totalOrders = prevDailyData.reduce((sum, row) => sum + (row.orders || 0), 0);
    const totalRevenueMicros = prevDailyData.reduce((sum, row) => sum + Number(row.revenueMicros || 0), 0);
    const totalAdsCostMicros = prevDailyData.reduce((sum, row) => sum + Number(row.adsCostMicros || 0), 0);
    const totalProfitMicros = prevDailyData.reduce((sum, row) => sum + Number(row.profitMicros || 0), 0);

    prevTotals = {
      orders: totalOrders,
      revenue: totalRevenueMicros / 1000000,
      adsCost: totalAdsCostMicros / 1000000,
      profit: totalProfitMicros / 1000000,
    };
  }

  // 4. Calculate comparative growth percentage
  const calculateGrowth = (current: number, previous: number) => {
    if (previous <= 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const comparison = {
    orders: calculateGrowth(currTotals.orders, prevTotals.orders),
    revenue: calculateGrowth(currTotals.revenue, prevTotals.revenue),
    adsCost: calculateGrowth(currTotals.adsCost, prevTotals.adsCost),
    profit: calculateGrowth(currTotals.profit, prevTotals.profit),
  };

  return (
    <RevenueOverviewClient 
      dailyData={dailyAggregates}
      totals={currTotals}
      comparison={comparison}
      filterMonth={filterMonth}
    />
  );
}
