import { db, users } from "./index";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const username = "admin";
  const password = "password123";
  const email = "admin@example.com";

  console.log(`👤 Creating admin user: ${username}...`);

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      username,
      email,
      passwordHash,
      role: "superadmin",
      status: "active",
    }).onConflictDoNothing().returning();

    if (newUser.length > 0) {
      console.log("✅ Admin user created successfully!");
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log("⚠️ User already exists or could not be created.");
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
