import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = postgres(connectionString, { prepare: false });

async function main() {
  try {
    const products = await client`SELECT * FROM products;`;
    console.log("=== Products in DB ===");
    console.log(JSON.stringify(products, null, 2));

    const adsAccounts = await client`SELECT id, customer_id, name FROM ads_accounts;`;
    console.log("=== Ads Accounts in DB ===");
    console.log(JSON.stringify(adsAccounts, null, 2));
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

main();
