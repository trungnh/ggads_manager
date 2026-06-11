import { NextResponse } from "next/server";
import { db, telegramConnections } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { TelegramService } from "@repo/services";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { connectionId, botToken, chatId, message } = body;

    let targetBotToken = botToken;
    let targetChatId = chatId;
    let connectionName = "Thử nghiệm trực tiếp";

    if (connectionId) {
      const conn = await db.query.telegramConnections.findFirst({
        where: and(
          eq(telegramConnections.id, connectionId),
          eq(telegramConnections.userId, session.user.id)
        )
      });

      if (!conn) {
        return new NextResponse("Telegram connection not found or unauthorized", { status: 404 });
      }

      targetBotToken = conn.botToken;
      targetChatId = conn.chatId;
      connectionName = conn.name;
    }

    if (!targetBotToken || !targetChatId) {
      return new NextResponse("Missing connection ID or credentials (botToken, chatId)", { status: 400 });
    }

    const testMsg = message || `<b>⚡ GGAds Manager - Tin nhắn thử nghiệm!</b>\n\n` +
                              `Kết nối: <b>${connectionName}</b>\n` +
                              `Chat ID: <code>${targetChatId}</code>\n\n` +
                              `<i>Nếu bạn nhận được tin nhắn này, cấu hình Telegram của bạn đang hoạt động 100% chính xác!</i>`;

    await TelegramService.sendMessageWithBot(targetBotToken.trim(), targetChatId.trim(), testMsg);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to send test Telegram message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message. Please verify Bot Token & Chat ID." },
      { status: 400 }
    );
  }
}
