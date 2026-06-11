'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
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
import ScheduleModal from './ScheduleModal'

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

type AdsAccount = {
  id: string
  name: string | null
  customerId: string
}

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Tạm dừng',
  enable_campaign: 'Bật chiến dịch',
  set_budget: 'Đặt ngân sách',
  increase_budget: 'Tăng ngân sách',
  decrease_budget: 'Giảm ngân sách'
}

export default function ScheduleListClient({ initialSchedules, accounts }: { initialSchedules: Schedule[], accounts: AdsAccount[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

  const handleToggleStatus = async (schedule: Schedule) => {
    const newStatus = schedule.status === 'active' ? 'paused' : 'active'
    
    // Optimistic update
    setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, status: newStatus } : s))

    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to toggle')
    } catch (e) {
      // Revert
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, status: schedule.status } : s))
      alert('Lỗi khi cập nhật trạng thái')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá lịch trình này?')) return

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSchedules(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      alert('Lỗi khi xoá lịch trình')
    }
  }

  const handleSave = (savedSchedule: Schedule) => {
    if (editingSchedule) {
      setSchedules(prev => prev.map(s => s.id === savedSchedule.id ? savedSchedule : s))
    } else {
      setSchedules([savedSchedule, ...schedules])
    }
    setIsModalOpen(false)
    setEditingSchedule(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-card)] p-6 rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-1)]">
            Dayparting (Lịch trình Chiến dịch)
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            Tự động bật/tắt hoặc điều chỉnh ngân sách theo khung giờ cố định.
          </p>
        </div>
        <Button 
          onClick={() => { setEditingSchedule(null); setIsModalOpen(true); }}
          className="h-10 px-5 rounded-[calc(var(--radius)*0.8)] gap-2 flex items-center cursor-pointer shadow-sm border-0"
        >
          <Plus size={16} />
          Tạo lịch trình
        </Button>
      </div>

      {/* Table Container */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tài khoản</TableHead>
              <TableHead>Tên lịch trình</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Chiến dịch</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tuỳ chọn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[var(--text-3)] italic text-xs">
                  Chưa có lịch trình nào.
                </TableCell>
              </TableRow>
            ) : schedules.map(schedule => (
              <TableRow key={schedule.id}>
                <TableCell className="font-semibold text-xs text-[var(--text-2)] truncate max-w-[180px]">
                  {accounts.find(a => a.id === schedule.adsAccountId)?.name || schedule.adsAccountId}
                </TableCell>
                <TableCell className="font-bold text-xs text-[var(--text-1)]">{schedule.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px] tracking-tight rounded-[calc(var(--radius)*0.6)] border-[var(--border)] bg-[var(--bg-secondary)]">
                    {schedule.executionTime}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[calc(var(--radius)*0.4)] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {ACTION_LABELS[schedule.actionType] || schedule.actionType}
                    {schedule.budgetValue && ` (${schedule.budgetValue}${schedule.budgetIsPercentage ? '%' : 'đ'})`}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-semibold text-[var(--text-2)]">
                  {schedule.campaignIds.length} chiến dịch
                </TableCell>
                <TableCell>
                  <button 
                    onClick={() => handleToggleStatus(schedule)}
                    className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer border-0 ${schedule.status === 'active' ? 'bg-emerald-600' : 'bg-[var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all ${schedule.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]" onClick={() => { setEditingSchedule(schedule); setIsModalOpen(true); }}>
                      <Edit size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(schedule.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <ScheduleModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          schedule={editingSchedule}
          accounts={accounts}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
