import { db, campaignsSnapshot } from "../packages/db/src";
import { gte } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Manually parse the .env file to avoid external dependency issues
function loadEnv() {
  const envPath = path.resolve(__dirname, "../apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(["']?)(.*?)\1\s*$/);
      if (match) {
        process.env.DATABASE_URL = match[2];
        console.log("Loaded DATABASE_URL from .env file");
        break;
      }
    }
  } else {
    console.log("No .env file found at " + envPath);
  }
}

async function main() {
  loadEnv();
  
  console.log("Connecting to database:", process.env.DATABASE_URL);
  
  // Find all campaign snapshots in the last 30 days
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 30);
  
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];
  
  console.log(`Querying snapshots between ${startDateStr} and ${endDateStr}...`);
  
  const snapshots = await db.select({
    campaignId: campaignsSnapshot.campaignId,
    name: campaignsSnapshot.name,
    status: campaignsSnapshot.status,
    budgetMicros: campaignsSnapshot.budgetMicros,
    costMicros: campaignsSnapshot.costMicros,
    realConversionsSuccess: campaignsSnapshot.realConversionsSuccess,
    date: campaignsSnapshot.date,
  })
  .from(campaignsSnapshot)
  .where(gte(campaignsSnapshot.date, startDateStr));

  console.log(`Found ${snapshots.length} total snapshots in the database.`);
  
  if (snapshots.length === 0) {
    console.log("No snapshots found.");
    process.exit(0);
  }

  // Group by campaign and summarize
  const campaignMap = new Map<string, {
    name: string;
    status: string;
    latestBudget: number;
    totalCost: number;
    totalConversions: number;
    daysCount: number;
  }>();

  for (const snap of snapshots) {
    const budget = Number(snap.budgetMicros || 0) / 1000000;
    const cost = Number(snap.costMicros || 0) / 1000000;
    const conv = snap.realConversionsSuccess || 0;
    
    if (!campaignMap.has(snap.campaignId)) {
      campaignMap.set(snap.campaignId, {
        name: snap.name || "",
        status: snap.status || "",
        latestBudget: budget,
        totalCost: 0,
        totalConversions: 0,
        daysCount: 0
      });
    }
    
    const stats = campaignMap.get(snap.campaignId)!;
    stats.totalCost += cost;
    stats.totalConversions += conv;
    stats.daysCount += 1;
    // Keep updating to get latest budget
    stats.latestBudget = budget;
    if (snap.status) stats.status = snap.status;
  }

  let totalLatestBudgetDaily = 0;
  let totalSpent30Days = 0;
  let totalConversions30Days = 0;
  
  console.log("\n--- Campaign Summary ---");
  for (const [id, stats] of campaignMap.entries()) {
    console.log(`\nCampaign: ${stats.name} (${id})`);
    console.log(`  Status: ${stats.status}`);
    console.log(`  Latest Daily Budget: ${stats.latestBudget.toLocaleString("vi-VN")} đ/ngày`);
    console.log(`  Total Spend (30d): ${stats.totalCost.toLocaleString("vi-VN")} đ`);
    console.log(`  Total Pancake CRM Conversions (30d): ${stats.totalConversions} đơn`);
    console.log(`  Avg CPA: ${stats.totalConversions > 0 ? (stats.totalCost / stats.totalConversions).toLocaleString("vi-VN") : "N/A"} đ/đơn`);
    
    totalLatestBudgetDaily += stats.latestBudget;
    totalSpent30Days += stats.totalCost;
    totalConversions30Days += stats.totalConversions;
  }

  console.log("\n--- Grand Totals ---");
  console.log(`Sum of Latest Daily Budgets: ${totalLatestBudgetDaily.toLocaleString("vi-VN")} đ/ngày`);
  console.log(`Projected 30-Day Budget (Daily Sum * 30): ${(totalLatestBudgetDaily * 30).toLocaleString("vi-VN")} đ`);
  console.log(`Actual Spent in Last 30 Days: ${totalSpent30Days.toLocaleString("vi-VN")} đ`);
  console.log(`Total Pancake CRM Conversions: ${totalConversions30Days} đơn`);
  console.log(`Overall CPA: ${totalConversions30Days > 0 ? (totalSpent30Days / totalConversions30Days).toLocaleString("vi-VN") : "N/A"} đ/đơn`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
