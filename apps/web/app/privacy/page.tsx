import Link from 'next/link'
import { Shield, Lock, Eye, ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm">
            <ArrowLeft size={16} /> Quay lại trang chủ
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
              <p className="text-sm text-slate-500">Last updated: May 5, 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lock size={20} className="text-blue-600" /> Data Usage Disclosure (Google API Services)
              </h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Our application, <strong>Ads Manager</strong>, complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:underline">Google API Service User Data Policy</a>, including the Limited Use requirements.
              </p>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <h3 className="font-bold mb-3 text-slate-800">How we access and use your data:</h3>
                <ul className="space-y-3 text-slate-600 list-disc pl-5">
                  <li><strong>Google Ads Data</strong>: We access your Google Ads account to retrieve campaign performance data and automate account management based on your settings.</li>
                  <li><strong>Google Sheets Data</strong>: We access specific Google Sheets explicitly authorized by you to sync order and conversion data. This data is used solely to calculate ROI and automate your ad optimizations.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold mb-3 text-slate-800">Data Privacy and Sharing:</h3>
                <ul className="space-y-3 text-slate-600 list-disc pl-5">
                  <li><strong>No Third-Party Sharing</strong>: We do not sell, trade, or otherwise transfer your Google Ads or Google Sheets data to any third parties.</li>
                  <li><strong>User-Centric Use</strong>: All data retrieved through Google APIs is used exclusively to provide and improve the features within your own dashboard.</li>
                  <li><strong>Data Security</strong>: We implement industry-standard security measures to protect your access tokens and any synced data stored within our system.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12 border-t border-slate-100 pt-12">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Eye size={20} className="text-blue-600" /> Chính sách Sử dụng Dữ liệu Google (Vietnamese)
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Ứng dụng <strong>Ads Manager</strong> cam kết tuân thủ các quy định về bảo mật dữ liệu của Google.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-bold mb-2 text-slate-800">Cách chúng tôi sử dụng dữ liệu:</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Dữ liệu Google Ads và Google Sheets được dùng để lấy chỉ số hiệu suất, đồng bộ đơn hàng thực tế nhằm tính toán lợi nhuận (ROI) chính xác nhất cho người dùng.
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-bold mb-2 text-slate-800">Cam kết Bảo mật:</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Tuyệt đối không bán, trao đổi hoặc chuyển giao dữ liệu của bạn cho bên thứ ba. Toàn bộ dữ liệu chỉ phục vụ mục đích tối ưu hóa quảng cáo cá nhân.
                  </p>
                </div>
              </div>
            </section>

            <section className="text-center pt-8 border-t border-slate-100">
              <p className="text-slate-500 text-sm">
                If you have any questions about this Privacy Policy, please contact us at support@nongnghiephd.com
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
