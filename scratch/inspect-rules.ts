import { db, optimizationRules, adsAccounts } from "../packages/db/src";
import { eq } from "drizzle-orm";
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
  
  const rules = await db.select().from(optimizationRules);
  console.log(`Found ${rules.length} rules total in DB.`);
  
  for (const rule of rules) {
    const [acc] = await db.select().from(adsAccounts).where(eq(adsAccounts.id, rule.adsAccountId)).limit(1);
    console.log(`Rule ID: ${rule.id}`);
    console.log(`  Name: ${rule.name}`);
    console.log(`  Enabled: ${rule.isEnabled}`);
    console.log(`  Target Account: ${acc ? acc.name : "Unknown"} (${acc ? acc.customerId : "N/A"})`);
    console.log(`  Target Type: ${rule.targetType}`);
    console.log(`  Target Value: ${JSON.stringify(rule.targetValue)}`);
    
    const conditions = await db.query.ruleConditions.findMany({
      where: (fields, { eq }) => eq(fields.ruleId, rule.id)
    });
    console.log(`  Conditions:`, conditions.map(c => `${c.metric} ${c.operator} ${c.value}`));
    
    const actions = await db.query.ruleActions.findMany({
      where: (fields, { eq }) => eq(fields.ruleId, rule.id)
    });
    console.log(`  Actions:`, actions.map(a => `${a.actionType} ${a.actionValue || ""}`));
  }
  
  process.exit(0);
}

main().catch(console.error);
