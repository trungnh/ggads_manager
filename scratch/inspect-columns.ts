import { db } from "./packages/db/src";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
config();

async function main() {
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'campaign_chart_points';
  `);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
