import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const adminId = "5e465bff-d56f-49da-a5d2-c5f7f2dceb5b";
  const trungnh28Id = "91a1be60-05e4-43dc-85eb-935016e3c58c";

  try {
    console.log("Merging data from trungnh28 to admin...");
    
    // 1. Move OAuth connections
    await sql`UPDATE oauth_connections SET user_id = ${adminId} WHERE user_id = ${trungnh28Id};`;
    console.log("✓ Moved OAuth connections");

    // 2. Move CRM connections
    await sql`UPDATE crm_connections SET user_id = ${adminId} WHERE user_id = ${trungnh28Id};`;
    console.log("✓ Moved CRM connections");

    // 3. Move User Ads Accounts
    await sql`
      INSERT INTO user_ads_accounts (user_id, ads_account_id, created_at)
      SELECT ${adminId}, ads_account_id, created_at FROM user_ads_accounts WHERE user_id = ${trungnh28Id}
      ON CONFLICT DO NOTHING;
    `;
    await sql`DELETE FROM user_ads_accounts WHERE user_id = ${trungnh28Id};`;
    console.log("✓ Moved Ads Account access");

    // 4. Delete the unwanted user
    await sql`DELETE FROM users WHERE id = ${trungnh28Id};`;
    console.log("✓ Deleted user trungnh28");

    console.log("Merge completed successfully!");
  } catch (error) {
    console.error("Merge failed:", error);
  } finally {
    await sql.end();
  }
}

main();
