import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, userAdsAccounts } from "@repo/db";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    // Only delete the link between the user and the account. 
    // We keep the account in adsAccounts table in case other users are using it.
    await db.delete(userAdsAccounts)
      .where(and(
        eq(userAdsAccounts.userId, session.user.id),
        eq(userAdsAccounts.adsAccountId, id)
      ));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete account link:", error);
    return new NextResponse(JSON.stringify({ error: error.message || "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
