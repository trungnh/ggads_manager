import postgres from 'postgres';

const sql = postgres('postgresql://postgres:postgres@localhost:5432/gads');

async function fix() {
  try {
    console.log('Migrating from google_tokens to oauth_connections...');
    
    // 1. Drop old table
    await sql`DROP TABLE IF EXISTS google_tokens CASCADE;`;
    
    // 2. Create new table oauth_connections
    await sql`
      CREATE TABLE IF NOT EXISTS oauth_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider varchar(20) NOT NULL,
        email varchar(255) NOT NULL,
        access_token text NOT NULL,
        refresh_token text NOT NULL,
        expires_at timestamp NOT NULL,
        updated_at timestamp DEFAULT now(),
        UNIQUE(user_id, provider, email)
      );
    `;
    
    console.log('Database migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fix();
