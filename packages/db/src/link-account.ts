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
  const hoaiducKRId = "0eeece0b-cc0b-4f25-ae5f-0a7a2d41dd58";
  const pancakeConnId = "d3cced79-e014-4035-804d-1653838300db";

  try {
    console.log("Linking HOAIDUC - KR to Pancake...");
    await client`
      INSERT INTO crm_integrations (id, ads_account_id, crm_connection_id, is_enabled, created_at, updated_at)
      VALUES (gen_random_uuid(), ${hoaiducKRId}, ${pancakeConnId}, true, now(), now())
      ON CONFLICT (ads_account_id, crm_connection_id) DO UPDATE SET is_enabled = true;
    `;
    console.log("✓ Linked successfully!");
  } catch (error) {
    console.error("Link failed:", error);
  } finally {
    await client.end();
  }
}

main();
