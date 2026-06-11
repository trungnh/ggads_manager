import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function main() {
  try {
    const results = await client`SELECT * FROM crm_connections;`;
    console.log("CRM Connections:", JSON.stringify(results, null, 2));

    const integrations = await client`SELECT * FROM crm_integrations;`;
    console.log("CRM Integrations:", JSON.stringify(integrations, null, 2));

    const adsAccounts = await client`SELECT id, customer_id, name FROM ads_accounts;`;
    console.log("Ads Accounts:", JSON.stringify(adsAccounts, null, 2));
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

main();
