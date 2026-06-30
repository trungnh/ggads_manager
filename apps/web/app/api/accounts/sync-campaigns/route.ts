import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, adsAccounts } from "@repo/db";
import { CampaignSyncService } from "@repo/services";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { customerId, startDate, endDate } = body;

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  const start = startDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const end = endDate || start;

  try {
    // Get adsAccountId from customerId
    const [account] = await db.select({ id: adsAccounts.id })
      .from(adsAccounts)
      .where(eq(adsAccounts.customerId, customerId))
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: "Account not found in database. Sync account first." }, { status: 404 });
    }

    console.log(`[MANUAL_SYNC] Triggering sync for ${customerId} from ${start} to ${end}`);
    
    // Loop through dates
    let current = new Date(start);
    const endObj = new Date(end);
    
    while (current <= endObj) {
      const dateStr = current.toISOString().split('T')[0];
      await CampaignSyncService.syncCampaigns(session.user.id, account.id, customerId, dateStr);
      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MANUAL_SYNC] Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to sync campaigns",
      stack: error.stack,
      details: error.toString()
    }, { status: 500 });
  }
}
