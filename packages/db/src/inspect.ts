import fs from "fs";
import path from "path";

try {
  const envContent = fs.readFileSync(path.join(__dirname, "../../../.env"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.error("Could not load .env file", e);
}

import { db } from "./index";
import { sql } from "drizzle-orm";

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
