'use client'

import { Cpu, ArrowUpRight, ArrowDownRight, Play, Pause, Bell } from 'lucide-react'

export type ActivityLogItem = {
  id: string
  ruleName: string
  actionType: string
  campaignName: string
  campaignId: string
  executedAtStr: string
  resultSummary: string
}

interface AutomationActivityLogProps {
  logs?: ActivityLogItem[]
}

export default function AutomationActivityLog({ logs = [] }: AutomationActivityLogProps) {
  const getActionStyles = (action: string) => {
    switch (action) {
      case 'enable':
      case 'enable_campaign':
        return {
          icon: <Play size={10} color="#065F46" fill="#065F46" />,
          color: '#059669',
          bg: '#D1FAE5',
          label: 'BẬT'
        }
      case 'pause':
      case 'pause_campaign':
        return {
          icon: <Pause size={10} color="#991B1B" fill="#991B1B" />,
          color: '#DC2626',
          bg: '#FEE2E2',
          label: 'TẮT'
        }
      case 'adjust_budget':
      case 'increase_budget':
      case 'decrease_budget':
      case 'set_budget':
      case 'budget':
        return {
          icon: <ArrowUpRight size={12} color="#03543F" />,
          color: '#047857',
          bg: '#DEF7EC',
          label: 'NGÂN SÁCH'
        }
      default:
        return {
          icon: <Bell size={10} color="#1E40AF" />,
          color: '#2563EB',
          bg: '#DBEAFE',
          label: 'CẢNH BÁO'
        }
    }
  }

  if (logs.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-5 h-full flex flex-col shadow-sm min-h-[350px]">
        {/* Title */}
        <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
          <Cpu size={16} className="text-[var(--text-2)]" />
          <h3 className="text-[15px] font-semibold text-[var(--text-1)] m-0">
            Nhật ký Tự động hóa gần đây
          </h3>
        </div>
        
        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
            <Cpu size={20} className="text-[var(--text-3)]" />
          </div>
          <h4 className="text-xs font-bold text-[var(--text-1)] mb-1">Không có hoạt động tự động hóa nào gần đây</h4>
          <p className="text-[11px] text-[var(--text-3)] max-w-[240px] leading-relaxed">
            Hệ thống AI sẽ ghi lại chi tiết các nhật ký tối ưu hóa khi các chiến dịch quảng cáo kích hoạt quy tắc tự động hóa.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-5 h-full flex flex-col shadow-sm min-h-[350px]">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
        <Cpu size={16} className="text-[var(--text-2)]" />
        <h3 className="text-[15px] font-semibold text-[var(--text-1)] m-0">
          Nhật ký Tự động hóa gần đây
        </h3>
      </div>

      {/* Timeline items wrapper */}
      <div className="flex-1 relative flex flex-col gap-5 pl-3">
        {/* Vertical line through timeline */}
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-[var(--border)] z-0" />

        {logs.map((log) => {
          const actionStyle = getActionStyles(log.actionType)
          return (
            <div key={log.id} className="flex gap-3 relative z-10">
              {/* Bullet node */}
              <div 
                className="w-3.5 h-3.5 rounded-full bg-[var(--bg-card)] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_0_4px_var(--bg-card)]"
                style={{ border: `2px solid ${actionStyle.color}` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: actionStyle.color }} />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-[calc(var(--radius)*0.4)]"
                      style={{ background: actionStyle.bg, color: actionStyle.color }}
                    >
                      {actionStyle.label}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-1)]">
                      {log.ruleName}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-3)] font-medium shrink-0">
                    {log.executedAtStr}
                  </span>
                </div>

                <div className="text-[11px] text-[var(--text-2)] mb-0.5">
                  Chiến dịch: <span className="font-medium text-[var(--text-1)]">{log.campaignName}</span> 
                  <span className="font-mono text-[10px] text-[var(--text-3)] ml-1">
                    ({log.campaignId})
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-3)] m-0 leading-relaxed">
                  {log.resultSummary}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
