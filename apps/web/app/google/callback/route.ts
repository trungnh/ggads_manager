import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db, oauthConnections } from '@repo/db';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    let email = '';
    if (tokens.id_token) {
      try {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        email = ticket.getPayload()?.email || '';
      } catch (e) {
        console.error('Failed to verify id_token', e);
        try {
          const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
          email = payload.email || '';
        } catch (inner) {}
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Failed to retrieve email from Google' }, { status: 400 });
    }

    // Find existing connection to get its ID for cache invalidation
    const { and } = await import('drizzle-orm');
    const existingConn = await db.query.oauthConnections.findFirst({
      where: and(
        eq(oauthConnections.userId, session.user.id),
        eq(oauthConnections.provider, 'google'),
        eq(oauthConnections.email, email)
      )
    });

    // Save or update tokens in DB
    await db.insert(oauthConnections)
      .values({
        userId: session.user.id,
        provider: 'google',
        email: email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || '',
        expiresAt: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)),
        status: 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: [oauthConnections.userId, oauthConnections.provider, oauthConnections.email],
        set: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)),
          status: 'ACTIVE',
          updatedAt: new Date(),
        }
      });

    // Invalidate Redis cache
    try {
      const { Redis } = await import('ioredis');
      const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
      });
      if (existingConn) {
        await redisClient.del(`token:conn:${existingConn.id}`);
      }
      await redisClient.del(`token:user:${session.user.id}:${email}`);
      await redisClient.quit().catch(() => {});
    } catch (redisErr) {
      console.error('Failed to invalidate Redis token cache in callback:', redisErr);
    }

    // Redirect to accounts page to start sync
    return NextResponse.redirect(new URL('/accounts/new?connected=true', req.url));
  } catch (error) {
    console.error('OAuth Error:', error);
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 });
  }
}
