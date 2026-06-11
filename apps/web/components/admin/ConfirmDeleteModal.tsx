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
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
  user: User | null;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  user,
}: ConfirmDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm(user.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi xóa người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all duration-200">
        <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
          <div className="p-3 rounded-full mb-3 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <Trash2 className="w-8 h-8" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 justify-center">
            Xác nhận Xóa tài khoản?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Bạn đang chuẩn bị xóa tài khoản của <span className="font-semibold text-zinc-900 dark:text-zinc-150">@{user.username}</span> ({user.email}). 
            <span className="block mt-2 font-medium text-red-600 dark:text-red-400 flex items-center gap-1 justify-center">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Hành động này không thể hoàn tác!
            </span>
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
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Đồng ý Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
