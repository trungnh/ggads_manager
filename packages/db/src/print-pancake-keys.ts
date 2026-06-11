import { db, pancakeAccounts } from "./index";

async function main() {
  try {
    const all = await db.select().from(pancakeAccounts);
    console.log("=== PANCAKE ACCOUNTS ===");
    all.forEach(pa => {
      console.log(`ID: ${pa.id}, ShopId: ${pa.shopId}, APIKey: "${pa.apiKey}"`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
