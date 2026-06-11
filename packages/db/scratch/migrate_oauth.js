const postgres = require('postgres');
const sql = postgres('postgresql://postgres:postgres@localhost:5432/gads');

async function main() {
  try {
    console.log('Adding constraints to oauth_connections...');
    // Drop existing if any to avoid error, then add
    try {
      await sql`ALTER TABLE oauth_connections ADD CONSTRAINT oauth_connections_user_id_provider_email_unique UNIQUE (user_id, provider, email)`;
      console.log('Unique constraint added.');
    } catch (e) {
      console.log('Constraint might already exist or error:', e.message);
    }
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

main();
