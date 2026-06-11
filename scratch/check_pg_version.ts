
import { db } from "../packages/db/src/index";
import { sql } from "drizzle-orm";

async function checkVersion() {
    try {
        const res = await db.execute(sql`SELECT version()`);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkVersion();
