import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db, oauthConnections } from '@repo/db';
import { eq, and } from 'drizzle-orm';
import { TokenService } from '@repo/shared';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');
  if (!connectionId) {
    return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
  }

  try {
    // 1. Verify connection ownership
    const connection = await db.query.oauthConnections.findFirst({
      where: and(
        eq(oauthConnections.id, connectionId),
        eq(oauthConnections.userId, session.user.id)
      )
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // 2. Retrieve valid token (using TokenService to refresh if expired)
    const token = await TokenService.getValidToken(connectionId);

    return NextResponse.json({ accessToken: token });
  } catch (error: any) {
    console.error('[OAUTH_TOKEN_API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
