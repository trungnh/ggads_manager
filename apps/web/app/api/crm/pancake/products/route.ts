import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, pancakeAccounts } from "@repo/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const page = searchParams.get("page") || "1";

    if (!accountId) return new NextResponse("Missing accountId", { status: 400 });

    const [account] = await db.select()
      .from(pancakeAccounts)
      .where(and(eq(pancakeAccounts.id, accountId), eq(pancakeAccounts.userId, session.user.id)))
      .limit(1);

    if (!account) return new NextResponse("Account not found", { status: 404 });

    // Official Pancake POS API call for products list (not variations)
    const url = `https://pos.pages.fm/api/v1/shops/${account.shopId}/products?api_key=${account.apiKey}&page=${page}&page_size=100`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PANCAKE_PRODUCTS_ERROR]", errorText);
      return NextResponse.json({ error: errorText, success: false }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[PANCAKE_PRODUCTS_GET]", error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
