const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Adding Impression Share columns to campaigns_snapshot table...");

  try {
    await sql`
      ALTER TABLE campaigns_snapshot 
      ADD COLUMN IF NOT EXISTS search_budget_lost_impression_share NUMERIC(5,4),
      ADD COLUMN IF NOT EXISTS search_rank_lost_impression_share NUMERIC(5,4)
    `;
    console.log("Impression Share columns added successfully!");
  } catch (error) {
    console.error("Failed to alter table:", error);
  } finally {
    await sql.end();
  }
}

main();
