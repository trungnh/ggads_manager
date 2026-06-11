'use client'

// KPI sparkline data — mảng 7 số đại diện 7 ngày gần nhất
const KPI_DATA = [
  {
    label: 'Chi phí hôm nay',
    sublabel: 'live',
    value: '4.2tr ₫',
    delta: '+12%',
    deltaDir: 'up' as const,
    deltaLabel: 'vs TB 7 ngày',
    sparks: [2.8, 3.1, 2.5, 3.8, 3.2, 3.9, 4.2],
    sparkColor: '#0ea5e9', // Sky Blue đại diện chi tiêu/quảng cáo
  },
  {
    label: 'Đơn hàng CRM',
    sublabel: 'live',
    value: '63 đơn',
    delta: '+31%',
    deltaDir: 'up' as const,
    deltaLabel: 'vs TB 7 ngày',
    sparks: [40, 48, 35, 58, 52, 55, 63],
    sparkColor: '#10b981', // Emerald
  },
  {
    label: 'Doanh thu hôm nay',
    sublabel: 'live',
    value: '16.1tr ₫',
    delta: '+24%',
    deltaDir: 'up' as const,
    deltaLabel: 'vs TB 7 ngày',
    sparks: [11.2, 12.8, 9.5, 14.2, 13.1, 14.8, 16.1],
    sparkColor: '#10b981', // Emerald
  },
  {
    label: 'ROAS mục tiêu',
    sublabel: 'live',
    value: '3.83×',
    delta: '+0.42',
    deltaDir: 'up' as const,
    deltaLabel: 'vs TB 7 ngày',
    sparks: [2.9, 3.1, 2.8, 3.4, 3.6, 3.5, 3.8],
    sparkColor: '#10b981', // Emerald
  },
]

// Sparkline mini bar chart (7 bars)
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-1 h-7 mt-3">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm min-h-[3px] transition-all duration-300"
          style={{
            height: `${Math.round((v / max) * 100)}%`,
            background: i === data.length - 1 ? color : 'var(--border)',
            boxShadow: i === data.length - 1 ? `0 0 10px ${color}40` : 'none',
          }}
        />
      ))}
    </div>
  )
}

const DELTA_CLASSES = {
  up:      'text-emerald-500 font-semibold',
  down:    'text-rose-500 font-semibold',
  neutral: 'text-[var(--text-3)]',
}

export default function KpiGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4.5">
      {KPI_DATA.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-[var(--bg-card)] p-4.5 rounded-[var(--radius)] border border-[var(--border)] hover:-translate-y-[2px] transition-all duration-300 group shadow-sm hover:shadow-md"
        >
          {/* Label row */}
          <div className="flex justify-between items-center pb-1">
            <span className="text-[11px] font-medium text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
              {kpi.label
            }</span>
            {kpi.sublabel && (
              <span className="text-[9px] font-bold text-sky-400 bg-sky-950/20 border border-sky-900/20 px-1.5 py-0.5 rounded-full tracking-wider uppercase">
                {kpi.sublabel}
              </span>
            )}
          </div>

          {/* Value */}
          <div className="text-2.5xl font-extrabold text-[var(--text-1)] tracking-tight leading-none mb-1 group-hover:text-[var(--primary)] transition-colors mt-1.5">
            {kpi.value}
          </div>

          {/* Delta */}
          <div className="flex items-center gap-1.5 text-[11px] mt-2">
            <span className={DELTA_CLASSES[kpi.deltaDir]}>{kpi.delta}</span>
            <span className="text-[var(--text-3)] font-medium">{kpi.deltaLabel}</span>
          </div>

          {/* Sparkline */}
          <Sparkline data={kpi.sparks} color={kpi.sparkColor} />
        </div>
      ))}
    </div>
  )
}
