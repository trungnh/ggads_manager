import { NextResponse } from "next/server";
import { db, telegramConnections } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { TelegramService } from "@repo/services";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const connections = await db.query.telegramConnections.findMany({
      where: eq(telegramConnections.userId, session.user.id),
      orderBy: (conns, { desc }) => [desc(conns.createdAt)],
    });

    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error("Failed to fetch Telegram connections:", error);
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
    const { name, botToken, chatId } = body;

    if (!name || !botToken || !chatId) {
      return new NextResponse("Missing required fields: name, botToken, chatId", { status: 400 });
    }

    // 1. Validate credentials by sending a test message
    try {
      const testMsg = `<b>🤖 GGAds Manager - Kết nối thành công!</b>\n\n` +
                      `Tên kết nối: <b>${name}</b>\n` +
                      `Chat ID: <code>${chatId}</code>\n\n` +
                      `<i>Kết nối này hiện đã hoạt động và sẵn sàng nhận thông báo tối ưu & báo cáo P&L.</i>`;
      await TelegramService.sendMessageWithBot(botToken.trim(), chatId.trim(), testMsg);
    } catch (err: any) {
      console.error("Failed to verify Telegram credentials:", err);
      return NextResponse.json(
        { error: `Không thể gửi tin nhắn thử nghiệm: ${err.message}. Vui lòng kiểm tra lại Bot Token và Chat ID (Bot phải được thêm vào nhóm/kênh trước).` },
        { status: 400 }
      );
    }

    // 2. Insert into database
    const newConn = await db.insert(telegramConnections).values({
      userId: session.user.id,
      name: name.trim(),
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      status: "active",
    }).returning();

    return NextResponse.json({ connection: newConn[0] });
  } catch (error: any) {
    console.error("Failed to create Telegram connection:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
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
      return new NextResponse("Missing connection ID", { status: 400 });
    }

    const deleted = await db.delete(telegramConnections)
      .where(and(
        eq(telegramConnections.id, id),
        eq(telegramConnections.userId, session.user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return new NextResponse("Connection not found or unauthorized", { status: 404 });
    }

    return NextResponse.json({ success: true, connection: deleted[0] });
  } catch (error: any) {
    console.error("Failed to delete Telegram connection:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
