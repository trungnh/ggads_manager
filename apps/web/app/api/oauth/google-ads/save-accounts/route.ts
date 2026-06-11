import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db, adsAccounts, userAdsAccounts } from '@repo/db';
import { eq, inArray } from 'drizzle-orm';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { connectionId, accounts } = await req.json();

  if (!connectionId || !Array.isArray(accounts)) {
    return NextResponse.json({ error: 'connectionId and accounts array are required' }, { status: 400 });
  }

  try {
    const userId = session.user.id;
    const { oauthConnections } = await import('@repo/db');
    const { eq, and } = await import('drizzle-orm');

    // 1. Verify connection ownership
    const connection = await db.query.oauthConnections.findFirst({
      where: and(
        eq(oauthConnections.id, connectionId),
        eq(oauthConnections.userId, userId)
      )
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found or unauthorized' }, { status: 403 });
    }

    for (const acc of accounts) {
      // 1. Upsert ads_accounts
      const [adsAccount] = await db.insert(adsAccounts).values({
        customerId: acc.id,
        name: acc.name,
        currencyCode: acc.currency,
        timeZone: acc.timeZone,
        loginCustomerId: acc.loginCustomerId || acc.id,
        oauthConnectionId: connectionId,
        status: 'ACTIVE',
      }).onConflictDoUpdate({
        target: [adsAccounts.customerId],
        set: {
          name: acc.name,
          loginCustomerId: acc.loginCustomerId || acc.id,
          oauthConnectionId: connectionId,
        }
      }).returning();

      // 2. Link to user
      await db.insert(userAdsAccounts).values({
        userId: userId,
        adsAccountId: adsAccount.id,
      }).onConflictDoNothing();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[GOOGLE_ADS_SAVE_ACCOUNTS]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
