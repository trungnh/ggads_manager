
import { db } from "../packages/db/src/index";
import { sql } from "drizzle-orm";

async function checkTable() {
    try {
        const res = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaign_settings'
        `);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkTable();
