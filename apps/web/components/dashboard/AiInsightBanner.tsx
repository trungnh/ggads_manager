'use client'
import { Sparkles } from 'lucide-react'

export default function AiInsightBanner() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4.5 rounded-[var(--radius)] flex gap-4.5 mb-4.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)]">
      {/* Icon */}
      <div className="w-8.5 h-8.5 rounded-[calc(var(--radius)*0.8)] bg-sky-950/20 border border-sky-900/20 flex items-center justify-center shrink-0 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.05)] animate-pulse">
        <Sparkles size={16} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[12px] font-bold text-[var(--text-1)]">
            AI Analyst — Báo cáo hiệu năng live
          </span>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-400 border border-sky-900/20 tracking-wider uppercase">
            Mới
          </span>
        </div>

        <p className="text-[12px] text-[var(--text-2)] leading-relaxed mb-3.5">
          Chi phí Ads <span className="text-sky-400 font-semibold">+12%</span>, số đơn CRM <span className="text-emerald-400 font-semibold">+31%</span> so với trung bình 7 ngày gần nhất. Chỉ số ROAS đang được cải thiện tích cực. Hệ thống phát hiện <span className="text-rose-400 font-medium">2 vấn đề cần chú ý ngay lập tức</span> bên dưới để tránh lãng phí ngân sách.
        </p>

        {/* Action chips */}
        <div className="flex flex-wrap gap-2">
          <ActionChip variant="danger" label="Đầm Dự Tiệc: 0 đơn CRM (Chi 890k)" />
          <ActionChip variant="success" label="Tăng budget Áo Thu Đông +30%" />
          <ActionChip variant="default" label="Xem phân tích đầy đủ" />
        </div>
      </div>
    </div>
  )
}

function ActionChip({
  label, variant
}: { label: string; variant: 'danger' | 'success' | 'default' }) {
  const styles = {
    danger:  'bg-rose-950/30 text-rose-400 border-rose-900/20 hover:bg-rose-900/20',
    success: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/20 hover:bg-emerald-900/20',
    default: 'bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--bg-card)]',
  }
  return (
    <button className={`text-[10.5px] font-semibold px-3 py-1.5 rounded-[calc(var(--radius)*0.8)] cursor-pointer border transition-all duration-200 active:scale-[0.98] ${styles[variant]}`}>
      {label}
    </button>
  )
}
