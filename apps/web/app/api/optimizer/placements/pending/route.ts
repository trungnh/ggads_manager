import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/db";
import { placementExclusionLogs } from "@repo/db/src/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    // Fetch pending placements for the specified account
    const pendingLogs = await db.query.placementExclusionLogs.findMany({
      where: (logs, { eq, and }) => and(
        eq(logs.adsAccountId, accountId),
        eq(logs.status, "pending")
      ),
      orderBy: [desc(placementExclusionLogs.costWasted)]
    });

    return NextResponse.json({ data: pendingLogs });
  } catch (error) {
    console.error("GET /api/optimizer/placements/pending error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
