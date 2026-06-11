import { db, campaignsSnapshot } from "../packages/db/src";
import { CampaignProfileBuilder } from "../packages/services/src/CampaignProfileBuilder";
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
  
  const targetCustomerId = "9720114325";
  console.log("Inspecting campaign profiles for customer:", targetCustomerId);
  
  const profileBuilder = new CampaignProfileBuilder();
  const campaigns = await profileBuilder.buildProfiles(
    [targetCustomerId],
    30,
    [],
    []
  );

  console.log(`\nFound ${campaigns.length} campaigns. Details:`);
  for (const c of campaigns) {
    console.log(`\nCampaign: ${c.campaignName} (${c.campaignId})`);
    console.log(`  Status: ${c.status}`);
    console.log(`  Current Budget: ${(c.currentBudgetMicros / 1000000).toLocaleString("vi-VN")} đ/ngày`);
    console.log(`  Total Cost (30d): ${(c.totalCostMicros / 1000000).toLocaleString("vi-VN")} đ`);
    console.log(`  Total CRM Conversions (30d): ${c.totalConversions}`);
    console.log(`  Avg Daily Cost: ${(c.avgDailyCostMicros / 1000000).toLocaleString("vi-VN")} đ`);
    console.log(`  Avg Daily Conversions: ${c.avgDailyConversions}`);
  }

  process.exit(0);
}

main().catch(console.error);
