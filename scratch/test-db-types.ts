import { db, products } from "@repo/db";
import { config } from "dotenv";
config({ path: "./apps/web/.env" });

async function main() {
  console.log("Checking Products in DB...");

  try {
    const prods = await db.select().from(products);
    console.log("Products count:", prods.length);
    console.log("Products data:", JSON.stringify(prods, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main().then(() => process.exit(0));
