"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const registered = searchParams.get("registered");
    const verified = searchParams.get("verified");
    const authError = searchParams.get("error");

    if (registered) {
      setSuccess("Đăng ký thành công! Vui lòng kiểm tra email của bạn để kích hoạt tài khoản trước khi đăng nhập.");
    } else if (verified) {
      setSuccess("Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
    } else if (authError) {
      if (authError === "verification_failed") {
        setError("Liên kết xác thực không hợp lệ hoặc đã hết hạn.");
      } else {
        setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      // Dùng redirect: false để lấy kết quả trả về và bắt lỗi tùy chỉnh từ authorize()
      const result = await signIn("credentials", {
        username,
        password,
        callbackUrl: "/accounts",
        redirect: false,
      }) as any;
      
      if (result?.error) {
        console.error("[LOGIN_ERROR] NextAuth error:", result.error);
        
        // Trích xuất thông báo lỗi phù hợp từ NextAuth
        if (result.error.includes("chưa được xác minh") || result.error.includes("xác minh")) {
          setError("Tài khoản chưa được xác minh qua email. Vui lòng kiểm tra email để kích hoạt.");
        } else if (result.error.includes("khóa") || result.error.includes("inactive")) {
          setError("Tài khoản của bạn đã bị khóa.");
        } else if (result.error.includes("hết hạn") || result.error.includes("expire")) {
          setError("Tài khoản của bạn đã hết hạn sử dụng dùng thử.");
        } else {
          setError("Sai tên đăng nhập hoặc mật khẩu.");
        }
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-shake">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Tên đăng nhập</Label>
          <Input
            id="username"
            name="username"
            type="text"
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
            required
            className="rounded-xl h-11"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer">
          {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : "Đăng nhập"}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-600">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="text-blue-600 hover:underline font-semibold">
          Đăng ký dùng thử 15 ngày
        </Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 bg-white dark:bg-gray-950 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
               <svg width="24" height="24" viewBox="0 0 12 12" fill="none">
                <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="white"/>
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-center text-slate-900">
            Ads Manager
          </CardTitle>
          <CardDescription className="text-center">
            Đăng nhập để quản lý chiến dịch của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Suspense fallback={
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </CardContent>
        <CardFooter className="pb-8 justify-center">
           <p className="text-xs text-slate-400">© 2025 Ads Manager</p>
        </CardFooter>
      </Card>
    </div>
  );
}
