const postgres = require('postgres');
const sql = postgres('postgresql://postgres:postgres@localhost:5432/gads');

async function main() {
  try {
    console.log('Adding columns to campaign_settings...');
    await sql`ALTER TABLE campaign_settings ADD COLUMN IF NOT EXISTS last_conv_cost_micros numeric(20,0) DEFAULT '0'`;
    await sql`ALTER TABLE campaign_settings ADD COLUMN IF NOT EXISTS last_conv_count integer DEFAULT 0`;
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

main();
