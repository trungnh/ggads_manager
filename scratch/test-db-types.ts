import { db, campaignsSnapshot, revenueReportDaily, revenueReports } from "@repo/db";
import { eq, gte, lte, and } from "drizzle-orm";

async function main() {
  console.log("Checking DB types...");

  try {
    const start = "2026-06-29";
    const end = "2026-07-05";

    // 1. Fetch campaignsSnapshot
    const snaps = await db.select({
      id: campaignsSnapshot.id,
      date: campaignsSnapshot.date,
      cost: campaignsSnapshot.costMicros,
    })
    .from(campaignsSnapshot)
    .where(and(
      gte(campaignsSnapshot.date, start),
      lte(campaignsSnapshot.date, end)
    ))
    .limit(3);

    console.log("Campaigns snapshots:", snaps.map(s => ({
      id: s.id,
      date: s.date,
      dateType: typeof s.date,
      cost: s.cost
    })));

    // 2. Fetch revenueReportDaily
    const reports = await db.select({
      id: revenueReportDaily.id,
      date: revenueReportDaily.date,
    })
    .from(revenueReportDaily)
    .limit(3);

    console.log("Revenue reports daily:", reports.map(r => ({
      id: r.id,
      date: r.date,
      dateType: typeof r.date,
      dateIsDateInstance: r.date instanceof Date,
      dateString: r.date ? r.date.toString() : null
    })));

  } catch (error) {
    console.error("Test failed:", error);
  }
}

main().then(() => process.exit(0));
