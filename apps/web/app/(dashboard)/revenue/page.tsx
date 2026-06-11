import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, revenueReports, revenueReportDaily, products } from "@repo/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import RevenuePageClient from "./RevenuePageClient";

export default async function RevenuePage({
  searchParams
}: {
  searchParams: Promise<{
    month?: string;
    product_id?: string;
    report_by_time?: string;
    start_month?: string;
    end_month?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 1. Parse active filters
  const filterMonth = params.month || "";
  const filterProductId = params.product_id || "";
  const reportByTime = params.report_by_time === "true";
  const filterStartMonth = params.start_month || "";
  const filterEndMonth = params.end_month || "";

  // 2. Fetch user products
  const userProducts = await db
    .select({
      id: products.id,
      name: products.name,
      code: products.code
    })
    .from(products)
    .where(eq(products.userId, session.user.id))
    .orderBy(products.name);

  // 3. Setup query filters
  const filters = [];
  if (filterProductId) {
    filters.push(eq(revenueReports.productId, filterProductId));
  }

  if (reportByTime) {
    if (filterStartMonth && filterEndMonth) {
      filters.push(
        and(
          gte(revenueReports.month, filterStartMonth),
          lte(revenueReports.month, filterEndMonth)
        )
      );
    }
  } else {
    if (filterMonth) {
      filters.push(eq(revenueReports.month, filterMonth));
    }
  }

  // 4. Query report headers
  const reportsData = await db
    .select({
      id: revenueReports.id,
      name: revenueReports.name,
      month: revenueReports.month,
      productId: revenueReports.productId,
      createdAt: revenueReports.createdAt,
      productName: products.name,
      productCode: products.code,
    })
    .from(revenueReports)
    .leftJoin(products, eq(revenueReports.productId, products.id))
    .where(and(eq(revenueReports.userId, session.user.id), ...filters))
    .orderBy(revenueReports.month);

  // 5. Aggregate daily totals for listed reports
  let reportsWithTotals: any[] = [];
  if (reportsData.length > 0) {
    const reportIds = reportsData.map(r => r.id);
    const dailyData = await db
      .select()
      .from(revenueReportDaily)
      .where(inArray(revenueReportDaily.reportId, reportIds));

    reportsWithTotals = reportsData.map(r => {
      const rows = dailyData.filter(d => d.reportId === r.id);
      const totalOrders = rows.reduce((sum, row) => sum + (row.orders || 0), 0);
      const totalRevenueMicros = rows.reduce((sum, row) => sum + Number(row.revenueMicros || 0), 0);
      const totalAdsCostMicros = rows.reduce((sum, row) => sum + Number(row.adsCostMicros || 0), 0);
      const totalProfitMicros = rows.reduce((sum, row) => sum + Number(row.profitMicros || 0), 0);

      return {
        ...r,
        totalOrders,
        totalRevenue: totalRevenueMicros / 1000000,
        totalAdsCost: totalAdsCostMicros / 1000000,
        totalProfit: totalProfitMicros / 1000000,
      };
    });
  }

  return (
    <div className="p-0">
      <RevenuePageClient 
        reports={reportsWithTotals}
        products={userProducts}
        initialFilters={{
          month: filterMonth,
          productId: filterProductId,
          reportByTime,
          startMonth: filterStartMonth,
          endMonth: filterEndMonth
        }}
      />
    </div>
  );
}
