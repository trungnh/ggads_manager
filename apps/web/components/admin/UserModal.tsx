'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyRound, RefreshCw, Eye, EyeOff, Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'inactive';
  expireAt: string | null;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
  user: User | null; // null nếu là tạo mới
  currentUserRole: string; // Vai trò của admin đang đăng nhập
}

export default function UserModal({
  isOpen,
  onClose,
  onSave,
  user,
  currentUserRole,
}: UserModalProps) {
  const isEdit = !!user;

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'user' | 'admin' | 'superadmin'>("user");
  const [status, setStatus] = useState<'active' | 'inactive'>("active");
  
  // Expiry states
  const [isPermanent, setIsPermanent] = useState(true);
  const [expireDate, setExpireDate] = useState("");

  // UI helper states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form values when user changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      
      if (user) {
        setUsername(user.username);
        setEmail(user.email);
        setPassword("");
        setRole(user.role);
        setStatus(user.status);
        
        if (user.expireAt) {
          setIsPermanent(false);
          // Định dạng YYYY-MM-DD cho input type="date"
          const date = new Date(user.expireAt);
          const formattedDate = date.toISOString().split("T")[0];
          setExpireDate(formattedDate || "");
        } else {
          setIsPermanent(true);
          setExpireDate("");
        }
      } else {
        // Reset form cho tạo mới
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("user");
        setStatus("active");
        setIsPermanent(true);
        setExpireDate("");
      }
    }
  }, [isOpen, user]);

  // Sinh mật khẩu tự động ngẫu nhiên mạnh mẽ
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic Client validation
    if (!username.trim() || !email.trim()) {
      setError("Vui lòng điền đầy đủ Username và Email");
      setIsLoading(false);
      return;
    }

    if (!isEdit && !password) {
      setError("Mật khẩu không được để trống");
      setIsLoading(false);
      return;
    }

    if (!isPermanent && !expireDate) {
      setError("Vui lòng chọn ngày hết hạn tài khoản");
      setIsLoading(false);
      return;
    }

    try {
      const payload: any = {
        username: username.trim(),
        email: email.trim(),
        role,
        status,
        expireAt: isPermanent ? null : new Date(expireDate).toISOString(),
      };

      if (!isEdit) {
        payload.password = password;
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all duration-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isEdit ? "Chỉnh sửa Tài khoản" : "Tạo Tài khoản mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin chi tiết và ngày gia hạn cho người dùng hệ thống."
              : "Thêm một tài khoản quản lý quảng cáo mới vào cơ sở dữ liệu."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-semibold">
              Username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
              placeholder="nhap_username_lien_nhau"
              disabled={isEdit}
              required
              className="bg-zinc-50/50 focus-visible:ring-emerald-500 disabled:opacity-75 disabled:bg-zinc-100 dark:disabled:bg-zinc-900"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="bg-zinc-50/50 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Password (Chỉ hiển thị khi tạo mới) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">
                Mật khẩu <span className="text-red-500">*</span>
              </Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu ít nhất 6 ký tự"
                    required
                    className="bg-zinc-50/50 focus-visible:ring-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  title="Tự động sinh mật khẩu ngẫu nhiên cực mạnh"
                  className="flex items-center gap-1.5 px-3 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sinh mật khẩu
                </Button>
              </div>
            </div>
          )}

          {/* Grid Row: Role & Status */}
          <div className="grid grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-sm font-semibold">
                Vai trò
              </Label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as any)}
              >
                <SelectTrigger id="role" className="bg-zinc-50/50">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Thành viên)</SelectItem>
                  {/* Chỉ superadmin mới được phép gán admin/superadmin */}
                  {currentUserRole === "superadmin" && (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-sm font-semibold">
                Trạng thái
              </Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as any)}
              >
                <SelectTrigger id="status" className="bg-zinc-50/50">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Hoạt động)</SelectItem>
                  <SelectItem value="inactive">Inactive (Khóa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>



          {/* Expiration Date Section */}
          <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="permanent"
                checked={isPermanent}
                onCheckedChange={(checked) => {
                  setIsPermanent(!!checked);
                  if (checked) setExpireDate("");
                }}
              />
              <Label
                htmlFor="permanent"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
              >
                Tài khoản vô thời hạn (Vĩnh viễn)
              </Label>
            </div>

            {!isPermanent && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="expireDate" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Chọn ngày hết hạn gia hạn
                </Label>
                <Input
                  id="expireDate"
                  type="date"
                  value={expireDate}
                  onChange={(e) => setExpireDate(e.target.value)}
                  required={!isPermanent}
                  className="bg-white dark:bg-zinc-950 focus-visible:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Footer actions */}
          <DialogFooter className="pt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-zinc-200 dark:border-zinc-800"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Cập nhật" : "Tạo tài khoản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
