import { ScheduleEngine } from '@repo/services';
import { db, campaignSchedules, adsAccounts, userAdsAccounts, users } from '@repo/db';

async function test() {
  console.log('--- Seeding mock data ---');
  
  // Create a dummy user
  const user = await db.insert(users).values({
    email: `test_${Date.now()}@test.com`,
    username: `test_${Date.now()}`,
    passwordHash: 'dummy'
  }).returning();
  
  const adsAccount = await db.insert(adsAccounts).values({
    customerId: '1234567890',
    name: 'Test Account',
    status: 'ACTIVE'
  }).returning();

  await db.insert(userAdsAccounts).values({
    userId: user[0].id,
    adsAccountId: adsAccount[0].id
  });

  const now = new Date();
  const roundedMinutes = Math.floor(now.getMinutes() / 5) * 5;
  const executionTime = `${String(now.getHours()).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

  console.log(`Current time slot: ${executionTime}`);

  const schedule = await db.insert(campaignSchedules).values({
    adsAccountId: adsAccount[0].id,
    name: 'Test Schedule',
    actionType: 'set_budget',
    budgetValue: '50000',
    executionTime: executionTime,
    campaignIds: ['camp_1', 'camp_2'],
    status: 'active'
  }).returning();

  console.log('--- Testing ScheduleEngine (MOCK MODE) ---');
  await ScheduleEngine.executeAllSchedules(true);

  console.log('--- Cleanup ---');
  // Clean up is not strictly necessary for local DB but good practice
  process.exit(0);
}

test().catch(console.error);
