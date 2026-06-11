import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const crm = await sql`SELECT id, user_id, name, type, oauth_connection_id FROM crm_connections;`;
  console.log("CRM Connections with OAuth ID:", JSON.stringify(crm, null, 2));

  await sql.end();
}

main();
