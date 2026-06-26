import { NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq, and, gte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const loginUrl = new URL("/login", `${protocol}://${host}`);

    if (!token) {
      loginUrl.searchParams.set("error", "verification_failed");
      return NextResponse.redirect(loginUrl);
    }

    // 1. Tìm người dùng có token hợp lệ và chưa hết hạn
    const userRecord = await db.query.users.findFirst({
      where: and(
        eq(users.verificationToken, token),
        gte(users.verificationTokenExpiresAt, new Date())
      )
    });

    if (!userRecord) {
      console.warn(`[VERIFY_ERROR] Invalid or expired verification token: ${token}`);
      loginUrl.searchParams.set("error", "verification_failed");
      return NextResponse.redirect(loginUrl);
    }

    // 2. Kích hoạt tài khoản
    await db.update(users)
      .set({
        isVerified: true,
        status: "active",
        verificationToken: null,
        verificationTokenExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userRecord.id));

    console.log(`[VERIFY_SUCCESS] User ${userRecord.username} verified successfully.`);
    loginUrl.searchParams.set("verified", "true");
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("[VERIFY_ERROR] Verification exception:", error);
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const loginUrl = new URL("/login", `${protocol}://${host}`);
    loginUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(loginUrl);
  }
}
