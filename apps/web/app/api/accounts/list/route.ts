import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CustomersService } from '@repo/google-ads';
import { db, userAdsAccounts, adsAccounts } from '@repo/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  console.log("[LIST_ACCOUNTS] Starting...");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const customersService = new CustomersService(session.user.id);
    console.log("[LIST_ACCOUNTS] Fetching all hierarchical accounts...");
    
    // 1. Fetch ALL accounts from Google
    const googleAccounts = await customersService.listAllAccessibleAccounts();
    
    // 2. Fetch ALREADY SYNCED accounts for this user from DB
    const syncedRecords = await db.select({ 
      customerId: adsAccounts.customerId 
    })
    .from(adsAccounts)
    .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
    .where(eq(userAdsAccounts.userId, session.user.id));

    const syncedIds = new Set(syncedRecords.map(r => r.customerId));

    // 3. Mark accounts as synced if they exist in DB
    const results = googleAccounts.map(acc => ({
      ...acc,
      isSynced: syncedIds.has(acc.id)
    }));

    console.log(`[LIST_ACCOUNTS] Returning ${results.length} accounts (${syncedIds.size} already synced)`);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[LIST_ACCOUNTS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
