const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/gads"
  });
  await client.connect();
  const res = await client.query('SELECT campaign_id, bidding_strategy_type FROM campaigns_snapshot LIMIT 5');
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
