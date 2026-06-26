import { NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // 1. Validation đầu vào
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ các trường thông tin" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "Tên đăng nhập phải có ít nhất 3 ký tự" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Địa chỉ email không hợp lệ" }, { status: 400 });
    }

    // 2. Kiểm tra tài khoản đã tồn tại chưa
    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.username, username),
        eq(users.email, email)
      )
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ error: "Tên đăng nhập đã được sử dụng" }, { status: 400 });
      }
      return NextResponse.json({ error: "Địa chỉ email đã được sử dụng" }, { status: 400 });
    }

    // 3. Khởi tạo dữ liệu người dùng mới
    const passwordHash = await bcrypt.hash(password, 10);
    const expireAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 ngày dùng thử
    const verificationToken = crypto.randomUUID();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Hết hạn trong 24 giờ

    await db.insert(users).values({
      username,
      email,
      passwordHash,
      role: "user",
      status: "inactive", // inactive cho đến khi xác minh thành công
      expireAt,
      isVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 4. Xây dựng link xác thực động dựa trên Request Host
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const verifyLink = `${baseUrl}/api/auth/verify?token=${verificationToken}`;

    // 5. Gửi email xác thực
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"Ads Manager" <noreply@ggads.nongnghiephd.com>`;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: smtpFrom,
        to: email,
        subject: "Xác minh tài khoản Ads Manager",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #2563eb; text-align: center;">Kích hoạt tài khoản Ads Manager</h2>
            <p>Chào bạn,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại Ads Manager. Tài khoản của bạn mặc định được cấp <strong>15 ngày dùng thử miễn phí</strong>.</p>
            <p>Vui lòng nhấp vào liên kết dưới đây để xác thực địa chỉ email và kích hoạt tài khoản của bạn:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">Liên kết này sẽ hết hạn trong vòng 24 giờ. Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết này vào trình duyệt của mình:</p>
            <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${verifyLink}</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 11px; text-align: center;">Đây là email tự động, vui lòng không phản hồi email này.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Verification email sent to ${email}`);
    } else {
      console.log(`[SMTP_MOCK] SMTP is not configured. Verification Link: ${verifyLink}`);
    }

    return NextResponse.json({ success: true, message: "Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt tài khoản." });
  } catch (error: any) {
    console.error("[REGISTER_ERROR] Error creating user:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi đăng ký tài khoản" }, { status: 500 });
  }
}
