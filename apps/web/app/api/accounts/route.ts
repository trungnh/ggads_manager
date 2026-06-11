import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db, userAdsAccounts, adsAccounts } from '@repo/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`[API_ACCOUNTS] Fetching for user: ${session.user.id}`);
    
    // Fetch only accounts already connected to this user
    let accounts = await db.select({
      id: adsAccounts.id,
      name: adsAccounts.name,
      customerId: adsAccounts.customerId,
      status: adsAccounts.status
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, session.user.id));

    // Fallback: If no accounts linked to user, return all ACTIVE accounts (for debugging)
    if (accounts.length === 0) {
      console.log(`[API_ACCOUNTS] No accounts linked to user, returning all active accounts as fallback.`);
      accounts = await db.select({
        id: adsAccounts.id,
        name: adsAccounts.name,
        customerId: adsAccounts.customerId,
        status: adsAccounts.status
      })
      .from(adsAccounts)
      .where(eq(adsAccounts.status, 'ACTIVE'));
    }

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('[API_ACCOUNTS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
