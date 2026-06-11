
import { db } from "../packages/db/src/index";
import { sql } from "drizzle-orm";

async function fixDb() {
    try {
        console.log("Dropping column...");
        await db.execute(sql`ALTER TABLE campaign_settings DROP COLUMN IF EXISTS cflc_override_micros`);
        console.log("Column dropped.");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

fixDb();
