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
  
  const snapshots = await db.select().from(campaignsSnapshot).where(eq(campaignsSnapshot.customerId, "4821984319"));
  console.log(`Found ${snapshots.length} campaign snapshots for account 4821984319.`);
  for (const s of snapshots) {
    console.log(`Campaign: ${s.name} | Date: ${s.date} | Status: ${s.status} | Cost: ${Number(s.costMicros || 0)/1000000} VND`);
  }
  
  process.exit(0);
}

main().catch(console.error);
