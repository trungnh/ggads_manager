import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, users } from "@repo/db";
import { desc } from "drizzle-orm";
import UserManagementClient from "@/components/admin/UserManagementClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect("/");
  }

  // Lấy danh sách users chưa bị xóa xếp theo ngày tạo giảm dần
  const allUsers = await db.query.users.findMany({
    where: (users, { isNull }) => isNull(users.deletedAt),
    orderBy: [desc(users.createdAt)]
  });

  // Serialize Date objects thành ISO string để tránh lỗi serialize của Next.js Server Component
  const serializedUsers = allUsers.map((user) => ({
    ...user,
    role: user.role || 'user',
    status: user.status || 'active',
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
    expireAt: user.expireAt ? user.expireAt.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
  }));

  return (
    <UserManagementClient 
      initialUsers={serializedUsers as any} 
      currentUser={session.user} 
    />
  );
}

