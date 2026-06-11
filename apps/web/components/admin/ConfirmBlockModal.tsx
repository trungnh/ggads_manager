'use client';

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
}

interface ConfirmBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string, targetStatus: 'active' | 'inactive') => Promise<void>;
  user: User | null;
}

export default function ConfirmBlockModal({
  isOpen,
  onClose,
  onConfirm,
  user,
}: ConfirmBlockModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  // Xác định xem hành động tiếp theo là Khóa hay Mở khóa
  const isLockAction = user.status === 'active';
  const targetStatus = isLockAction ? 'inactive' : 'active';

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm(user.id, targetStatus);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi thực hiện thao tác");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all duration-200">
        <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
          <div className={`p-3 rounded-full mb-3 ${
            isLockAction 
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
          }`}>
            {isLockAction ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isLockAction ? "Xác nhận Khóa tài khoản?" : "Xác nhận Mở khóa tài khoản?"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {isLockAction ? (
              <>
                Bạn đang chuẩn bị khóa tài khoản của <span className="font-semibold text-zinc-900 dark:text-zinc-150">@{user.username}</span>. Người dùng này sẽ không thể đăng nhập hoặc sử dụng hệ thống cho đến khi được mở khóa lại.
              </>
            ) : (
              <>
                Bạn đang chuẩn bị mở khóa hoạt động cho tài khoản <span className="font-semibold text-zinc-900 dark:text-zinc-150">@{user.username}</span>. Người dùng này sẽ khôi phục lại toàn bộ quyền truy cập hệ thống bình thường.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <DialogFooter className="pt-4 flex gap-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-zinc-200 dark:border-zinc-800 flex-1"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 font-medium shadow-sm transition-colors flex items-center justify-center gap-1.5 ${
              isLockAction 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLockAction ? "Khóa tài khoản" : "Mở khóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
