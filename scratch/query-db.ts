import { db, products, adsAccounts } from "../packages/db/src";
import { config } from "dotenv";
config({ path: "./apps/web/.env" });

async function main() {
  try {
    const allProducts = await db.select().from(products);
    console.log("PRODUCTS IN DB:", allProducts);

    const allAccounts = await db.select({
      id: adsAccounts.id,
      name: adsAccounts.name,
      customerId: adsAccounts.customerId,
    }).from(adsAccounts);
    console.log("ADS ACCOUNTS IN DB:", allAccounts);
  } catch (err) {
    console.error("Error querying db:", err);
  }
  process.exit(0);
}

main();
