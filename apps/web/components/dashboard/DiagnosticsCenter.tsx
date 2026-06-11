'use client'

import { AlertTriangle, CheckCircle } from 'lucide-react'

export type DiagnosticItem = {
  id: string
  type: 'danger' | 'warning' | 'success'
  category: string
  title: string
  description: string
  actionLabel?: string
  actionUrl?: string
}

interface DiagnosticsCenterProps {
  items?: DiagnosticItem[]
}

export default function DiagnosticsCenter({ items = [] }: DiagnosticsCenterProps) {
  // Rich diagnostic findings based on typical Google Ads anomalies
  const defaultItems: DiagnosticItem[] = [
    {
      id: 'diag-1',
      type: 'danger',
      category: 'Lãng phí Ngân sách',
      title: 'Đầm Dự Tiệc: Chi tiêu cao nhưng 0 đơn hàng CRM',
      description: 'Chiến dịch này đã tiêu tốn 890,000 ₫ trong 24 giờ qua nhưng không ghi nhận bất kỳ đơn hàng thành công nào trên Pancake CRM. ROAS hiện tại bằng 0.',
      actionLabel: 'Tạm dừng chiến dịch',
    },
    {
      id: 'diag-2',
      type: 'warning',
      category: 'Ngân sách Giới hạn',
      title: 'Áo Thu Đông: Hết ngân sách lúc 16:15 chiều',
      description: 'Chiến dịch hết ngân sách sớm trước giờ cao điểm tối. Đề xuất áp dụng lịch trình tăng 30% ngân sách tự động từ 18:00 - 22:00 để không bỏ lỡ khách hàng.',
      actionLabel: 'Tăng Ngân sách',
    },
    {
      id: 'diag-3',
      type: 'success',
      category: 'Tối ưu Dayparting',
      title: 'Tiết kiệm 1.2tr ₫ nhờ Tự động hóa Giờ thấp điểm',
      description: 'Lịch trình "Tắt chiến dịch khuya" đã tạm dừng 4 chiến dịch thành công từ 00:00 đến 06:00 sáng nay, tiết kiệm khoảng 1,250,000 ₫ chi phí click ảo.',
      actionLabel: 'Xem Lịch trình',
    },
    {
      id: 'diag-4',
      type: 'success',
      category: 'Đồng bộ CRM',
      title: 'Tỷ lệ Khớp đơn CRM đạt 98.4%',
      description: 'Tất cả các chuyển đổi thực tế từ Pancake CRM đã được đẩy ngược về Google Ads thành công trong 7 ngày qua. Smart Bidding đang hoạt động tối ưu.',
    }
  ]

  const diagnostics = items.length > 0 ? items : defaultItems

  const iconMap = {
    danger: <AlertTriangle size={14.5} className="text-rose-400" />,
    warning: <AlertTriangle size={14.5} className="text-amber-400" />,
    success: <CheckCircle size={14.5} className="text-emerald-400" />,
  }

  const itemClasses = {
    danger: 'bg-rose-950/10 border-rose-900/25 hover:border-rose-900/40',
    warning: 'bg-amber-950/10 border-amber-900/25 hover:border-amber-900/40',
    success: 'bg-emerald-950/10 border-emerald-900/25 hover:border-emerald-900/40',
  }

  const badgeClasses = {
    danger: 'bg-rose-950/40 text-rose-400 border-rose-900/30',
    warning: 'bg-amber-950/40 text-amber-400 border-amber-900/30',
    success: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30',
  }

  const buttonClasses = {
    danger: 'bg-rose-950/30 text-rose-400 border-rose-900/30 hover:bg-rose-900/30',
    warning: 'bg-amber-950/30 text-amber-400 border-amber-900/30 hover:bg-amber-900/30',
    success: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30 hover:bg-emerald-900/30',
  }

  return (
    <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] mb-6 shadow-sm">
      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)] mb-4">
        <div>
          <h3 className="text-[13.5px] font-bold text-[var(--text-1)] flex items-center gap-2">
            <span>✦</span> AI Diagnostics & Anomaly Center
          </h3>
          <p className="text-[11.5px] text-[var(--text-3)] mt-1">
            Chẩn đoán ngân sách, hiệu quả CPA và đề xuất tối ưu tự động từ AI Analyst
          </p>
        </div>
        <div className="text-[10.5px] font-bold bg-[var(--bg-secondary)] border border-[var(--border)] px-2.5 py-1 rounded-full text-[var(--text-2)] shrink-0">
          {diagnostics.length} Phát hiện hôm nay
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {diagnostics.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-[var(--radius)] border flex gap-3.5 items-start transition-all duration-300 ${itemClasses[item.type]}`}
          >
            <div className="mt-0.5 shrink-0">{iconMap[item.type]}</div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide uppercase ${badgeClasses[item.type]}`}>
                  {item.category}
                </span>
                <span className="text-[12.5px] font-bold text-[var(--text-1)]">
                  {item.title}
                </span>
              </div>
              
              <p className="text-[11.5px] text-[var(--text-2)] leading-relaxed">
                {item.description}
              </p>
            </div>

            {item.actionLabel && (
              <button className={`shrink-0 align-self-center text-[10.5px] font-semibold px-3 py-1.5 rounded-[calc(var(--radius)*0.8)] cursor-pointer border transition-all duration-200 active:scale-[0.98] ${buttonClasses[item.type]}`}>
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
