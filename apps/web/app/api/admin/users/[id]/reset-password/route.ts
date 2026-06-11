import { NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema validate cho mật khẩu mới
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  
  // Kiểm tra quyền hạn admin hoặc superadmin
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    
    // 1. Validate payload
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Mật khẩu không hợp lệ" },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // 2. Kiểm tra xem người dùng có tồn tại trong hệ thống hay không
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // 3. Hash mật khẩu mới bằng bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Cập nhật vào Database
    await db.update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error: any) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
