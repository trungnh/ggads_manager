import Link from 'next/link'
import { Megaphone, Sliders, Database, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
                <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="white"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Ads Manager</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a>
            <a href="#solutions" className="hover:text-blue-600 transition-colors">Giải pháp</a>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Bảo mật</Link>
          </nav>

          <div className="flex items-center gap-4 relative z-50">
            <a href="/login" className="px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-full transition-all cursor-pointer">
              Đăng nhập
            </a>
            <a href="/login" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-200 transition-all cursor-pointer">
              Bắt đầu ngay
            </a>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 text-center mb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-6 animate-fade-in">
            <Zap size={14} fill="currentColor" /> PHIÊN BẢN 2025 - AI OPTIMIZATION
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
            Tối ưu Google Ads bằng <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
              Dữ liệu đơn hàng thực tế
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 mb-10 leading-relaxed">
            Lấp đầy khoảng trống giữa Google Ads và CRM của bạn. Tự động điều chỉnh giá thầu, ngân sách dựa trên lợi nhuận thật từ Pancake và Google Sheets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/login" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer">
              Dùng thử miễn phí <ArrowRight size={20} />
            </a>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1"><ShieldCheck size={16} className="text-emerald-500" /> Google Verified</span>
              <span className="flex items-center gap-1"><ShieldCheck size={16} className="text-emerald-500" /> No credit card needed</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 mb-32">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Đồng bộ CRM</h3>
              <p className="text-slate-600 leading-relaxed">
                Kết nối trực tiếp với Pancake POS và Google Sheets để lấy dữ liệu đơn hàng thành công theo thời gian thực.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <Sliders size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Rule Engine</h3>
              <p className="text-slate-600 leading-relaxed">
                Tự động hóa hoàn toàn các thao tác tăng/giảm ngân sách, tắt/mở chiến dịch dựa trên ROAS và CPA thực tế.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-all group">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <Megaphone size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Tối ưu chuyển đổi</h3>
              <p className="text-slate-600 leading-relaxed">
                Gửi tín hiệu chuyển đổi ngược lại Google Ads để máy học tối ưu đúng tệp khách hàng mang lại lợi nhuận cao nhất.
              </p>
            </div>
          </div>
        </section>

        {/* Integration Showcase */}
        <section className="bg-slate-900 py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Tích hợp hoàn hảo với hệ sinh thái của bạn</h2>
                <p className="text-slate-400 text-lg mb-8">
                  Ads Manager kết nối mượt mà với các công cụ bạn đang sử dụng hàng ngày để quản lý kinh doanh.
                </p>
                <ul className="space-y-4">
                  {[
                    "Google Ads API v24 chính thức",
                    "Pancake POS (Shop ID & API Key)",
                    "Google Sheets (OAuth 2.0)",
                    "Telegram Notifications & Reports"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                      <div className="w-5 h-5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="absolute -inset-10 bg-blue-600/20 blur-3xl rounded-full"></div>
                <div className="relative bg-slate-800 p-4 rounded-3xl border border-slate-700 shadow-2xl">
                   <div className="bg-slate-900 rounded-2xl h-64 flex items-center justify-center text-slate-700 font-bold border border-slate-800">
                      [ Dashboard Preview ]
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
               <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">AdFlow Ads Manager</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                Giải pháp tối ưu hóa quảng cáo dựa trên dữ liệu lợi nhuận thực tế dành cho các nhà quảng cáo chuyên nghiệp.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Sản phẩm</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600">Tính năng</a></li>
                <li><a href="#" className="hover:text-blue-600">Giải pháp</a></li>
                <li><a href="#" className="hover:text-blue-600">Bảng giá</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Pháp lý</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 text-center text-sm text-slate-400">
            © 2025 AdFlow Ads Manager. All rights reserved. Google Ads and Google Sheets are trademarks of Google LLC.
          </div>
        </div>
      </footer>
    </div>
  )
}

function Check({ size, strokeWidth, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )
}
