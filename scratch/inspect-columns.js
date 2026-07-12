const postgres = require('postgres');

async function run() {
  const sql = postgres("postgresql://postgres:postgres@localhost:5432/gads");
  try {
    const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campaign_chart_points';
    `;
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
