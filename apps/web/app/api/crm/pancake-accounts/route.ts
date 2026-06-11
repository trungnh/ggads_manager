import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, pancakeAccounts } from "@repo/db";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const accounts = await db.select()
      .from(pancakeAccounts)
      .where(eq(pancakeAccounts.userId, session.user.id))
      .orderBy(pancakeAccounts.createdAt);

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[PANCAKE_ACCOUNTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { id, name, shopId, apiKey } = body;

    if (!name || !shopId || !apiKey) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    if (id) {
      const [updated] = await db.update(pancakeAccounts)
        .set({ 
          name, 
          shopId, 
          apiKey,
          updatedAt: new Date() 
        })
        .where(and(eq(pancakeAccounts.id, id), eq(pancakeAccounts.userId, session.user.id)))
        .returning();
      return NextResponse.json(updated);
    } else {
      const [created] = await db.insert(pancakeAccounts)
        .values({
          userId: session.user.id,
          name,
          shopId,
          apiKey,
        })
        .returning();
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("[PANCAKE_ACCOUNTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return new NextResponse("Missing ID", { status: 400 });

    await db.delete(pancakeAccounts)
      .where(and(eq(pancakeAccounts.id, id), eq(pancakeAccounts.userId, session.user.id)));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PANCAKE_ACCOUNTS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
