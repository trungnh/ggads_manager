const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Applying database migration for Budget Optimizer v2.0...");

  try {
    // 1. Create budget_optimizations table
    console.log("Creating budget_optimizations table...");
    await sql`
      CREATE TABLE IF NOT EXISTS budget_optimizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ads_account_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        optimization_input JSONB NOT NULL,
        algorithm_output JSONB,
        ai_explanation JSONB,
        staged_rollout_schedule JSONB,
        safety_breaker_triggered_at TIMESTAMP,
        safety_breaker_details JSONB,
        applied_at TIMESTAMP,
        tokens_used INTEGER,
        computation_ms INTEGER,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;

    // 2. Create budget_optimization_settings table
    console.log("Creating budget_optimization_settings table...");
    await sql`
      CREATE TABLE IF NOT EXISTS budget_optimization_settings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        conversion_source VARCHAR(30) DEFAULT 'google_ads',
        crm_conversion_status VARCHAR(30) DEFAULT 'delivered',
        safety_breaker_enabled BOOLEAN DEFAULT true,
        safety_breaker_cpa_threshold_pct INTEGER DEFAULT 30,
        safety_breaker_min_conversions INTEGER DEFAULT 3,
        staged_rollout_days INTEGER DEFAULT 3,
        cross_account_enabled BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT now()
      )
    `;

    // 3. Create index for fast retrieval
    console.log("Creating indexes...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_optimizations_user ON budget_optimizations(user_id, created_at)
    `;

    console.log("Database migration for Budget Optimizer applied successfully!");
  } catch (error) {
    console.error("Failed to execute database migration:", error);
  } finally {
    await sql.end();
  }
}

main();
