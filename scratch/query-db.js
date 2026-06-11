const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/gads"
  });
  await client.connect();

  try {
    const resProducts = await client.query('SELECT * FROM products LIMIT 5');
    console.log("PRODUCTS IN DB:");
    console.log(resProducts.rows);

    const resAccounts = await client.query('SELECT id, customer_id, name, status FROM ads_accounts LIMIT 10');
    console.log("ADS ACCOUNTS IN DB:");
    console.log(resAccounts.rows);
  } catch (err) {
    console.error("DB Error:", err);
  }

  await client.end();
}

run().catch(console.error);
