import { db, revenueReportDaily } from "./index";
import { eq, and } from "drizzle-orm";

async function main() {
  const reportId = "d361ef2e-c816-497a-8a66-3fa3b94d202d";
  try {
    const dailyData = await db.select({
      date: revenueReportDaily.date,
      adsCostMicros: revenueReportDaily.adsCostMicros,
      orders: revenueReportDaily.orders,
      revenueMicros: revenueReportDaily.revenueMicros,
      shipCostMicros: revenueReportDaily.shipCostMicros,
      goodsCostMicros: revenueReportDaily.goodsCostMicros,
      profitMicros: revenueReportDaily.profitMicros
    })
    .from(revenueReportDaily)
    .where(eq(revenueReportDaily.reportId, reportId))
    .orderBy(revenueReportDaily.date);

    console.log("=== DAILY P&L ENTRIES AFTER FIX ===");
    console.table(dailyData);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
