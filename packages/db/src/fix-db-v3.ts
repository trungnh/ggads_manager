import postgres from 'postgres';

const sql = postgres('postgresql://postgres:postgres@localhost:5432/gads');

async function fix() {
  try {
    console.log('Adding oauth_connection_id to ads_accounts and crm_connections...');
    
    // 1. Add column to ads_accounts
    await sql`ALTER TABLE ads_accounts ADD COLUMN IF NOT EXISTS oauth_connection_id uuid REFERENCES oauth_connections(id) ON DELETE SET NULL;`;
    
    // 2. Add column to crm_connections
    await sql`ALTER TABLE crm_connections ADD COLUMN IF NOT EXISTS oauth_connection_id uuid REFERENCES oauth_connections(id) ON DELETE SET NULL;`;
    
    console.log('Database schema updated successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fix();
