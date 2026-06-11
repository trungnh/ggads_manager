import { NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";

// Schema validation cho cập nhật thông tin user
const updateUserSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin", "superadmin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  expireAt: z.string().nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    
    // 1. Validate payload
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const data = validation.data;

    // 2. Chặn tự khóa chính mình qua API PUT
    if (id === session.user.id && data.status === 'inactive') {
      return NextResponse.json({ error: "Bạn không thể tự khóa tài khoản của chính mình" }, { status: 400 });
    }

    // 3. Quyền nâng vai trò: Chỉ superadmin mới được đổi vai trò sang admin/superadmin
    if (data.role && (data.role === 'admin' || data.role === 'superadmin') && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: "Chỉ Superadmin mới được quyền gán vai trò Admin/Superadmin" }, { status: 403 });
    }

    // 4. Lấy thông tin user hiện tại trong DB
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // 5. Chuẩn bị payload cập nhật an toàn
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.username !== undefined) updatePayload.username = data.username;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.role !== undefined) updatePayload.role = data.role;
    
    if (data.expireAt !== undefined) {
      updatePayload.expireAt = data.expireAt ? new Date(data.expireAt) : null;
    }

    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === 'inactive') {
        updatePayload.deletedAt = new Date();
      } else {
        updatePayload.deletedAt = null;
      }
    }

    // 6. Thực hiện update
    const updatedUser = await db.update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning();

    // Loại bỏ passwordHash khỏi kết quả trả về
    const { passwordHash: _, ...safeUser } = updatedUser[0];

    return NextResponse.json({ user: safeUser });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Chặn tự khóa chính mình qua API DELETE
  if (id === session.user.id) {
    return NextResponse.json({ error: "Bạn không thể tự khóa tài khoản của chính mình" }, { status: 400 });
  }

  try {
    const deletedUser = await db.update(users)
      .set({ 
        status: 'inactive', 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    if (deletedUser.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: deletedUser[0] });
  } catch (error: any) {
    console.error("Failed to delete (deactivate) user:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

