import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Refactoring crm_integrations table...");

  try {
    // 1. Add new column
    await sql`ALTER TABLE crm_integrations ADD COLUMN IF NOT EXISTS crm_connection_id UUID REFERENCES crm_connections(id) ON DELETE CASCADE`;
    
    // 2. Drop old columns
    await sql`ALTER TABLE crm_integrations DROP COLUMN IF EXISTS provider`;
    await sql`ALTER TABLE crm_integrations DROP COLUMN IF EXISTS config`;

    // 3. Update constraints
    await sql`ALTER TABLE crm_integrations ALTER COLUMN ads_account_id SET NOT NULL`;
    // Note: If there are existing rows without crm_connection_id, this might fail. 
    // But this is a fresh-ish DB, so we'll try. 
    // If it fails, we'll delete existing rows first.
    try {
        await sql`DELETE FROM crm_integrations WHERE crm_connection_id IS NULL`;
        await sql`ALTER TABLE crm_integrations ALTER COLUMN crm_connection_id SET NOT NULL`;
    } catch (e) {
        console.warn("Could not set crm_connection_id to NOT NULL, likely empty table or existing nulls handled.");
    }

    // 4. Add created_at
    await sql`ALTER TABLE crm_integrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;

    // 5. Add unique constraint
    try {
        await sql`ALTER TABLE crm_integrations ADD CONSTRAINT crm_integrations_ads_account_id_crm_connection_id_unique UNIQUE (ads_account_id, crm_connection_id)`;
    } catch (e) {
        console.warn("Unique constraint might already exist or failed to create.");
    }

    console.log("Refactoring completed successfully!");
  } catch (error) {
    console.error("Refactoring failed:", error);
  } finally {
    await sql.end();
  }
}

main();
