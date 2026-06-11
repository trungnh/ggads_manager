import { NextResponse } from "next/server";
import { db, telegramPerformanceReports, telegramConnections } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const reports = await db.query.telegramPerformanceReports.findMany({
      where: eq(telegramPerformanceReports.userId, session.user.id),
      with: {
        connection: true,
      },
      orderBy: (reps, { desc }) => [desc(reps.createdAt)],
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error("Failed to fetch Telegram reports:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, connectionId, frequencyMinutes, hoursStart, hoursEnd, customMessage } = body;

    if (!name || !connectionId) {
      return new NextResponse("Missing required fields: name, connectionId", { status: 400 });
    }

    // Verify connection exists and belongs to the user
    const conn = await db.query.telegramConnections.findFirst({
      where: and(
        eq(telegramConnections.id, connectionId),
        eq(telegramConnections.userId, session.user.id)
      )
    });

    if (!conn) {
      return new NextResponse("Invalid or unauthorized Telegram connection", { status: 400 });
    }

    const newReport = await db.insert(telegramPerformanceReports).values({
      userId: session.user.id,
      connectionId,
      name,
      isEnabled: true,
      frequencyMinutes: frequencyMinutes ? Number(frequencyMinutes) : 60,
      hoursStart: hoursStart || "06:00",
      hoursEnd: hoursEnd || "22:00",
      customMessage: customMessage || null,
    }).returning();

    return NextResponse.json({ report: newReport[0] });
  } catch (error: any) {
    console.error("Failed to create Telegram performance report:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, connectionId, isEnabled, frequencyMinutes, hoursStart, hoursEnd, customMessage } = body;

    if (!id) {
      return new NextResponse("Missing report ID", { status: 400 });
    }

    // Verify connection if it is changing
    if (connectionId) {
      const conn = await db.query.telegramConnections.findFirst({
        where: and(
          eq(telegramConnections.id, connectionId),
          eq(telegramConnections.userId, session.user.id)
        )
      });
      if (!conn) {
        return new NextResponse("Invalid or unauthorized Telegram connection", { status: 400 });
      }
    }

    const updated = await db.update(telegramPerformanceReports)
      .set({
        name,
        connectionId,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
        frequencyMinutes: frequencyMinutes !== undefined ? Number(frequencyMinutes) : undefined,
        hoursStart,
        hoursEnd,
        customMessage,
        updatedAt: new Date(),
      })
      .where(and(
        eq(telegramPerformanceReports.id, id),
        eq(telegramPerformanceReports.userId, session.user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return new NextResponse("Report schedule not found or unauthorized", { status: 404 });
    }

    return NextResponse.json({ report: updated[0] });
  } catch (error: any) {
    console.error("Failed to update Telegram performance report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return new NextResponse("Missing report ID", { status: 400 });
    }

    const deleted = await db.delete(telegramPerformanceReports)
      .where(and(
        eq(telegramPerformanceReports.id, id),
        eq(telegramPerformanceReports.userId, session.user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return new NextResponse("Report schedule not found or unauthorized", { status: 404 });
    }

    return NextResponse.json({ success: true, report: deleted[0] });
  } catch (error: any) {
    console.error("Failed to delete Telegram performance report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
