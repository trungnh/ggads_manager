const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Starting DB upgrade for health audits and guardrails...");

  try {
    // 1. Alter ads_accounts
    console.log("Altering ads_accounts table...");
    await sql`
      ALTER TABLE ads_accounts 
      ADD COLUMN IF NOT EXISTS health_audit_auto_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS health_audit_cron_frequency VARCHAR(20) DEFAULT 'WEEKLY',
      ADD COLUMN IF NOT EXISTS health_audit_last_run DATE
    `;

    // 2. Alter campaigns_snapshot
    console.log("Altering campaigns_snapshot table...");
    await sql`
      ALTER TABLE campaigns_snapshot 
      ADD COLUMN IF NOT EXISTS primary_status VARCHAR(50) DEFAULT 'ELIGIBLE'
    `;

    // 3. Alter optimization_rules
    console.log("Altering optimization_rules table...");
    await sql`
      ALTER TABLE optimization_rules 
      ADD COLUMN IF NOT EXISTS guardrail_learning_protection BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS guardrail_3x_kill BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS guardrail_budget_suffocation BOOLEAN DEFAULT false
    `;

    // 4. Create ads_health_audit_logs
    console.log("Creating ads_health_audit_logs table...");
    await sql`
      CREATE TABLE IF NOT EXISTS ads_health_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ads_account_id UUID NOT NULL REFERENCES ads_accounts(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        result_json JSONB NOT NULL,
        trigger_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log("DB upgrade completed successfully!");
  } catch (error) {
    console.error("Failed to perform DB upgrade:", error);
  } finally {
    await sql.end();
  }
}

main();
