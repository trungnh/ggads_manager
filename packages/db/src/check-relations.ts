import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const oauth = await sql`SELECT id, user_id, email, provider FROM oauth_connections;`;
  console.log("OAuth Connections:", JSON.stringify(oauth, null, 2));

  const crm = await sql`SELECT id, user_id, name, type FROM crm_connections;`;
  console.log("CRM Connections:", JSON.stringify(crm, null, 2));

  const users = await sql`SELECT id, username, email FROM users;`;
  console.log("Users:", JSON.stringify(users, null, 2));

  await sql.end();
}

main();
