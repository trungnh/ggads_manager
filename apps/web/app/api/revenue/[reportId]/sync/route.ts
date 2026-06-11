import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RevenueService } from "@repo/services";

export async function POST(
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
    const { mode, date } = body;

    if (mode === "single") {
      if (!date) {
        return new NextResponse("Date is required for single day sync", { status: 400 });
      }
      await RevenueService.syncDailyRevenue(session.user.id, reportId, date);
      return NextResponse.json({ success: true, message: `Successfully synchronized date ${date}` });
    } 
    
    if (mode === "bulk") {
      const result = await RevenueService.bulkSyncMonth(session.user.id, reportId);
      return NextResponse.json({ 
        success: true, 
        message: `Successfully synchronized ${result.syncedDays} days for this month.`,
        syncedDays: result.syncedDays 
      });
    }

    return new NextResponse("Invalid sync mode. Must be 'single' or 'bulk'", { status: 400 });
  } catch (error: any) {
    console.error("[SYNC_API_ROUTE] Failed to sync:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
