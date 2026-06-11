import { db, notificationSettings, telegramConnections } from '@repo/db';
import { eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
export const notificationQueue = new Queue('NotificationQueue', { connection: redisConnection });

export class TelegramService {
  private static readonly BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  private static readonly API_URL = `https://api.telegram.org/bot${TelegramService.BOT_TOKEN}`;

  /**
   * Sends a HTML-formatted message to a specific chat ID using a default bot.
   */
  static async sendMessage(chatId: string, text: string) {
    if (!this.BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN is not set. Cannot send message using default bot.");
      return;
    }

    const response = await fetch(`${this.API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API Error: ${response.status} - ${error}`);
    }
  }

  /**
   * Sends a HTML-formatted message using a dynamic custom bot token.
   */
  static async sendMessageWithBot(botToken: string, chatId: string, text: string) {
    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API Error: ${response.status} - ${error}`);
    }
  }

  /**
   * Queues a notification to be sent by the worker using a specific connection's bot.
   */
  static async queueConnectionNotification(connectionId: string, title: string, message: string) {
    const conn = await db.query.telegramConnections.findFirst({
      where: eq(telegramConnections.id, connectionId)
    });

    if (!conn) {
      console.warn(`Telegram connection ${connectionId} not found.`);
      return;
    }

    await notificationQueue.add('send-telegram', {
      botToken: conn.botToken,
      chatId: conn.chatId,
      title,
      message,
      userId: conn.userId
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }

  /**
   * Queues a notification using legacy default user chat settings (Fallback)
   */
  static async queueNotification(userId: string, title: string, message: string) {
    const settings = await db.query.notificationSettings.findFirst({
      where: eq(notificationSettings.userId, userId)
    });

    if (!settings || !settings.telegramChatId) {
      console.warn(`User ${userId} does not have a linked Telegram account.`);
      return;
    }

    await notificationQueue.add('send-telegram', {
      chatId: settings.telegramChatId,
      title,
      message,
      userId
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }

  /**
   * Renders a message template by substituting custom variables.
   * Supports both {variable} and {{variable}} syntaxes.
   */
  static renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const formattedValue = value !== undefined && value !== null ? value.toString() : '';
      
      // Replace {variable}
      const regexSingle = new RegExp(`{${key}}`, 'g');
      rendered = rendered.replace(regexSingle, formattedValue);
      
      // Replace {{variable}}
      const regexDouble = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regexDouble, formattedValue);
    }
    return rendered;
  }
}
