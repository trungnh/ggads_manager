const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Creating ads_asset_performance_cache and ads_ai_recommendations tables...");

  try {
    // 1. Create ads_asset_performance_cache table
    await sql`
      CREATE TABLE IF NOT EXISTS ads_asset_performance_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ads_account_id UUID NOT NULL REFERENCES ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(30) NOT NULL,
        campaign_type VARCHAR(30) NOT NULL,
        asset_group_id VARCHAR(50),
        asset_id VARCHAR(50) NOT NULL,
        asset_name VARCHAR(255),
        asset_type VARCHAR(30) NOT NULL,
        asset_url TEXT NOT NULL,
        google_rating VARCHAR(20),
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        cost_micros NUMERIC(20, 0) DEFAULT 0,
        conversions NUMERIC(10, 2) DEFAULT 0,
        crm_closed_leads INTEGER DEFAULT 0,
        crm_sales_value_micros NUMERIC(20, 0) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("ads_asset_performance_cache table created/verified successfully.");

    // 2. Create ads_ai_recommendations table
    await sql`
      CREATE TABLE IF NOT EXISTS ads_ai_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ads_account_id UUID NOT NULL REFERENCES ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(30) NOT NULL,
        asset_id VARCHAR(50) NOT NULL,
        diagnostic_report TEXT NOT NULL,
        recommended_headline VARCHAR(255),
        recommended_description TEXT,
        video_timeline_pins JSONB DEFAULT '[]'::jsonb,
        mockup_prompt TEXT,
        mockup_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("ads_ai_recommendations table created/verified successfully.");
    console.log("Database Migration v9 completed successfully!");
  } catch (error) {
    console.error("Failed to execute migration:", error);
  } finally {
    await sql.end();
  }
}

main();
