import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gads";
const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Applying database changes for Telegram bot connections...");

  try {
    // 1. Create telegram_connections table
    await sql`
      CREATE TABLE IF NOT EXISTS telegram_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        bot_token TEXT NOT NULL,
        chat_id VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("Created table telegram_connections successfully.");

    // 2. Create telegram_performance_reports table
    await sql`
      CREATE TABLE IF NOT EXISTS telegram_performance_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connection_id UUID NOT NULL REFERENCES telegram_connections(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE,
        frequency_minutes INTEGER DEFAULT 60,
        hours_start VARCHAR(5) DEFAULT '06:00',
        hours_end VARCHAR(5) DEFAULT '22:00',
        custom_message TEXT,
        last_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("Created table telegram_performance_reports successfully.");

    // 3. Add column telegram_connection_id to rule_actions table
    await sql`
      ALTER TABLE rule_actions 
      ADD COLUMN IF NOT EXISTS telegram_connection_id UUID 
      REFERENCES telegram_connections(id) ON DELETE SET NULL
    `;
    console.log("Added telegram_connection_id column to rule_actions successfully.");

    console.log("Database changes applied successfully!");
  } catch (error) {
    console.error("Database changes application failed:", error);
  } finally {
    await sql.end();
  }
}

main();
