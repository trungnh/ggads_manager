const path = require('path');
// Load .env file from project root
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Lỗi: Không tìm thấy DATABASE_URL trong tệp .env!");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Altering campaign_chart_points to add success columns in JS...");

  try {
    await sql`ALTER TABLE campaign_chart_points ADD COLUMN IF NOT EXISTS delta_conversions_success INTEGER DEFAULT 0`;
    await sql`ALTER TABLE campaign_chart_points ADD COLUMN IF NOT EXISTS delta_conversion_value_success_micros NUMERIC(20, 0) DEFAULT '0'`;
    console.log("Columns added successfully!");
  } catch (error) {
    console.error("Failed to alter table:", error);
  } finally {
    await sql.end();
  }
}

main();
