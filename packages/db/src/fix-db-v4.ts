import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load env from apps/web
dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function main() {
  console.log("Adding 'status' column to oauth_connections and ads_accounts...");
  
  try {
    // 1. Add status to oauth_connections
    await client`ALTER TABLE oauth_connections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';`;
    console.log("✓ Added status to oauth_connections");

    // 2. Add status to ads_accounts if not exists
    await client`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';`;
    console.log("✓ Added status to ads_accounts");

    console.log("Database update completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

main();
