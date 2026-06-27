'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Clock, 
  Sliders, 
  Send, 
  LayoutGrid, 
  Terminal, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ReportModal from '@/components/dayparting/ReportModal'

type Schedule = {
  id: string
  adsAccountId: string
  name: string
  actionType: string
  executionTime: string
  budgetValue: string | null
  budgetIsPercentage: boolean
  campaignIds: string[]
  status: string
}

type Rule = {
  id: string
  name: string
  isEnabled: boolean
  priority: number
  schedule: {
    hoursStart?: string
    hoursEnd?: string
    days?: number[]
    cooldownMinutes?: number
  } | any
  targetType: string
}

type Report = {
  id: string
  name: string
  isEnabled: boolean
  frequencyMinutes: number
  hoursStart: string
  hoursEnd: string
  connectionId: string
  customMessage?: string | null
}

type Log = {
  id: number
  ruleName: string | null
  adsAccountId: string | null
  campaignName: string | null
  campaignId: string | null
  actionType: string | null
  executedAt: string | null
  metricsSnapshot?: any
}

type AdsAccount = {
  id: string
  name: string | null
  customerId: string
}

interface SchedulesPageClientProps {
  initialSchedules: Schedule[]
  initialRules: Rule[]
  initialReports: Report[]
  initialLogs: Log[]
  accounts: AdsAccount[]
}

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Tạm dừng',
  enable_campaign: 'Bật chiến dịch',
  set_budget: 'Đặt ngân sách',
  increase_budget: 'Tăng ngân sách',
  decrease_budget: 'Giảm ngân sách'
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const getLogReason = (log: Log) => {
  let summaryStr = 'Tự động thực thi hành động tối ưu hóa chiến dịch.';
  if (log.metricsSnapshot && typeof log.metricsSnapshot === 'object') {
    const snapObj = log.metricsSnapshot as any;
    if (snapObj.reason) {
      summaryStr = String(snapObj.reason);
    } else if (snapObj.message) {
      summaryStr = String(snapObj.message);
    }
  }
  return summaryStr;
};

