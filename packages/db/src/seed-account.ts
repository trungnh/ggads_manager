import { db, adsAccounts, userAdsAccounts, users } from "./index";
import { eq } from "drizzle-orm";

async function seedAccount() {
  console.log("📊 Seeding test account...");

  try {
    const adminUser = await db.query.users.findFirst({
      where: eq(users.username, "admin")
    });

    if (!adminUser) {
      console.error("❌ Admin user not found!");
      return;
    }

    const customerId = "123-456-7890";
    const account = await db.insert(adsAccounts).values({
      customerId: customerId,
      name: "Test Ads Account",
      currencyCode: "VND",
      timeZone: "Asia/Ho_Chi_Minh",
      status: "ACTIVE",
    }).onConflictDoNothing().returning();

    const accountId = account.length > 0 ? account[0].id : (await db.query.adsAccounts.findFirst({ where: eq(adsAccounts.customerId, customerId) }))?.id;

    if (accountId) {
      await db.insert(userAdsAccounts).values({
        userId: adminUser.id,
        adsAccountId: accountId,
      }).onConflictDoNothing();
      console.log(`✅ Linked account ${customerId} to user admin.`);
    }

    console.log("🚀 Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seedAccount();
