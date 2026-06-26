import { db, campaignsSnapshot } from "../packages/db/src";
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
  
  const snapshots = await db.select().from(campaignsSnapshot);
  console.log(`Found ${snapshots.length} campaign snapshots total.`);
  for (const s of snapshots) {
    console.log(`Campaign Snapshot ID: ${s.id}`);
    console.log(`  Campaign: ${s.name} (ID: ${s.campaignId})`);
    console.log(`  Customer ID: ${s.customerId}`);
    console.log(`  Date: ${s.date}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Primary Status: ${s.primaryStatus}`);
    console.log(`  Cost (micros): ${s.costMicros} (${Number(s.costMicros || 0)/1000000} VND)`);
    console.log(`  Real Conversions: ${s.realConversions}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
