import { db, ruleTemplates, notificationTemplates, users } from "./index";

async function testEnv() {
  console.log("🔍 Testing environment...");

  try {
    const rulesCount = await db.query.ruleTemplates.findMany();
    console.log(`✅ Rule templates: ${rulesCount.length}`);

    const notifsCount = await db.query.notificationTemplates.findMany();
    console.log(`✅ Notification templates: ${notifsCount.length}`);

    const usersCount = await db.query.users.findMany();
    console.log(`✅ Users: ${usersCount.length}`);

    if (usersCount.length === 0) {
      console.log("ℹ️ No users found. You might want to create one to login.");
    }

    console.log("🚀 Environment is UP and READY!");
  } catch (error) {
    console.error("❌ Environment test failed:", error);
  } finally {
    process.exit(0);
  }
}

testEnv();
