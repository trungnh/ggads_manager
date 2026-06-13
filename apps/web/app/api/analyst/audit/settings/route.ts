import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, adsAccounts } from "@repo/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adsAccountId, healthAuditAutoEnabled, healthAuditCronFrequency } = await req.json();

    if (!adsAccountId) {
      return NextResponse.json({ error: "adsAccountId is required" }, { status: 400 });
    }

    // Update settings in database
    await db.update(adsAccounts)
      .set({
        healthAuditAutoEnabled: !!healthAuditAutoEnabled,
        healthAuditCronFrequency: healthAuditCronFrequency || "WEEKLY"
      })
      .where(eq(adsAccounts.id, adsAccountId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/analyst/audit/settings error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
