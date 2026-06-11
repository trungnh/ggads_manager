const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Adding placements scheduler columns to ads_accounts table...");

  try {
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_auto_exclude_enabled BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_auto_exclude_time VARCHAR(5) DEFAULT '08:00'`;
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_auto_exclude_range VARCHAR(20) DEFAULT 'YESTERDAY'`;
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_product_context TEXT`;
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_auto_exclude_last_run DATE`;
    console.log("All columns added successfully!");
  } catch (error) {
    console.error("Failed to alter table:", error);
  } finally {
    await sql.end();
  }
}

main();
