import { db, adsAccounts } from './packages/db';
async function test() {
  const accounts = await db.select().from(adsAccounts);
  console.log('Total accounts in DB:', accounts.length);
  console.log(JSON.stringify(accounts, null, 2));
}
test().catch(console.error);
