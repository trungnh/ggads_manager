import { NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq, or } from "drizzle-orm";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Định nghĩa Schema validate cho payload tạo user
const createUserSchema = z.object({
  username: z.string().min(3, "Username phải có ít nhất 3 ký tự").max(30).regex(/^[a-zA-Z0-9_]+$/, "Username chỉ chứa chữ, số và dấu gạch dưới"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.enum(["user", "admin", "superadmin"]).default("user"),
  expireAt: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const allUsers = await db.query.users.findMany({
      where: (users, { isNull }) => isNull(users.deletedAt),
      orderBy: (users, { desc }) => [desc(users.createdAt)]
    });

    // Trả về danh sách user và loại bỏ passwordHash để đảm bảo bảo mật
    const safeUsers = allUsers.map(({ passwordHash, ...user }) => user);

    return NextResponse.json({ users: safeUsers });
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    
    // 1. Validate payload
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const { username, email, password, role, expireAt } = validation.data;

    // 2. Kiểm tra quyền hạn nâng vai trò (Role Elevation Guard)
    // Chỉ superadmin mới được phép tạo admin hoặc superadmin khác
    if ((role === 'admin' || role === 'superadmin') && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: "Chỉ Superadmin mới được quyền tạo tài khoản Admin/Superadmin" }, { status: 403 });
    }

    // 3. Kiểm tra trùng lặp username hoặc email
    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.username, username),
        eq(users.email, email)
      )
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ error: "Username đã tồn tại trên hệ thống" }, { status: 400 });
      }
      if (existingUser.email === email) {
        return NextResponse.json({ error: "Email đã tồn tại trên hệ thống" }, { status: 400 });
      }
    }

    // 4. Hash mật khẩu bằng bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Lưu vào Database
    const newUser = await db.insert(users).values({
      username,
      email,
      passwordHash,
      role,
      expireAt: expireAt ? new Date(expireAt) : null,
      createdBy: session.user.id
    }).returning();

    // Loại bỏ passwordHash khỏi phản hồi trả về
    const { passwordHash: _, ...safeUser } = newUser[0];

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

