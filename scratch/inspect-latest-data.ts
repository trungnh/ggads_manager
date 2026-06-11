import { db, campaignsSnapshot } from "../packages/db/src";
import { desc, eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.resolve(__dirname, "../apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(["']?)(.*?)\1\s*$/);
      if (match) {
        process.env.DATABASE_URL = match[2];
        break;
      }
    }
  }
}

async function main() {
  loadEnv();
  
  // Find distinct dates in the DB
  const distinctDates = await db.selectDistinct({
    date: campaignsSnapshot.date
  })
  .from(campaignsSnapshot)
  .orderBy(desc(campaignsSnapshot.date))
  .limit(10);
  
  console.log("Latest dates in campaignsSnapshot:", distinctDates.map(d => d.date));

  if (distinctDates.length === 0) {
    console.log("No snapshots found in DB.");
    process.exit(0);
  }

  const latestDate = distinctDates[0].date;
  console.log(`\nAggregating metrics for the latest date: ${latestDate}...`);

  const latestSnaps = await db.select()
    .from(campaignsSnapshot)
    .where(eq(campaignsSnapshot.date, latestDate));

  let totalCostMicros = 0n;
  let totalBudgetMicros = 0n;
  let totalCRMConvs = 0;
  let totalCRMConvsSuccess = 0;
  let totalCRMRevenueMicros = 0n;
  let totalCRMRevenueSuccessMicros = 0n;
  let totalGoogleConvs = 0;

  for (const snap of latestSnaps) {
    totalCostMicros += BigInt(snap.costMicros || "0");
    totalBudgetMicros += BigInt(snap.budgetMicros || "0");
    totalCRMConvs += snap.realConversions || 0;
    totalCRMConvsSuccess += snap.realConversionsSuccess || 0;
    totalCRMRevenueMicros += BigInt(snap.realConversionValueMicros || "0");
    totalCRMRevenueSuccessMicros += BigInt(snap.realConversionValueSuccessMicros || "0");
    totalGoogleConvs += parseFloat(snap.googleConversions || "0");
  }

  const totalCost = Number(totalCostMicros) / 1000000;
  const totalBudget = Number(totalBudgetMicros) / 1000000;
  const totalCRMRevenue = Number(totalCRMRevenueSuccessMicros) / 1000000;
  const cpa = totalCRMConvsSuccess > 0 ? totalCost / totalCRMConvsSuccess : 0;
  const roas = totalCost > 0 ? totalCRMRevenue / totalCost : 0;
  const netProfit = totalCRMRevenue - totalCost;

  console.log(`  Campaign Count: ${latestSnaps.length}`);
  console.log(`  Total Spend: ${totalCost.toLocaleString("vi-VN")} đ`);
  console.log(`  Total Daily Budget: ${totalBudget.toLocaleString("vi-VN")} đ`);
  console.log(`  Total CRM Conversions (Success): ${totalCRMConvsSuccess} đơn`);
  console.log(`  Total CRM Revenue: ${totalCRMRevenue.toLocaleString("vi-VN")} đ`);
  console.log(`  Google Conversions: ${totalGoogleConvs}`);
  console.log(`  Average CPA: ${cpa.toLocaleString("vi-VN")} đ/đơn`);
  console.log(`  Average ROAS: ${roas.toFixed(2)}x`);
  console.log(`  Net Profit: ${netProfit.toLocaleString("vi-VN")} đ`);

  process.exit(0);
}

main().catch(console.error);
