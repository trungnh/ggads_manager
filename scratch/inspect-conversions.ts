import { db, campaignsSnapshot } from "../packages/db/src";
import { desc } from "drizzle-orm";
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
  
  // Find all dates and their conversion/cost counts
  const stats = await db.select({
    date: campaignsSnapshot.date,
    totalCRMConvs: campaignsSnapshot.realConversionsSuccess,
    costMicros: campaignsSnapshot.costMicros
  })
  .from(campaignsSnapshot)
  .orderBy(desc(campaignsSnapshot.date));

  const dateGroups = new Map<string, {
    convs: number;
    cost: number;
    campaigns: number;
  }>();

  for (const snap of stats) {
    const date = snap.date;
    const conv = snap.totalCRMConvs || 0;
    const cost = Number(snap.costMicros || 0) / 1000000;
    
    if (!dateGroups.has(date)) {
      dateGroups.set(date, { convs: 0, cost: 0, campaigns: 0 });
    }
    
    const g = dateGroups.get(date)!;
    g.convs += conv;
    g.cost += cost;
    g.campaigns += 1;
  }

  console.log("--- Date Stats Summary (All) ---");
  const sortedDates = Array.from(dateGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  for (const [date, g] of sortedDates) {
    if (g.convs > 0 || g.cost > 0) {
      console.log(`Date: ${date} | Campaigns: ${g.campaigns} | Total CRM Convs: ${g.convs} | Spent: ${g.cost.toLocaleString("vi-VN")} đ`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
