import { NextResponse } from "next/server";
import { db, revenueReports, revenueReportDaily } from "@repo/db";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const report = await db.query.revenueReports.findFirst({
      where: and(eq(revenueReports.id, reportId), eq(revenueReports.userId, session.user.id))
    });

    if (!report) {
      return new NextResponse("Report not found", { status: 404 });
    }

    const dailyData = await db.query.revenueReportDaily.findMany({
      where: eq(revenueReportDaily.reportId, reportId),
      orderBy: (daily, { desc }) => [desc(daily.date)]
    });

    return NextResponse.json({ report, dailyData });
  } catch (error: any) {
    console.error("Failed to fetch revenue report details:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { rates, dailyData } = body;

    // 1. Update report metadata (name and rates)
    const updatedReport = await db.update(revenueReports)
      .set({
        ...(rates ? { rates } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(revenueReports.id, reportId), eq(revenueReports.userId, session.user.id)))
      .returning();

    // 2. Batch-upsert daily records
    if (Array.isArray(dailyData) && dailyData.length > 0) {
      await db.insert(revenueReportDaily)
        .values(
          dailyData.map((row: any) => ({
            reportId,
            date: row.date,
            orders: Number(row.orders || 0),
            quantity: Number(row.quantity || 0),
            revenueMicros: String(row.revenueMicros || "0"),
            adsCostMicros: String(row.adsCostMicros || "0"),
            shipCostMicros: String(row.shipCostMicros || "0"),
            goodsCostMicros: String(row.goodsCostMicros || "0"),
            profitMicros: String(row.profitMicros || "0"),
            isLocked: row.isLocked ?? false,
          }))
        )
        .onConflictDoUpdate({
          target: [revenueReportDaily.reportId, revenueReportDaily.date],
          set: {
            orders: sql`EXCLUDED.orders`,
            quantity: sql`EXCLUDED.quantity`,
            revenueMicros: sql`EXCLUDED.revenue_micros`,
            adsCostMicros: sql`EXCLUDED.ads_cost_micros`,
            shipCostMicros: sql`EXCLUDED.ship_cost_micros`,
            goodsCostMicros: sql`EXCLUDED.goods_cost_micros`,
            profitMicros: sql`EXCLUDED.profit_micros`,
            isLocked: sql`EXCLUDED.is_locked`,
          }
        });
    }

    return NextResponse.json({ report: updatedReport[0] });
  } catch (error: any) {
    console.error("Failed to update revenue report:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await db.delete(revenueReports)
      .where(and(eq(revenueReports.id, reportId), eq(revenueReports.userId, session.user.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete revenue report:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
