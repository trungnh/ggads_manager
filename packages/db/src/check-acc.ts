import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const result = await sql`SELECT * FROM ads_accounts WHERE customer_id = '9720114325';`;
  console.log(JSON.stringify(result, null, 2));
  await sql.end();
}

main();
