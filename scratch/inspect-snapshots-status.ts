import { db, campaignsSnapshot } from "../packages/db/src";
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
  
  const distinctCust = await db.selectDistinct({ customerId: campaignsSnapshot.customerId }).from(campaignsSnapshot);
  console.log("Distinct customer IDs in snapshots:", distinctCust);
  
  const distinctAccounts = await db.select().from(adsAccounts);
  console.log("Accounts in adsAccounts:", distinctAccounts.map(a => `${a.name} (${a.customerId})`));
  
  // Loop removed
  
  process.exit(0);
}

main().catch(console.error);
