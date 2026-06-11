import postgres from 'postgres';

const sql = postgres('postgresql://postgres:postgres@localhost:5432/gads');

async function fix() {
  try {
    console.log('Fixing google_tokens table structure...');
    
    // 1. Add email column if it doesn't exist
    await sql`ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS email varchar(255);`;
    
    // 2. Clear old data to avoid PK conflicts or invalid emails
    // Since it's dev and we're changing PK, it's safer to truncate.
    await sql`TRUNCATE TABLE google_tokens;`;
    
    // 3. Drop existing primary key
    // We try common names or just ignore errors if not found
    try {
      await sql`ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_pkey CASCADE;`;
    } catch (e) {}
    
    // 4. Add the new composite primary key
    await sql`ALTER TABLE google_tokens ADD PRIMARY KEY (user_id, email);`;
    
    console.log('Database structure updated successfully!');
  } catch (err) {
    console.error('Failed to update database:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fix();
