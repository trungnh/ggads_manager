import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CustomersService } from '@repo/google-ads';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
  }

  try {
    const userId = session.user.id;
    const { db, oauthConnections } = await import('@repo/db');
    const { eq, and } = await import('drizzle-orm');

    // 1. Verify that this connection actually belongs to the user
    const connection = await db.query.oauthConnections.findFirst({
      where: and(
        eq(oauthConnections.id, connectionId),
        eq(oauthConnections.userId, userId)
      )
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found or unauthorized' }, { status: 403 });
    }

    // 2. Fetch ALREADY SYNCED accounts for this user from DB to mark them
    const { userAdsAccounts, adsAccounts } = await import('@repo/db');
    const syncedRecords = await db.select({ 
      customerId: adsAccounts.customerId 
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, userId));

    const syncedIds = new Set(syncedRecords.map(r => r.customerId));

    // 3. Proceed with discovery
    const customersService = new CustomersService(connectionId);
    const accounts = await customersService.listAllAccessibleAccounts();

    const results = accounts.map(acc => ({
      ...acc,
      isSynced: syncedIds.has(acc.id)
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[GOOGLE_ADS_LIST_ACCOUNTS]', error);
    if (error.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: 'Kết nối Google đã hết hạn hoặc bị hủy. Vui lòng kết nối lại.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
