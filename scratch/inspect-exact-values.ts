import { db, optimizationRules } from "../packages/db/src";
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
  for (const rule of rules) {
    console.log(`Rule ID: ${rule.id} | Name: ${rule.name}`);
    
    const conditions = await db.query.ruleConditions.findMany({
      where: (fields, { eq }) => eq(fields.ruleId, rule.id)
    });
    for (const c of conditions) {
      console.log(`  Condition ID: ${c.id}`);
      console.log(`    metric: "${c.metric}" (length: ${c.metric.length})`);
      console.log(`    operator: "${c.operator}" (length: ${c.operator.length})`);
      console.log(`    value: "${c.value}" (length: ${c.value.length})`);
    }
    
    const actions = await db.query.ruleActions.findMany({
      where: (fields, { eq }) => eq(fields.ruleId, rule.id)
    });
    for (const a of actions) {
      console.log(`  Action ID: ${a.id}`);
      console.log(`    actionType: "${a.actionType}" (length: ${a.actionType.length})`);
      console.log(`    actionValue: "${a.actionValue}"`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
