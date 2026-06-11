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
import { KeyRound, RefreshCw, Eye, EyeOff, Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string, newPassword: string) => Promise<void>;
  user: User | null;
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  user,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!user) {
      setError("Không tìm thấy người dùng");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có độ dài ít nhất 6 ký tự");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu không trùng khớp");
      setIsLoading(false);
      return;
    }

    try {
      await onConfirm(user.id, password);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi đổi mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all duration-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            Đổi Mật khẩu
          </DialogTitle>
          <DialogDescription>
            Đặt lại mật khẩu mới cho tài khoản quản trị <span className="font-semibold text-zinc-900 dark:text-zinc-150">@{user?.username}</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Mật khẩu mới */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm font-semibold">
              Mật khẩu mới
            </Label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
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
                className="flex items-center gap-1 px-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Sinh mật khẩu
              </Button>
            </div>
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-sm font-semibold">
              Xác nhận mật khẩu mới
            </Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              className="bg-zinc-50/50 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
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
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
