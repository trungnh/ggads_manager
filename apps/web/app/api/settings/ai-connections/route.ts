import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/db";
import { aiConnections } from "@repo/db/src/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get('provider');

    if (!provider) {
      // Return all active AI connections for this user
      const all = await db.query.aiConnections.findMany({
        where: eq(aiConnections.userId, session.user.id)
      });
      return NextResponse.json({
        data: all.map(c => ({
          provider: c.provider,
          status: c.status,
          hasKey: true,
          maskedKey: '***'
        }))
      });
    }

    const existing = await db.query.aiConnections.findFirst({
      where: and(
        eq(aiConnections.userId, session.user.id),
        eq(aiConnections.provider, provider)
      )
    });

    if (existing) {
      return NextResponse.json({
        data: {
          provider: existing.provider,
          status: existing.status,
          hasKey: true,
          maskedKey: '***'
        }
      });
    }

    return NextResponse.json({
      data: {
        provider,
        status: 'none',
        hasKey: false,
        maskedKey: ''
      }
    });
  } catch (error) {
    console.error("GET /api/settings/ai-connections error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, apiKey } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API Key are required" }, { status: 400 });
    }

    const encryptedKey = encrypt(apiKey);

    const existing = await db.query.aiConnections.findFirst({
      where: and(
        eq(aiConnections.userId, session.user.id),
        eq(aiConnections.provider, provider)
      )
    });

    if (existing) {
      await db.update(aiConnections)
        .set({ apiKey: encryptedKey, status: 'active', updatedAt: new Date() })
        .where(eq(aiConnections.id, existing.id));
    } else {
      await db.insert(aiConnections).values({
        userId: session.user.id,
        provider,
        apiKey: encryptedKey,
        status: 'active'
      });
    }

    return NextResponse.json({ success: true, message: "API Key saved successfully" });
  } catch (error) {
    console.error("POST /api/settings/ai-connections error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    await db.delete(aiConnections)
      .where(
        and(
          eq(aiConnections.userId, session.user.id),
          eq(aiConnections.provider, provider)
        )
      );

    return NextResponse.json({ success: true, message: "API Key removed successfully" });
  } catch (error) {
    console.error("DELETE /api/settings/ai-connections error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
