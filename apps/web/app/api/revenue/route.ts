import { NextResponse } from "next/server";
import { db, revenueReports, revenueReportDaily, products } from "@repo/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { RevenueService } from "@repo/services";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const reports = await db.query.revenueReports.findMany({
      where: eq(revenueReports.userId, session.user.id)
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error("Failed to fetch revenue reports:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, productId, month, rates } = body;

    if (!productId || !month) {
      return new NextResponse("Product ID and Month are required", { status: 400 });
    }

    // Fetch the product to get its default rates
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId)
    });

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    const defaultImportPrice = Number(product.importPriceMicros || 0) / 1000000;
    const defaultShippingFee = Number(product.shippingFee || 0) / 1000000;
    const defaultReturnRate = Number(product.returnRate || 0);

    const initialRates = {
      importPrice: rates?.importPrice !== undefined ? Number(rates.importPrice) : defaultImportPrice,
      shippingFee: rates?.shippingFee !== undefined ? Number(rates.shippingFee) : defaultShippingFee,
      returnRate: rates?.returnRate !== undefined ? Number(rates.returnRate) : defaultReturnRate,
      incomeTax: rates?.incomeTax !== undefined ? Number(rates.incomeTax) : 0.015,
      adsTax: rates?.adsTax !== undefined ? Number(rates.adsTax) : 0.10,
      paymentFee: rates?.paymentFee !== undefined ? Number(rates.paymentFee) : 0.012
    };

    // 1. Insert report
    const newReport = await db.insert(revenueReports).values({
      userId: session.user.id,
      productId,
      name,
      month,
      rates: initialRates
    }).returning();

    const report = newReport[0];

    // 2. Initialize empty/zero daily records for all days of the month
    const [year, mVal] = month.split('-').map(Number);
    const totalDaysInMonth = new Date(year, mVal, 0).getDate();

    const dailyRowsToInsert = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(mVal).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyRowsToInsert.push({
        reportId: report.id,
        date: dateStr,
        adsCostMicros: "0",
        orders: 0,
        quantity: 0,
        revenueMicros: "0",
        shipCostMicros: "0",
        goodsCostMicros: "0",
        profitMicros: "0",
        isLocked: false
      });
    }

    await db.insert(revenueReportDaily).values(dailyRowsToInsert);

    // 3. Trigger initial bulk sync (Phương án A!)
    try {
      await RevenueService.bulkSyncMonth(session.user.id, report.id);
    } catch (syncErr) {
      console.error(`[REVENUE_POST_API] Initial bulk sync failed (handled gracefully):`, syncErr);
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Failed to create revenue report:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
