import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/db";
import { placementExclusionLogs, adsAccounts } from "@repo/db/src/schema";
import { eq, inArray, and } from "drizzle-orm";
import { MutationsService } from "@repo/google-ads/src/mutations";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, logIds } = await req.json();

    if (!accountId || !logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return NextResponse.json({ error: "accountId and logIds array are required" }, { status: 400 });
    }

    // 1. Fetch matching pending logs
    const pendingLogs = await db.query.placementExclusionLogs.findMany({
      where: and(
        eq(placementExclusionLogs.adsAccountId, accountId),
        inArray(placementExclusionLogs.id, logIds),
        eq(placementExclusionLogs.status, "pending")
      )
    });

    if (pendingLogs.length === 0) {
      return NextResponse.json({ error: "No pending placements found to exclude" }, { status: 404 });
    }

    const urlsToExclude = pendingLogs.map(log => log.placementUrl);

    // 2. Fetch the Ads Account details
    const account = await db.query.adsAccounts.findFirst({
      where: eq(adsAccounts.id, accountId)
    });

    if (!account) {
      return NextResponse.json({ error: "Ads Account not found" }, { status: 404 });
    }

    let executionMessage = "";
    let isSimulated = false;

    // 3. Check if account is a demo account or has no active oauthConnectionId
    if (!account.oauthConnectionId || account.customerId.startsWith("123")) {
      isSimulated = true;
      executionMessage = `[MÔ PHỎNG] Đã gửi lệnh loại trừ ${urlsToExclude.length} vị trí hiển thị lên Google Ads thành công cho tài khoản ${account.name} (Customer ID: ${account.customerId}).`;
    } else {
      // Execute real exclusion via MutationsService
      const mutationsService = new MutationsService(
        account.oauthConnectionId,
        account.customerId,
        account.loginCustomerId || undefined
      );

      await mutationsService.excludePlacementsAtAccountLevel(urlsToExclude);
      executionMessage = `Đã loại trừ thành công ${urlsToExclude.length} vị trí hiển thị trên tài khoản Google Ads ${account.name} (${account.customerId})!`;
    }

    // 4. Update the DB logs status to 'excluded' and resolvedAt to now
    await db.update(placementExclusionLogs)
      .set({
        status: "excluded",
        resolvedAt: new Date()
      })
      .where(
        and(
          eq(placementExclusionLogs.adsAccountId, accountId),
          inArray(placementExclusionLogs.id, logIds)
        )
      );

    return NextResponse.json({
      success: true,
      message: executionMessage,
      isSimulated,
      excludedUrls: urlsToExclude
    });

  } catch (error: any) {
    console.error("POST /api/optimizer/placements/exclude error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
