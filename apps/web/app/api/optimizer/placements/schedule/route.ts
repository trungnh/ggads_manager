import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/db";
import { adsAccounts } from "@repo/db/src/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const account = await db.query.adsAccounts.findFirst({
      where: eq(adsAccounts.id, accountId)
    });

    if (!account) {
      return NextResponse.json({ error: "Ads Account không tìm thấy." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: account.placementsAutoExcludeEnabled || false,
        time: account.placementsAutoExcludeTime || "08:00",
        range: account.placementsAutoExcludeRange || "YESTERDAY",
        productContext: account.placementsProductContext || "",
        cpaThreshold: account.placementsCpaThreshold ?? 250000,
        scanFrequency: account.placementsScanFrequency ?? 15
      }
    });

  } catch (error: any) {
    console.error("GET /api/optimizer/placements/schedule error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, enabled, time, range, productContext, cpaThreshold, scanFrequency } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    // Server-side HH:MM format validation
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return NextResponse.json({ error: "Giờ thực hiện phải đúng định dạng HH:MM" }, { status: 400 });
    }

    // Server-side Range validation
    if (range && range !== "YESTERDAY" && range !== "LAST_7_DAYS") {
      return NextResponse.json({ error: "Khoảng thời gian không hợp lệ. Chỉ chấp nhận YESTERDAY hoặc LAST_7_DAYS." }, { status: 400 });
    }

    // Update settings in database
    await db.update(adsAccounts)
      .set({
        placementsAutoExcludeEnabled: enabled ?? false,
        placementsAutoExcludeTime: time || "08:00",
        placementsAutoExcludeRange: range || "YESTERDAY",
        placementsProductContext: productContext || "",
        placementsCpaThreshold: cpaThreshold !== undefined ? Number(cpaThreshold) : 250000,
        placementsScanFrequency: scanFrequency !== undefined ? Number(scanFrequency) : 15
      })
      .where(eq(adsAccounts.id, accountId));

    return NextResponse.json({
      success: true,
      message: "Cấu hình tự động quét và chặn kênh rác đã được lưu thành công!"
    });

  } catch (error: any) {
    console.error("POST /api/optimizer/placements/schedule error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
