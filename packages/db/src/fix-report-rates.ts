import { db, products, revenueReports } from "./index";
import { RevenueService } from "@repo/services";
import { eq } from "drizzle-orm";

async function main() {
  const reportId = "d361ef2e-c816-497a-8a66-3fa3b94d202d";
  const productId = "19df1c3b-d739-4493-b84b-d2f05ba488f4"; // Rootking product ID

  console.log(`=== Fixing Report Rates & Running Bulk Sync ===`);
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId)
    });

    if (!product) {
      console.error("Product not found");
      process.exit(1);
    }

    const defaultImportPrice = Number(product.importPriceMicros || 0) / 1000000;
    const defaultShippingFee = Number(product.shippingFee || 0) / 1000000;
    const defaultReturnRate = Number(product.returnRate || 0);

    console.log(`Rootking Product Rates:`);
    console.log(`- Import Price: ${defaultImportPrice} VND`);
    console.log(`- Shipping Fee: ${defaultShippingFee} VND`);
    console.log(`- Return Rate: ${defaultReturnRate * 100}%`);

    const updatedRates = {
      importPrice: defaultImportPrice,
      shippingFee: defaultShippingFee,
      returnRate: defaultReturnRate,
      incomeTax: 0.015,
      adsTax: 0.10,
      paymentFee: 0.012
    };

    // Update the existing report
    await db.update(revenueReports)
      .set({ rates: updatedRates })
      .where(eq(revenueReports.id, reportId));

    console.log("Successfully updated report rates in PostgreSQL.");

    const report = await db.query.revenueReports.findFirst({
      where: eq(revenueReports.id, reportId)
    });

    if (report && report.userId) {
      console.log("Triggering bulk sync for the entire month...");
      const result = await RevenueService.bulkSyncMonth(report.userId, reportId);
      console.log(`Bulk sync finished! Synced ${result.syncedDays} days successfully.`);
    }

  } catch (err) {
    console.error("Failed to run rates fix and sync:", err);
  } finally {
    process.exit(0);
  }
}

main();
