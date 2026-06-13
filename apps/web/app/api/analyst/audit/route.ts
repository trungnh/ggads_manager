import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, adsHealthAuditLogs } from "@repo/db";
import { eq, desc } from "drizzle-orm";
import { HealthAuditService } from "@repo/services";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const adsAccountId = searchParams.get("adsAccountId");

    if (!adsAccountId) {
      return NextResponse.json({ error: "adsAccountId is required" }, { status: 400 });
    }

    // Fetch latest audit log
    const latestLog = await db.query.adsHealthAuditLogs.findFirst({
      where: eq(adsHealthAuditLogs.adsAccountId, adsAccountId),
      orderBy: desc(adsHealthAuditLogs.createdAt)
    });

    return NextResponse.json({ audit: latestLog || null });
  } catch (error: any) {
    console.error("GET /api/analyst/audit error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adsAccountId } = await req.json();

    if (!adsAccountId) {
      return NextResponse.json({ error: "adsAccountId is required" }, { status: 400 });
    }

    // Call the shared HealthAuditService
    const audit = await HealthAuditService.runAccountAudit(adsAccountId, "MANUAL");

    return NextResponse.json({ success: true, audit });
  } catch (error: any) {
    console.error("POST /api/analyst/audit error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
