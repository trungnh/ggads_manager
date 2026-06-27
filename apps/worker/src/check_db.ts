import { db, campaignsSnapshot, campaignSettings } from '@repo/db';
import { eq, and } from 'drizzle-orm';

async function check() {
  console.log("Checking DB...");
  const snapshots = await db.select()
    .from(campaignsSnapshot)
    .where(and(
      eq(campaignsSnapshot.campaignId, '23936441912'),
      eq(campaignsSnapshot.date, '2026-06-27')
    ));
  
  console.log("=== Snapshots for 2026-06-27 ===");
  console.log(JSON.stringify(snapshots, null, 2));

  const settings = await db.select()
    .from(campaignSettings)
    .where(eq(campaignSettings.campaignId, '23936441912'));
  
  console.log("=== Settings ===");
  console.log(JSON.stringify(settings, null, 2));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
