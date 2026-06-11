import postgres from 'postgres';

async function run() {
  const sql = postgres('postgresql://postgres:postgres@localhost:5432/gads');
  const res = await sql`SELECT campaign_id, bidding_strategy_type FROM campaigns_snapshot LIMIT 5`;
  console.log(res);
  await sql.end();
}

run().catch(console.error);
