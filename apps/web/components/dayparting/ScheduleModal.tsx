'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

export default function ScheduleModal({
  isOpen, onClose, schedule, accounts, onSave
}: {
  isOpen: boolean, onClose: () => void, schedule: Schedule | null, accounts: AdsAccount[], onSave: (s: Schedule) => void
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(schedule?.adsAccountId || '')
  const [name, setName] = useState(schedule?.name || '')
  const [actionType, setActionType] = useState(schedule?.actionType || 'pause_campaign')
  const [executionTime, setExecutionTime] = useState(schedule?.executionTime || '00:00')
  const [budgetValue, setBudgetValue] = useState(schedule?.budgetValue || '')
  const [budgetIsPercentage, setBudgetIsPercentage] = useState(schedule?.budgetIsPercentage || false)
  const [campaignIds, setCampaignIds] = useState<string[]>(schedule?.campaignIds || [])
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<{ id: string, name: string, status: string }[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  useEffect(() => {
    if (!selectedAccountId) {
      setCampaigns([])
      return
    }
    const fetchCampaigns = async () => {
      setLoadingCampaigns(true)
      try {
        const res = await fetch(`/api/campaigns/${selectedAccountId}`)
        if (res.ok) {
          const data = await res.json()
          setCampaigns(data.campaigns || [])
        }
      } catch (e) {
        console.error("Failed to load campaigns", e)
      } finally {
        setLoadingCampaigns(false)
      }
    }
    fetchCampaigns()
  }, [selectedAccountId])

  // Generate 5-min intervals
  const timeOptions = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      timeOptions.push(`${hh}:${mm}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId) {
      alert('Vui lòng chọn tài khoản quảng cáo.')
      return
    }
    if (!name || !actionType || !executionTime || campaignIds.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin (Tên, Hành động, Khung giờ, Chiến dịch).')
      return
    }

    setLoading(true)
    const payload = {
      adsAccountId: selectedAccountId,
      name,
      actionType,
      executionTime,
      budgetValue: budgetValue || null,
      budgetIsPercentage,
      campaignIds,
      status: schedule?.status || 'active'
    }

    try {
      const method = schedule ? 'PATCH' : 'POST'
      const url = schedule ? `/api/schedules/${schedule.id}` : '/api/schedules'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Lỗi lưu lịch trình')
      
      const data = await res.json()
      onSave(data.schedule)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] w-[850px] max-w-[95vw] rounded-[var(--radius)] overflow-hidden border border-[var(--border)] shadow-2xl flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h2 className="text-base font-bold leading-tight m-0">
            {schedule ? 'Sửa lịch trình' : 'Tạo lịch trình mới'}
          </h2>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-[var(--text-3)] hover:text-[var(--text-1)] p-1.5 rounded-full hover:bg-[var(--bg-secondary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
            <div>
              <Label className="mb-2 block text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Tài khoản quảng cáo</Label>
              <select 
                value={selectedAccountId} 
                onChange={e => setSelectedAccountId(e.target.value)}
                disabled={!!schedule}
                className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] px-3 bg-transparent text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium disabled:opacity-50"
              >
                <option value="" className="bg-[var(--bg-card)]">-- Chọn tài khoản quảng cáo --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[var(--bg-card)]">{acc.name || acc.customerId}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-2 block text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Tên lịch trình</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Vd: Tắt chiến dịch khuya..." 
                className="h-10 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Khung giờ chạy</Label>
                <select 
                  value={executionTime} 
                  onChange={e => setExecutionTime(e.target.value)}
                  className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] px-3 bg-transparent text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-mono"
                >
                  {timeOptions.map(t => (
                    <option key={t} value={t} className="bg-[var(--bg-card)]">{t}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label className="mb-2 block text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Hành động</Label>
                <select 
                  value={actionType} 
                  onChange={e => setActionType(e.target.value)}
                  className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] px-3 bg-transparent text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
                >
                  <option value="pause_campaign" className="bg-[var(--bg-card)]">Tạm dừng chiến dịch</option>
                  <option value="enable_campaign" className="bg-[var(--bg-card)]">Bật chiến dịch</option>
                  <option value="set_budget" className="bg-[var(--bg-card)]">Đặt ngân sách</option>
                  <option value="increase_budget" className="bg-[var(--bg-card)]">Tăng ngân sách</option>
                  <option value="decrease_budget" className="bg-[var(--bg-card)]">Giảm ngân sách</option>
                </select>
              </div>
            </div>

            {['set_budget', 'increase_budget', 'decrease_budget'].includes(actionType) && (
              <div className="animate-in slide-in-from-top-2 duration-150">
                <Label className="mb-2 block text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Giá trị ngân sách</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={budgetValue} 
                    onChange={e => setBudgetValue(e.target.value)} 
                    placeholder="0" 
                    className="h-10 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-xs font-mono"
                  />
                  <select 
                    value={budgetIsPercentage ? 'percent' : 'vnd'} 
                    onChange={e => setBudgetIsPercentage(e.target.value === 'percent')}
                    className="w-24 h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] px-3 bg-transparent text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-bold"
                  >
                    <option value="vnd" className="bg-[var(--bg-card)]">VNĐ</option>
                    <option value="percent" className="bg-[var(--bg-card)]">%</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Chiến dịch áp dụng</Label>
              
              <div className="border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] max-h-[300px] overflow-y-auto bg-[var(--bg-card)]">
                {loadingCampaigns ? (
                  <div className="py-12 text-center text-xs text-[var(--text-3)] italic flex flex-col items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
                    Đang tải chiến dịch...
                  </div>
                ) : !selectedAccountId ? (
                  <div className="py-12 text-center text-xs text-[var(--text-3)] italic">
                    Vui lòng chọn tài khoản quảng cáo để hiển thị chiến dịch
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-3)] italic">
                    Không tìm thấy chiến dịch nào
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)] sticky top-0 z-[1]">
                        <th className="py-3 px-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={campaigns.length > 0 && campaigns.every(c => campaignIds.includes(c.id))}
                            onChange={e => {
                              if (e.target.checked) {
                                setCampaignIds(campaigns.map(c => c.id))
                              } else {
                                setCampaignIds([])
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4 font-bold text-[10px] text-[var(--text-3)] uppercase tracking-wider">
                          Campaign ID
                        </th>
                        <th className="py-3 px-4 font-bold text-[10px] text-[var(--text-3)] uppercase tracking-wider">
                          Campaign Name
                        </th>
                        <th className="py-3 px-4 font-bold text-[10px] text-[var(--text-3)] uppercase tracking-wider w-32">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(camp => {
                        const isSelected = campaignIds.includes(camp.id)
                        return (
                          <tr 
                            key={camp.id} 
                            onClick={() => {
                              if (isSelected) {
                                setCampaignIds(campaignIds.filter(id => id !== camp.id))
                              } else {
                                setCampaignIds([...campaignIds, camp.id])
                              }
                            }}
                            className={`border-b border-[var(--border)] cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10' : 'hover:bg-[var(--bg-secondary)]'}`}
                          >
                            <td 
                              className="py-3.5 px-4 text-center"
                              onClick={e => e.stopPropagation()}
                            >
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={e => {
                                  if (e.target.checked) {
                                    setCampaignIds([...campaignIds, camp.id])
                                  } else {
                                    setCampaignIds(campaignIds.filter(id => id !== camp.id))
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[var(--text-2)] font-medium">
                              {camp.id}
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-1)] font-semibold">
                              {camp.name}
                            </td>
                            <td className="py-3.5 px-4">
                              {camp.status.toUpperCase() === 'ENABLED' || camp.status.toUpperCase() === 'ACTIVE' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[calc(var(--radius)*0.4)] text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Đang chạy
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[calc(var(--radius)*0.4)] text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Tạm dừng
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-3)] mt-2">* Chọn ít nhất 1 chiến dịch để áp dụng lịch trình này</p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2.5 bg-[var(--bg-card)]">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="h-9 px-4 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-secondary)] text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-9 px-5 rounded-[calc(var(--radius)*0.8)] text-xs font-bold cursor-pointer"
            >
              {loading ? 'Đang lưu...' : 'Lưu lịch trình'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
