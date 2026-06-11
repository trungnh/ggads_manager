import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const result = await sql`SELECT id, username, email FROM users;`;
  console.log(JSON.stringify(result, null, 2));
  await sql.end();
}

main();
