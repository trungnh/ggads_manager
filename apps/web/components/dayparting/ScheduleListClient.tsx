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
import { cn } from "@/lib/utils"

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-[var(--radius)] border border-border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Dayparting (Lịch trình Chiến dịch)
          </h1>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tự động bật/tắt hoặc điều chỉnh ngân sách theo khung giờ cố định.
          </p>
        </div>
        <Button 
          onClick={() => { setEditingSchedule(null); setIsModalOpen(true); }}
          className="h-9 px-5 rounded-[calc(var(--radius)*0.8)] gap-2 flex items-center cursor-pointer shadow-sm border-0 bg-primary text-primary-foreground hover:bg-primary/95 transition duration-150 text-xs font-bold"
        >
          <Plus size={16} />
          Tạo lịch trình
        </Button>
      </div>

      {/* Table Container */}
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow>
              <TableHead className="font-bold text-xs text-muted-foreground">Tài khoản</TableHead>
              <TableHead className="font-bold text-xs text-muted-foreground">Tên lịch trình</TableHead>
              <TableHead className="font-bold text-xs text-muted-foreground">Thời gian</TableHead>
              <TableHead className="font-bold text-xs text-muted-foreground">Hành động</TableHead>
              <TableHead className="font-bold text-xs text-muted-foreground">Chiến dịch</TableHead>
              <TableHead className="font-bold text-xs text-muted-foreground">Trạng thái</TableHead>
              <TableHead className="text-right font-bold text-xs text-muted-foreground">Tuỳ chọn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground italic text-xs">
                  Chưa có lịch trình nào.
                </TableCell>
              </TableRow>
            ) : schedules.map(schedule => (
              <TableRow key={schedule.id} className="hover:bg-muted/10 transition duration-150">
                <TableCell className="font-semibold text-xs text-muted-foreground truncate max-w-[180px] py-4">
                  {accounts.find(a => a.id === schedule.adsAccountId)?.name || schedule.adsAccountId}
                </TableCell>
                <TableCell className="font-bold text-xs text-foreground py-4">{schedule.name}</TableCell>
                <TableCell className="py-4">
                  <Badge variant="outline" className="font-mono text-[10px] tracking-tight rounded-full border-border bg-background px-2 py-0.5">
                    {schedule.executionTime}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {ACTION_LABELS[schedule.actionType] || schedule.actionType}
                    {schedule.budgetValue && ` (${schedule.budgetValue}${schedule.budgetIsPercentage ? '%' : 'đ'})`}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground py-4">
                  {schedule.campaignIds.length} chiến dịch
                </TableCell>
                <TableCell className="py-4">
                  <button 
                    onClick={() => handleToggleStatus(schedule)}
                    className={cn(
                      "w-9 h-5 rounded-full relative transition-colors cursor-pointer border-none outline-none",
                      schedule.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                      schedule.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                    )} />
                  </button>
                </TableCell>
                <TableCell className="text-right py-4 pr-5">
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] text-muted-foreground hover:bg-muted transition duration-150" onClick={() => { setEditingSchedule(schedule); setIsModalOpen(true); }}>
                      <Edit size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition duration-150" onClick={() => handleDelete(schedule.id)}>
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
