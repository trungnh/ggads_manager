'use client';

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, 
  ShieldAlert, 
  ShieldCheck, 
  Key, 
  Search, 
  UserCog, 
  Calendar,
  AlertTriangle,
  Trash2
} from "lucide-react";
import UserModal from "./UserModal";
import ResetPasswordModal from "./ResetPasswordModal";
import ConfirmBlockModal from "./ConfirmBlockModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'inactive';
  expireAt: string | null;
}

interface UserManagementClientProps {
  initialUsers: User[];
  currentUser: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
}

export default function UserManagementClient({
  initialUsers,
  currentUser,
}: UserManagementClientProps) {
  // State quản lý danh sách user cập nhật
  const [usersList, setUsersList] = useState<User[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals visibility states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Toast notification state tự chế premium
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Lọc danh sách user theo ô tìm kiếm ở Client-side
  const filteredUsers = usersList.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  // Action: Mở Modal Tạo mới
  const handleCreateClick = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  // Action: Mở Modal Chỉnh sửa
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  // Action: Mở Modal Đổi mật khẩu
  const handleResetPasswordClick = (user: User) => {
    setSelectedUser(user);
    setIsResetModalOpen(true);
  };

  // Action: Mở Modal Khóa/Mở khóa
  const handleToggleStatusClick = (user: User) => {
    // Chặn khóa chính mình ở UI
    if (user.id === currentUser.id) {
      showToast("Bạn không thể tự khóa tài khoản của chính mình", "error");
      return;
    }
    setSelectedUser(user);
    setIsConfirmModalOpen(true);
  };

  // Action: Mở Modal Xóa
  const handleDeleteClick = (user: User) => {
    // Chặn xóa chính mình ở UI
    if (user.id === currentUser.id) {
      showToast("Bạn không thể tự xóa tài khoản của chính mình", "error");
      return;
    }
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Callback API: Lưu User (Tạo mới hoặc Cập nhật)
  const handleSaveUser = async (formData: any) => {
    const isEdit = !!selectedUser;
    const url = isEdit 
      ? `/api/admin/users/${selectedUser.id}` 
      : `/api/admin/users`;
    
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể thực hiện tác vụ");
    }

    const savedUser = data.user;

    if (isEdit) {
      // Cập nhật local state
      setUsersList((prev) =>
        prev.map((u) => (u.id === savedUser.id ? savedUser : u))
      );
      showToast(`Đã cập nhật tài khoản @${savedUser.username} thành công`);
    } else {
      // Thêm mới vào đầu danh sách local state
      setUsersList((prev) => [savedUser, ...prev]);
      showToast(`Đã tạo tài khoản @${savedUser.username} thành công`);
    }
  };

  // Callback API: Đổi mật khẩu
  const handleResetPasswordConfirm = async (userId: string, passwordData: string) => {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordData }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể đổi mật khẩu");
    }

    showToast(`Đã thay đổi mật khẩu của @${selectedUser?.username} thành công`);
  };

  // Callback API: Khóa/Mở khóa tài khoản
  const handleToggleStatusConfirm = async (userId: string, targetStatus: 'active' | 'inactive') => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể cập nhật trạng thái");
    }

    const updatedUser = data.user;

    setUsersList((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );

    const actionText = targetStatus === 'active' ? "mở khóa" : "khóa";
    showToast(`Đã ${actionText} tài khoản @${updatedUser.username} thành công`);
  };

  // Callback API: Xóa tài khoản
  const handleDeleteConfirm = async (userId: string) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể xóa tài khoản");
    }

    // Lọc bỏ user đã bị xóa khỏi local state
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    showToast(`Đã xóa tài khoản @${selectedUser?.username} thành công`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
      {/* Toast Notification Premium */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
            : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
        }`}>
          <div className={`p-1.5 rounded-full ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            {toast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <UserCog className="w-8 h-8 text-emerald-600" />
            Quản lý Người dùng
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Quản trị danh sách tài khoản, phân quyền vai trò, lập lịch gia hạn và khóa tài khoản thành viên.
          </p>
        </div>
        
        <Button
          onClick={handleCreateClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl shadow-sm transition-all duration-200 ease-out hover:scale-[1.02] flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Thêm tài khoản
        </Button>
      </div>

      {/* Control bar: Tìm kiếm */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm theo username hoặc email..."
          className="pl-9 pr-4 py-2 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus-visible:ring-emerald-500 transition-colors shadow-sm"
        />
      </div>

      {/* Data Table Card */}
      <Card className="border border-zinc-200 dark:border-zinc-850 shadow-sm rounded-2xl overflow-hidden bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md">
        <CardHeader className="border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 py-4">
          <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
            Danh sách Tài khoản ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900/40">
                <TableRow className="hover:bg-transparent border-b border-zinc-150 dark:border-zinc-800">
                  <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 py-3 pl-6">Username</TableHead>
                  <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 py-3">Email</TableHead>
                  <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 py-3">Vai trò</TableHead>
                  <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 py-3">Trạng thái</TableHead>
                  <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 py-3">Gia hạn</TableHead>
                  <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 py-3 text-right pr-6">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-zinc-400">
                      Không tìm thấy tài khoản người dùng nào phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isExpired = user.expireAt && new Date(user.expireAt) < new Date();

                    return (
                      <TableRow 
                        key={user.id} 
                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 border-b border-zinc-100 dark:border-zinc-800 transition-colors ${
                          isSelf ? 'bg-emerald-50/10 dark:bg-emerald-950/5' : ''
                        }`}
                      >
                        {/* Username */}
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100 py-4 pl-6 flex items-center gap-1.5">
                          @{user.username}
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 py-0 px-1 rounded">
                              Bạn
                            </Badge>
                          )}
                        </TableCell>
                        
                        {/* Email */}
                        <TableCell className="text-zinc-600 dark:text-zinc-300 py-4">{user.email}</TableCell>
                        

                        
                        {/* Role */}
                        <TableCell className="py-4">
                          <Badge 
                            variant={
                              user.role === 'superadmin' 
                                ? 'destructive' 
                                : user.role === 'admin' 
                                  ? 'default' 
                                  : 'secondary'
                            }
                            className={`rounded-lg font-medium text-xs px-2.5 py-0.5 ${
                              user.role === 'superadmin'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100'
                                : user.role === 'admin'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-100'
                            }`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="py-4">
                          <Badge 
                            className={`rounded-lg font-semibold text-xs px-2.5 py-0.5 ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 hover:bg-green-100' 
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100'
                            }`}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        
                        {/* ExpireAt */}
                        <TableCell className="py-4">
                          {user.expireAt ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className={`w-3.5 h-3.5 ${
                                isExpired 
                                  ? 'text-rose-500 animate-pulse' 
                                  : 'text-zinc-400'
                              }`} />
                              <span className={
                                isExpired 
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                                  : 'text-zinc-600 dark:text-zinc-300'
                              }>
                                {new Date(user.expireAt).toLocaleDateString('vi-VN')}
                                {isExpired && " (Hết hạn)"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">Vĩnh viễn</span>
                          )}
                        </TableCell>
                        
                        {/* Action buttons */}
                        <TableCell className="text-right pr-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            {/* Chỉnh sửa */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditClick(user)}
                              title="Chỉnh sửa thông tin và hạn gia hạn"
                              className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              Sửa
                            </Button>
                            
                            {/* Đổi mật khẩu */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleResetPasswordClick(user)}
                              title="Đổi mật khẩu tài khoản"
                              className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </Button>
                            
                            {/* Khóa/Mở khóa */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={isSelf}
                              onClick={() => handleToggleStatusClick(user)}
                              title={user.status === 'active' ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                              className={`border-zinc-200 dark:border-zinc-800 px-2 ${
                                isSelf
                                  ? 'opacity-40 cursor-not-allowed'
                                  : user.status === 'active'
                                    ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                              }`}
                            >
                              {user.status === 'active' ? (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            {/* Xóa tài khoản */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={isSelf}
                              onClick={() => handleDeleteClick(user)}
                              title="Xóa tài khoản người dùng"
                              className={`border-zinc-200 dark:border-zinc-800 px-2 ${
                                isSelf
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals Mounting */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
        currentUserRole={currentUser.role || 'user'}
      />

      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetPasswordConfirm}
        user={selectedUser}
      />

      <ConfirmBlockModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleToggleStatusConfirm}
        user={selectedUser}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        user={selectedUser}
      />
    </div>
  );
}
