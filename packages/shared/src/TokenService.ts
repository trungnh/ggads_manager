import { Redis } from 'ioredis';
import { db, oauthConnections } from '@repo/db';
import { eq, and } from 'drizzle-orm';

// Fallback logic for Redis connection
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
});

const LOCK_TTL_SECONDS = 10;
const CACHE_BUFFER_MINUTES = 5;

export class TokenService {
  /**
   * Retrieves a valid access token for a specific OAuth connection.
   */
  static async getValidToken(connectionId: string): Promise<string> {
    const cacheKey = `token:conn:${connectionId}`;
    const cachedToken = await redisClient.get(cacheKey);

    if (cachedToken) {
      return cachedToken;
    }

    // [2] DB lookup
    const results = await db.select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);
    const tokenRecord = results[0];

    if (!tokenRecord) {
      throw new Error('No OAuth connection found');
    }

    return this.processTokenRecord(tokenRecord, cacheKey);
  }

  /**
   * Retrieves a valid access token for a specific user and email.
   */
  static async getValidTokenByEmail(userId: string, email: string): Promise<string> {
    const cacheKey = `token:user:${userId}:${email}`;
    const cachedToken = await redisClient.get(cacheKey);

    if (cachedToken) {
      return cachedToken;
    }

    const results = await db.select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.email, email)
        )
      )
      .limit(1);
    const tokenRecord = results[0];

    if (!tokenRecord) {
      throw new Error(`No Google token found for user ${userId} and email ${email}`);
    }

    return this.processTokenRecord(tokenRecord, cacheKey);
  }

  private static async processTokenRecord(tokenRecord: any, cacheKey: string): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expiresAt);
    const timeUntilExpiryMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

    // [3] Check if token is still valid (with buffer)
    if (timeUntilExpiryMinutes > CACHE_BUFFER_MINUTES) {
      const ttl = Math.floor(timeUntilExpiryMinutes * 60);
      await redisClient.setex(cacheKey, ttl, tokenRecord.accessToken);
      return tokenRecord.accessToken;
    }

    // [4] Needs refresh -> acquire distributed lock
    const lockKey = `lock:${cacheKey}`;
    const acquiredLock = await redisClient.set(lockKey, 'locked', 'EX', LOCK_TTL_SECONDS, 'NX');

    if (!acquiredLock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.processTokenRecord(tokenRecord, cacheKey); // Retry
    }

    try {
      // [5] Double-check DB
      const doubleCheckRecord = await db.query.oauthConnections.findFirst({
        where: eq(oauthConnections.id, tokenRecord.id),
      });

      if (doubleCheckRecord && (doubleCheckRecord.expiresAt.getTime() - now.getTime()) / (1000 * 60) > CACHE_BUFFER_MINUTES) {
        return doubleCheckRecord.accessToken;
      }

      // [6] Call Google OAuth to refresh
      const refreshedData = await this.refreshGoogleToken(tokenRecord.refreshToken);

      // [7] Update DB + Update Redis Cache
      const newExpiresAt = new Date(Date.now() + refreshedData.expires_in * 1000);
      
      await db.update(oauthConnections).set({
        accessToken: refreshedData.access_token,
        expiresAt: newExpiresAt,
        status: 'ACTIVE',
        updatedAt: new Date(),
      }).where(eq(oauthConnections.id, tokenRecord.id));

      const ttl = Math.floor(refreshedData.expires_in - (CACHE_BUFFER_MINUTES * 60));
      await redisClient.setex(cacheKey, ttl, refreshedData.access_token);

      return refreshedData.access_token;
    } catch (error: any) {
      if (error.message?.includes('invalid_grant')) {
        // Mark connection as INVALID in DB
        await db.update(oauthConnections)
          .set({ status: 'INVALID', updatedAt: new Date() })
          .where(eq(oauthConnections.id, tokenRecord.id));
      }
      throw error;
    } finally {
      await redisClient.del(lockKey);
    }
  }

  private static async refreshGoogleToken(refreshToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not set');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Google API Error: ${data.error_description || data.error}`);
      }

      return data;
    } catch (e: any) {
      console.error('[TOKEN_REFRESH_ERROR]', e.message);
      throw e;
    }
  }
}
