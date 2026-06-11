import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, crmConnections } from "@repo/db";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const connections = await db.select()
      .from(crmConnections)
      .where(eq(crmConnections.userId, session.user.id))
      .orderBy(crmConnections.createdAt);

    return NextResponse.json(connections);
  } catch (error) {
    console.error("[CRM_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { id, name, type, config, oauthConnectionId, pancakeAccountId } = body;

    if (!name || !type || !config) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    if (id) {
      // Update
      const [updated] = await db.update(crmConnections)
        .set({ 
          name, 
          config, 
          oauthConnectionId: oauthConnectionId || null,
          pancakeAccountId: pancakeAccountId || null,
          updatedAt: new Date() 
        })
        .where(and(eq(crmConnections.id, id), eq(crmConnections.userId, session.user.id)))
        .returning();
      return NextResponse.json(updated);
    } else {
      // Create
      const [created] = await db.insert(crmConnections)
        .values({
          userId: session.user.id,
          oauthConnectionId: oauthConnectionId || null,
          pancakeAccountId: pancakeAccountId || null,
          name,
          type,
          config,
        })
        .returning();
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("[CRM_POST]", error);
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

    await db.delete(crmConnections)
      .where(and(eq(crmConnections.id, id), eq(crmConnections.userId, session.user.id)));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CRM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
