"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Đăng ký thành công, chuyển hướng về login với query registered=true
        router.push("/login?registered=true");
      } else {
        setError(data.error || "Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 bg-white dark:bg-gray-950 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <svg width="24" height="24" viewBox="0 0 12 12" fill="none">
                <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="white" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-center text-slate-900">
            Đăng ký tài khoản
          </CardTitle>
          <CardDescription className="text-center">
            Đăng ký để dùng thử miễn phí 15 ngày
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Ví dụ: nguyenvanan"
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Địa chỉ Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ví dụ: name@example.com"
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                required
                className="rounded-xl h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : "Đăng ký dùng thử"}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-semibold">
              Đăng nhập ngay
            </Link>
          </div>
        </CardContent>
        <CardFooter className="pb-8 justify-center">
          <p className="text-xs text-slate-400">© 2025 Ads Manager</p>
        </CardFooter>
      </Card>
    </div>
  );
}