export default function SchedulesPageClient({
  initialSchedules,
  initialRules,
  initialReports,
  initialLogs,
  accounts
}: SchedulesPageClientProps) {
  const [activeTab, setActiveTab] = useState<'campaign' | 'rule' | 'report'>('campaign')
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)

  const handleToggleReport = async (report: Report) => {
    try {
      const res = await fetch('/api/telegram/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          isEnabled: !report.isEnabled
        })
      })
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, isEnabled: !r.isEnabled } : r))
      }
    } catch (err) {
      console.error('Failed to toggle report:', err)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch báo cáo định kỳ này không?')) return

    try {
      const res = await fetch(`/api/telegram/reports?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete report:', err)
    }
  }

  const handleSaveReport = (savedReport: Report) => {
    setReports(prev => {
      const exists = prev.some(r => r.id === savedReport.id)
      if (exists) {
        return prev.map(r => r.id === savedReport.id ? savedReport : r)
      }
      return [savedReport, ...prev]
    })
  }

  const totalTasks = initialSchedules.filter(s => s.status === 'active').length +
                     initialRules.filter(r => r.isEnabled).length +
                     reports.filter(r => r.isEnabled).length

  const STATS = [
    {
      name: 'Lịch Campaign',
      desc: 'Dayparting tuyệt đối',
      count: initialSchedules.length,
      icon: Clock,
      colorClass: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/20'
    },
    {
      name: 'Lịch Quy tắc',
      desc: 'Quét điều kiện Rule',
      count: initialRules.length,
      icon: Sliders,
      colorClass: 'text-amber-500 bg-amber-500/10 dark:bg-amber-950/20'
    },
    {
      name: 'Lịch Báo cáo',
      desc: 'Báo cáo Telegram P&L',
      count: reports.length,
      icon: Send,
      colorClass: 'text-sky-500 bg-sky-500/10 dark:bg-sky-950/20'
    },
    {
      name: 'Tổng tác vụ',
      desc: 'Tự động hóa hoạt động',
      count: totalTasks,
      icon: LayoutGrid,
      colorClass: 'text-[var(--primary)] bg-[var(--primary)]/10'
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* --- Header --- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-1)]">Bảng điều khiển lịch trình</h1>
        <p className="text-sm text-[var(--text-3)]">Giám sát và quản lý toàn bộ lịch hoạt động của chiến dịch, quy tắc và báo cáo tự động.</p>
      </div>

      {/* --- Stats Cards Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map(stat => {
          const Icon = stat.icon
          return (
            <div 
              key={stat.name} 
              className="bg-[var(--bg-card)] p-6 rounded-[var(--radius)] border border-[var(--border)] shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md cursor-default"
            >
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">{stat.name}</p>
                <p className="text-[11px] text-[var(--text-3)] truncate">{stat.desc}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-3xl font-extrabold text-[var(--text-1)]">{stat.count}</span>
                <div className={`w-11 h-11 rounded-[calc(var(--radius)*0.8)] flex items-center justify-center shrink-0 ${stat.colorClass}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* --- Tab Switcher & Management Link --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-2 bg-[var(--bg-card)] p-4 rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('campaign')}
            className={`px-4 py-2 rounded-[calc(var(--radius)*0.8)] text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'campaign'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)] bg-transparent'
            }`}
          >
            Lịch Chiến dịch ({initialSchedules.length})
          </button>
          <button
            onClick={() => setActiveTab('rule')}
            className={`px-4 py-2 rounded-[calc(var(--radius)*0.8)] text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'rule'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)] bg-transparent'
            }`}
          >
            Lịch Quy tắc ({initialRules.length})
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-[calc(var(--radius)*0.8)] text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'report'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)] bg-transparent'
            }`}
          >
            Lịch Báo cáo ({reports.length})
          </button>
        </div>

        {/* Dynamic Action Redirection Link */}
        <div>
          {activeTab === 'campaign' && (
            <Link href="/dayparting">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer">
                Cấu hình Dayparting <ArrowRight size={14} />
              </Button>
            </Link>
          )}
          {activeTab === 'rule' && (
            <Link href="/rules">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer">
                Cấu hình Rule Engine <ArrowRight size={14} />
              </Button>
            </Link>
          )}
          {activeTab === 'report' && (
            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 cursor-pointer">
                  Cấu hình Telegram <ArrowRight size={14} />
                </Button>
              </Link>
              <Button 
                size="sm"
                onClick={() => {
                  setEditingReport(null)
                  setIsReportModalOpen(true)
                }}
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-[calc(var(--radius)*0.8)] shadow-md shadow-sky-500/10 text-xs shrink-0 cursor-pointer flex items-center gap-1.5 h-8"
              >
                Tạo lịch báo cáo P&L
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* --- Grid Content based on tab active --- */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm overflow-hidden min-h-[160px]">
        {activeTab === 'campaign' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Tài khoản</TableHead>
                <TableHead>Tên lịch trình</TableHead>
                <TableHead>Mốc giờ chạy</TableHead>
                <TableHead>Hành động tuyệt đối</TableHead>
                <TableHead>Số chiến dịch</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialSchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[var(--text-3)] italic text-xs">
                    Chưa cấu hình lịch trình Dayparting nào cho chiến dịch.
                  </TableCell>
                </TableRow>
              ) : (
                initialSchedules.map(schedule => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-semibold text-xs text-[var(--text-2)] truncate max-w-[180px]">
                      {accounts.find(a => a.id === schedule.adsAccountId)?.name || schedule.adsAccountId}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-[var(--text-1)]">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] tracking-tight rounded-[calc(var(--radius)*0.6)] border-[var(--border)] bg-[var(--bg-secondary)]">{schedule.executionTime}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[calc(var(--radius)*0.4)] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {ACTION_LABELS[schedule.actionType] || schedule.actionType}
                        {schedule.budgetValue && ` (${schedule.budgetValue}${schedule.budgetIsPercentage ? '%' : 'đ'})`}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-[var(--text-2)]">{schedule.campaignIds.length} chiến dịch</TableCell>
                    <TableCell>
                      <Badge className={`rounded-[calc(var(--radius)*0.6)] ${schedule.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                        {schedule.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {activeTab === 'rule' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Tên quy tắc tự động</TableHead>
                <TableHead>Khung giờ quét cho phép</TableHead>
                <TableHead>Ngày hoạt động</TableHead>
                <TableHead>Giãn cách (Cooldown)</TableHead>
                <TableHead>Độ ưu tiên</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[var(--text-3)] italic text-xs">
                    Chưa tạo quy tắc tự động nào.
                  </TableCell>
                </TableRow>
              ) : (
                initialRules.map(rule => {
                  const hasSchedule = rule.schedule?.hoursStart && rule.schedule?.hoursEnd
                  const activeHours = hasSchedule 
                    ? `${rule.schedule.hoursStart} - ${rule.schedule.hoursEnd}` 
                    : '24/7 (Cả ngày)'
                  
                  const activeDays = rule.schedule?.days && Array.isArray(rule.schedule.days)
                    ? rule.schedule.days.map((d: number) => WEEKDAYS[d % 7]).join(', ')
                    : 'Hằng ngày'

                  const cooldown = rule.schedule?.cooldownMinutes
                    ? `Mỗi ${rule.schedule.cooldownMinutes} phút`
                    : 'Mặc định (30m)'

                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-bold text-xs text-[var(--text-1)]">{rule.name}</TableCell>
                      <TableCell className="font-semibold text-xs text-[var(--text-2)] flex items-center gap-1.5 py-4">
                        <Clock size={12} className={hasSchedule ? 'text-amber-500' : 'text-[var(--text-3)]'} />
                        {activeHours}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[var(--text-2)]">{activeDays}</TableCell>
                      <TableCell className="text-xs font-semibold text-[var(--text-2)]">{cooldown}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] rounded-[calc(var(--radius)*0.6)] border-[var(--border)] bg-[var(--bg-secondary)]">Độ ưu tiên: {rule.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-[calc(var(--radius)*0.6)] ${rule.isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                          {rule.isEnabled ? 'Đang chạy' : 'Đang tắt'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}

        {activeTab === 'report' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Tên báo cáo</TableHead>
                <TableHead>Tần suất gửi</TableHead>
                <TableHead>Khung giờ nhận tin</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-[var(--text-3)] italic text-xs">
                    Chưa thiết lập lịch gửi báo cáo Telegram P&L nào.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-bold text-xs text-[var(--text-1)]">{report.name}</TableCell>
                    <TableCell className="font-semibold text-xs text-[var(--text-2)]">
                      Mỗi {report.frequencyMinutes} phút
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-[var(--text-2)] flex items-center gap-1.5 py-4">
                      <Clock size={12} className="text-sky-500" />
                      {report.hoursStart} - {report.hoursEnd}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleReport(report)}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-all duration-300 ${
                          report.isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                        }`}
                      >
                        <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
                      </button>
                    </TableCell>
                    <TableCell className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReport(report)
                            setIsReportModalOpen(true)
                          }}
                          className="h-8 px-2.5 border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-2)] hover:text-[var(--text-1)] rounded-[calc(var(--radius)*0.6)] text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Sửa đổi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="h-8 w-8 p-0 border-[var(--border)] hover:bg-red-500/10 hover:text-red-500 text-[var(--text-3)] rounded-[calc(var(--radius)*0.6)] inline-flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* --- Recent Execution Logs Section --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-[var(--primary)]" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-2)]">Nhật ký thực thi tự động gần đây</h2>
          </div>
          <Link href="/admin/logs">
            <span className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer">
              Xem toàn bộ nhật ký <ArrowRight size={12} />
            </span>
          </Link>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Tài khoản</TableHead>
                <TableHead>Quy tắc áp dụng</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Chiến dịch tác động</TableHead>
                <TableHead>Nguyên nhân</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[var(--text-3)] italic text-xs">
                    Hệ thống tự động hóa chưa chạy hoạt động nào gần đây.
                  </TableCell>
                </TableRow>
              ) : (
                initialLogs.map(log => {
                  const reason = getLogReason(log);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-[var(--text-2)]">
                        {log.executedAt ? new Date(log.executedAt).toLocaleString('vi-VN') : 'N/A'}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-[var(--text-2)]">
                        {accounts.find(a => a.id === log.adsAccountId)?.name || log.adsAccountId}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-[var(--text-1)]">
                        {log.ruleName || 'Quét tự động / Dayparting'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold rounded-[calc(var(--radius)*0.6)] border-[var(--border)] bg-[var(--bg-secondary)]">
                          {log.actionType ? (ACTION_LABELS[log.actionType] || log.actionType) : 'Quét chỉ số'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[var(--text-2)] truncate max-w-[150px]" title={log.campaignName || log.campaignId || 'Toàn bộ tài khoản'}>
                        {log.campaignName || log.campaignId || 'Toàn bộ tài khoản'}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-3)] max-w-[250px] truncate" title={reason}>
                        {reason}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500 text-white flex items-center gap-1 w-fit px-2 py-0.5 rounded-[calc(var(--radius)*0.6)] font-bold text-[9px] shadow-sm shadow-emerald-500/10">
                          <ShieldCheck size={11} />
                          Thành công
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={editingReport}
        onSave={handleSaveReport}
      />
    </div>
  )
}
