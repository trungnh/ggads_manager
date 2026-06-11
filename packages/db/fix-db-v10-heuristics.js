const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Adding placements CPA threshold and scan frequency columns to ads_accounts table...");

  try {
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_cpa_threshold INTEGER DEFAULT 250000`;
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS placements_scan_frequency INTEGER DEFAULT 15`;
    console.log("Columns placements_cpa_threshold and placements_scan_frequency added successfully!");
  } catch (error) {
    console.error("Failed to alter table:", error);
  } finally {
    await sql.end();
  }
}

main();
