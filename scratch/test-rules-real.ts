import { RulesEngine } from '../packages/services/src/RulesEngine';
import { db, optimizationRules } from '@repo/db';
import { eq } from 'drizzle-orm';
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.resolve(__dirname, "../apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(["']?)(.*?)\2\s*$/);
      if (match) {
        process.env[match[1]] = match[3];
      }
    }
  }
}

async function testRules() {
  loadEnv();
  console.log("🚀 Running local RulesEngine check for Favistore - Rootking (5541508335)...");
  
  try {
    const account = await db.query.adsAccounts.findFirst({
      where: (fields, { eq }) => eq(fields.customerId, "5541508335")
    });
    
    if (!account) {
      console.error("❌ Account not found.");
      return;
    }

    console.log("🔍 Found account:", account.name, account.customerId);
    
    const userAcc = await db.query.userAdsAccounts.findFirst({
      where: (fields, { eq }) => eq(fields.adsAccountId, account.id)
    });
    
    const userId = userAcc?.userId || "mock-user-id";
    console.log("👤 Found associated userId:", userId);

    // Bypass cooldown: reset lastExecutedAt and executionsTodayCount
    await db.update(optimizationRules)
      .set({
        lastExecutedAt: null,
        executionsTodayCount: 0
      })
      .where(eq(optimizationRules.adsAccountId, account.id));
    console.log("🔄 Cooldown status reset successfully.");
    
    const isDryRun = false; 
    
    await RulesEngine.runAccountOptimization(
      userId, 
      account.id, 
      account.customerId, 
      isDryRun
    );

    console.log(`\n==================================================`);
    console.log("✅ RulesEngine execution finished.");
    
  } catch (error) {
    console.error("❌ System error:", error);
  }
}

testRules().then(() => process.exit(0));
