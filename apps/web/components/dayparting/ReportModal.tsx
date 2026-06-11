'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, AlertTriangle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

type TelegramConnection = {
  id: string
  name: string
  chatId: string
}

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: Report | null
  onSave: (r: Report) => void
}

export default function ReportModal({
  isOpen,
  onClose,
  report,
  onSave
}: ReportModalProps) {
  const [connections, setConnections] = useState<TelegramConnection[]>([])
  const [loadingConns, setLoadingConns] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [name, setName] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [frequencyMinutes, setFrequencyMinutes] = useState(60)
  const [hoursStart, setHoursStart] = useState('06:00')
  const [hoursEnd, setHoursEnd] = useState('22:00')
  const [customMessage, setCustomMessage] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch connections on mount
  useEffect(() => {
    if (!isOpen) return

    const fetchConns = async () => {
      setLoadingConns(true)
      setError('')
      try {
        const res = await fetch('/api/telegram/connections')
        if (res.ok) {
          const data = await res.json()
          const conns = data.connections || []
          setConnections(conns)
          
          // Set default connection
          if (report) {
            setConnectionId(report.connectionId)
          } else if (conns.length > 0) {
            setConnectionId(conns[0].id)
          }
        } else {
          setError('Không thể tải danh sách kết nối Telegram.')
        }
      } catch (err) {
        console.error('Failed to load connections:', err)
        setError('Lỗi kết nối khi tải Telegram connections.')
      } finally {
        setLoadingConns(false)
      }
    }

    fetchConns()
  }, [isOpen, report])

  // Sync form values with report prop when editing
  useEffect(() => {
    if (isOpen) {
      if (report) {
        setName(report.name)
        setConnectionId(report.connectionId)
        setFrequencyMinutes(report.frequencyMinutes)
        setHoursStart(report.hoursStart)
        setHoursEnd(report.hoursEnd)
        setCustomMessage(report.customMessage || '')
      } else {
        setName('')
        setFrequencyMinutes(60)
        setHoursStart('06:00')
        setHoursEnd('22:00')
        setCustomMessage('')
        if (connections.length > 0) {
          setConnectionId(connections[0].id)
        } else {
          setConnectionId('')
        }
      }
    }
  }, [isOpen, report, connections])

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setCustomMessage(prev => prev + `{${variable}}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)
    
    setCustomMessage(before + `{${variable}}` + after)
    
    // Focus back and set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      const newPos = start + variable.length + 2
      textarea.setSelectionRange(newPos, newPos)
    }, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Vui lòng nhập tên lịch báo cáo.')
      return
    }
    if (!connectionId) {
      alert('Vui lòng chọn kênh Telegram nhận tin.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      id: report?.id,
      name,
      connectionId,
      frequencyMinutes,
      hoursStart,
      hoursEnd,
      customMessage: customMessage.trim() || null,
      isEnabled: report ? report.isEnabled : true
    }

    try {
      const method = report ? 'PUT' : 'POST'
      const res = await fetch('/api/telegram/reports', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gặp lỗi khi lưu lịch báo cáo.')
      }

      onSave(data.report)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu lịch báo cáo.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-[2px]">
      <div className="bg-[var(--bg-card)] w-[750px] max-w-[95vw] rounded-[var(--radius)] overflow-hidden border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h2 className="text-base font-bold leading-tight m-0 text-[var(--text-1)]">
            {report ? 'Chỉnh sửa lịch báo cáo P&L' : 'Đặt lịch báo cáo P&L tự động'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="bg-transparent border-0 cursor-pointer text-[var(--text-3)] hover:text-[var(--text-1)] p-1.5 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-[calc(var(--radius)*0.8)] text-red-700 dark:text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {connections.length === 0 && !loadingConns && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-[calc(var(--radius)*0.8)] text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-bold">Yêu cầu kết nối Telegram trước: </span>
                  Vui lòng tạo ít nhất một kết nối Telegram để nhận tin nhắn báo cáo.
                </div>
              </div>
            )}

            {/* Row 1: Name and Connection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-name" className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Tên lịch báo cáo <span className="text-red-500">*</span></Label>
                <Input 
                  id="report-name"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Vd: Báo cáo P&L Media Buyers Hàng Giờ" 
                  className="h-10 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-xs bg-transparent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-conn" className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Kênh Telegram nhận tin <span className="text-red-500">*</span></Label>
                {loadingConns ? (
                  <div className="h-10 border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] px-3 flex items-center gap-2 text-xs text-[var(--text-3)] bg-[var(--bg-secondary)]">
                    <Loader2 size={14} className="animate-spin text-[var(--primary)]" />
                    Đang tải danh sách kênh...
                  </div>
                ) : (
                  <select 
                    id="report-conn"
                    value={connectionId} 
                    onChange={e => setConnectionId(e.target.value)}
                    className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] px-3 bg-transparent text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-semibold"
                    disabled={connections.length === 0}
                    required
                  >
                    {connections.length === 0 ? (
                      <option value="">-- Chưa cấu hình kết nối --</option>
                    ) : (
                      connections.map(c => (
                        <option key={c.id} value={c.id} className="bg-[var(--bg-card)] text-xs text-[var(--text-1)]">
                          {c.name} ({c.chatId})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>

            {/* Row 2: Frequency and Times */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-freq" className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Tần suất gửi định kỳ</Label>
                <select 
                  id="report-freq"
                  value={frequencyMinutes} 
                  onChange={e => setFrequencyMinutes(Number(e.target.value))}
                  className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] px-3 bg-transparent text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-semibold"
                >
                  <option value={30} className="bg-[var(--bg-card)]">Mỗi 30 phút</option>
                  <option value={60} className="bg-[var(--bg-card)]">Mỗi 1 giờ (Hàng giờ)</option>
                  <option value={120} className="bg-[var(--bg-card)]">Mỗi 2 giờ</option>
                  <option value={240} className="bg-[var(--bg-card)]">Mỗi 4 giờ</option>
                  <option value={720} className="bg-[var(--bg-card)]">Mỗi 12 giờ</option>
                  <option value={1440} className="bg-[var(--bg-card)]">Mỗi ngày (24 giờ)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-start" className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Giờ bắt đầu gửi hàng ngày</Label>
                <Input 
                  id="report-start"
                  value={hoursStart} 
                  onChange={e => setHoursStart(e.target.value)} 
                  placeholder="Vd: 06:00" 
                  className="h-10 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-xs font-mono text-center"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-end" className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Giờ kết thúc gửi hàng ngày</Label>
                <Input 
                  id="report-end"
                  value={hoursEnd} 
                  onChange={e => setHoursEnd(e.target.value)} 
                  placeholder="Vd: 22:00" 
                  className="h-10 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-xs font-mono text-center"
                />
              </div>
            </div>

            {/* Row 3: Custom message template */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="report-msg" className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Nội dung tin nhắn báo cáo P&L</Label>
                <span className="text-[10px] text-[var(--text-3)] font-semibold italic">* Trống = Dùng mẫu hệ thống</span>
              </div>
              <textarea
                id="report-msg"
                ref={textareaRef}
                rows={6}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Mẫu báo cáo P&L mặc định của hệ thống..."
                className="w-full p-4 bg-transparent border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] text-xs font-mono text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all resize-y"
              />

              {/* Dynamic Variables Helper */}
              <div className="space-y-1.5 bg-[var(--bg-secondary)] p-3 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)]">
                <div className="flex items-center gap-1">
                  <HelpCircle size={12} className="text-[var(--text-3)]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-2)]">💡 Click để chèn nhanh các biến số động P&L:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "Chi tiêu Ads", var: "ads_cost" },
                    { label: "Đơn thành công", var: "crm_success_orders" },
                    { label: "Đơn chờ duyệt", var: "crm_pending_orders" },
                    { label: "Doanh thu thực", var: "net_revenue" },
                    { label: "ROAS thực tế", var: "roas" },
                    { label: "Lợi nhuận ròng", var: "profit" },
                    { label: "Tỉ lệ chốt đơn", var: "success_rate" },
                  ].map((item) => (
                    <button
                      key={item.var}
                      type="button"
                      onClick={() => insertVariable(item.var)}
                      className="bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[10px] font-bold text-[var(--text-2)] px-2 py-1 rounded-[calc(var(--radius)*0.6)] transition-all border border-[var(--border)] cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2.5 bg-[var(--bg-card)] shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={saving}
              className="h-9 px-4 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-secondary)] text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={saving || connections.length === 0}
              className="h-9 px-5 rounded-[calc(var(--radius)*0.8)] text-xs font-bold cursor-pointer bg-sky-500 hover:bg-sky-600 text-white border-0 shadow-md shadow-sky-500/10 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Đang lưu...
                </>
              ) : (
                report ? 'Lưu thay đổi' : 'Lưu lịch trình'
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
