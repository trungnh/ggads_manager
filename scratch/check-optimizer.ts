import { db, campaignsSnapshot } from "../packages/db/src";
import { CampaignProfileBuilder } from "../packages/services/src/CampaignProfileBuilder";
import { BudgetAllocationEngine } from "../packages/services/src/BudgetAllocationEngine";
import { gte } from "drizzle-orm";
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
  
  const targetCustomerId = "9720114325"; // Exact customer ID from user screenshot
  console.log("Simulating customer account:", targetCustomerId);
  
  const profileBuilder = new CampaignProfileBuilder();
  const campaigns = await profileBuilder.buildProfiles(
    [targetCustomerId],
    30,
    [],
    []
  );

  console.log(`\nBuilt profiles for ${campaigns.length} campaigns.`);

  const allocationEngine = new BudgetAllocationEngine();
  const totalMonthlyBudget = 30000000; // 30 Million VND
  const remainingBudget = 30000000; // 30 Million VND

  const optimizerInput = {
    adsAccountIds: [targetCustomerId],
    userId: "test-user",
    constraints: {
      totalMonthlyBudgetMicros: totalMonthlyBudget * 1000000,
      remainingBudgetMicros: remainingBudget * 1000000,
      minCampaignBudgetMicros: 100000000, // 100k VND min daily
      lockedCampaignIds: [],
      maxBudgetIncreasePercentage: 200,
      maxBudgetDecreasePercentage: 90,
      stagedRolloutDays: 3
    },
    objective: {
      primary: "maximize_conversions" as const,
      targetCpaMicros: 250000000
    },
    campaigns,
    optimizationDate: new Date(),
    horizonDays: 30
  };

  const output = allocationEngine.allocate(optimizerInput);
  
  console.log("\n--- Recommended Scenario Projections ---");
  console.log(`Projected cost (30 days): ${(output.projectedOutcome.projectedCostMicros / 1000000).toLocaleString("vi-VN")} đ`);
  console.log(`Projected conversions: ${output.projectedOutcome.projectedConversions} conversions`);
  console.log(`Projected CPA: ${(output.projectedOutcome.projectedCpaMicros / 1000000).toLocaleString("vi-VN")} đ/conversions`);
  
  console.log("\n--- Scenarios List ---");
  for (const scenario of output.scenarios) {
    console.log(`Scenario: ${scenario.name} (${scenario.id})`);
    console.log(`  Projected Cost: ${(scenario.totalBudgetMicros / 1000000).toLocaleString("vi-VN")} đ`);
    console.log(`  Projected Conversions: ${scenario.projectedConversions} conversions`);
    console.log(`  Projected CPA: ${(scenario.projectedCpaMicros / 1000000).toLocaleString("vi-VN")} đ/conversions`);
  }

  // Print recommended daily budgets for all campaigns in the recommended scenario
  console.log("\n--- Detailed Campaign Allocations (Recommended) ---");
  for (const alloc of output.allocations) {
    const currentDaily = alloc.currentBudgetMicros / 1000000;
    const recommendedDaily = alloc.recommendedBudgetMicros / 1000000;
    const recommendedMonthly = recommendedDaily * 30;
    console.log(`\nCampaign: ${alloc.campaignName}`);
    console.log(`  Status: ${alloc.isSuspended ? "SUSPENDED" : "ACTIVE"}`);
    console.log(`  Current Daily Budget: ${currentDaily.toLocaleString("vi-VN")} đ/ngày`);
    console.log(`  Recommended Daily Budget: ${recommendedDaily.toLocaleString("vi-VN")} đ/ngày`);
    console.log(`  Recommended 30d Budget: ${recommendedMonthly.toLocaleString("vi-VN")} đ`);
    if (alloc.isSuspended) {
      console.log(`  Reason: ${alloc.suspendReason}`);
    } else {
      console.log(`  Rationale Action: ${alloc.rationale.action}`);
      console.log(`  Rationale Key Metric: ${alloc.rationale.keyMetric}`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
