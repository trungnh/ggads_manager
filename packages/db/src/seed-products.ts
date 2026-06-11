import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = postgres(connectionString, { prepare: false });

async function main() {
  try {
    console.log("Seeding products...");
    
    // Clear existing products
    await client`DELETE FROM products;`;
    
    // Insert Mock Products
    // SP001 - Mapped to HOAIDUC - KR (9720114325) and HOAIDUC - BROMA (1615639742)
    await client`
      INSERT INTO products (
        id, 
        code, 
        name, 
        import_price_micros, 
        selling_price_micros, 
        shipping_fee, 
        return_rate, 
        keyword_campaign, 
        ads_account_ids, 
        created_at, 
        updated_at
      ) VALUES (
        'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        'SP001',
        'Thuốc trừ sâu sinh học Bio-S',
        50000000,
        150000000,
        30000000,
        0.1000,
        'Bio-S',
        '["9720114325", "1615639742"]',
        NOW(),
        NOW()
      );
    `;

    // SP002 - Mapped to HOAIDUC - SEEDS (3294134284)
    await client`
      INSERT INTO products (
        id, 
        code, 
        name, 
        import_price_micros, 
        selling_price_micros, 
        shipping_fee, 
        return_rate, 
        keyword_campaign, 
        ads_account_ids, 
        created_at, 
        updated_at
      ) VALUES (
        'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        'SP002',
        'Hạt giống hoa hồng leo Pháp',
        25000000,
        75000000,
        20000000,
        0.0500,
        'HoaHong',
        '["3294134284"]',
        NOW(),
        NOW()
      );
    `;

    console.log("Seeding completed successfully!");
    
    const results = await client`SELECT * FROM products;`;
    console.log("Inserted Products:", JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await client.end();
  }
}

main();
