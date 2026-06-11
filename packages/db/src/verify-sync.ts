import { db, revenueReports, revenueReportDaily } from "./index";
import { RevenueService } from "@repo/services";
import { eq, and } from "drizzle-orm";

async function main() {
  const reportId = "d361ef2e-c816-497a-8a66-3fa3b94d202d";
  console.log(`=== Starting Live Sync Verification for Report: ${reportId} ===`);

  try {
    const report = await db.query.revenueReports.findFirst({
      where: eq(revenueReports.id, reportId)
    });

    if (!report || !report.userId) {
      console.error("Report not found or has no userId");
      process.exit(1);
    }

    const userId = report.userId;
    console.log(`Matched Report User ID: ${userId}`);

    // Sync a few days of May 2026 to verify
    const testDates = ["2026-05-04", "2026-05-05", "2026-05-06"];
    for (const d of testDates) {
      console.log(`\n--- Syncing Live Data for ${d} ---`);
      await RevenueService.syncDailyRevenue(userId, reportId, d);
      
      const synced = await db.query.revenueReportDaily.findFirst({
        where: and(
          eq(revenueReportDaily.reportId, reportId),
          eq(revenueReportDaily.date, d)
        )
      });
      console.log(`Resulting P&L for ${d}:`, JSON.stringify(synced, null, 2));
    }

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
