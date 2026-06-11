"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TelegramConnect({ isConnected }: { isConnected: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/connect', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kết nối Telegram Bot</CardTitle>
        <CardDescription>
          Nhận thông báo tự động hóa trực tiếp về Telegram cá nhân.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <span>✅ Đã kết nối Telegram thành công!</span>
          </div>
        ) : (
          <div>
            {!token ? (
              <Button onClick={generateToken} disabled={loading}>
                {loading ? "Đang tạo..." : "Tạo mã kết nối"}
              </Button>
            ) : (
              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                <p>1. Mở ứng dụng Telegram và tìm Bot: <strong>@YourBotName</strong></p>
                <p>2. Gửi tin nhắn chứa mã bảo mật gồm 6 chữ số dưới đây:</p>
                <div className="text-3xl font-mono font-bold tracking-widest text-center py-4 text-blue-600">
                  {token}
                </div>
                <p className="text-xs text-gray-500 text-center">Mã này sẽ hết hạn sau 10 phút.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
