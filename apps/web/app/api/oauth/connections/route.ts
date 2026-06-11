import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db, oauthConnections } from '@repo/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connections = await db.select({
      id: oauthConnections.id,
      email: oauthConnections.email,
      provider: oauthConnections.provider,
      updatedAt: oauthConnections.updatedAt,
    })
    .from(oauthConnections)
    .where(eq(oauthConnections.userId, session.user.id));

    return NextResponse.json(connections);
  } catch (error: any) {
    console.error('[OAUTH_CONNECTIONS_LIST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
