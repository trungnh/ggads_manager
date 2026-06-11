import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Adding excluded_campaign_ids to ads_accounts table...");

  try {
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS excluded_campaign_ids JSONB DEFAULT '[]'`;
    console.log("Column added successfully!");
  } catch (error) {
    console.error("Failed to add column:", error);
  } finally {
    await sql.end();
  }
}

main();
