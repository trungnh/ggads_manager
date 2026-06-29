'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ArrowLeft, Save, AlertCircle, Search, Loader2 } from 'lucide-react'

// --- Types ---
interface Condition {
  conditionGroup: number
  metric: string
  operator: string
  value: string
  valueMax?: string
}

interface Action {
  actionType: string
  actionValue?: string
  alertMessage?: string
  telegramConnectionId?: string
}

interface Campaign {
  id: string
  name: string
  status: string
}

export default function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // --- State ---
  const [loading, setLoading] = useState(false)
  const [fetchingRule, setFetchingRule] = useState(true)
  const [adsAccounts, setAdsAccounts] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [fetchingCampaigns, setFetchingCampaigns] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [adsAccountId, setAdsAccountId] = useState('')
  const [targetType, setTargetType] = useState('all')
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
  const [campaignSearch, setCampaignSearch] = useState('')
  const [enableMaxExecutions, setEnableMaxExecutions] = useState(true)
  
  // Guardrails States
  const [guardrailLearningProtection, setGuardrailLearningProtection] = useState(false)
  const [guardrail3xKill, setGuardrail3xKill] = useState(false)
  const [guardrailBudgetSuffocation, setGuardrailBudgetSuffocation] = useState(false)
  
  const [conditions, setConditions] = useState<Condition[]>([])
  const [actions, setActions] = useState<Action[]>([])

  const [telegramConnections, setTelegramConnections] = useState<any[]>([])

  const [schedule, setSchedule] = useState({
    hoursStart: '08:00',
    hoursEnd: '22:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    cooldownMinutes: 120,
    maxExecutionsPerDay: 1
  })

  // --- Fetch Rule Data ---
  useEffect(() => {
    const fetchRule = async () => {
      try {
        const res = await fetch(`/api/rules/${id}`)
        if (!res.ok) throw new Error('Failed to fetch rule')
        const data = await res.json()
        const rule = data.rule

        setName(rule.name)
        setDescription(rule.description || '')
        setAdsAccountId(rule.adsAccountId)
        setTargetType(rule.targetType)
        setSelectedCampaignIds(rule.targetValue || [])
        setConditions(rule.conditions.map((c: any) => ({
          conditionGroup: c.conditionGroup,
          metric: c.metric,
          operator: c.operator,
          value: (c.value !== null && c.value !== undefined) ? c.value.toString() : ''
        })))
        setActions(rule.actions.map((a: any) => ({
          actionType: a.actionType,
          actionValue: (a.actionValue !== null && a.actionValue !== undefined) ? a.actionValue.toString() : '',
          alertMessage: a.alertMessage || '',
          telegramConnectionId: a.telegramConnectionId || ''
        })))
        
        // Load Guardrails
        setGuardrailLearningProtection(rule.guardrailLearningProtection || false)
        setGuardrail3xKill(rule.guardrail3xKill || false)
        setGuardrailBudgetSuffocation(rule.guardrailBudgetSuffocation || false)

        if (rule.schedule) {
          setSchedule({
            hoursStart: rule.schedule.hoursStart || '08:00',
            hoursEnd: rule.schedule.hoursEnd || '22:00',
            days: rule.schedule.days || [1, 2, 3, 4, 5, 6, 7],
            cooldownMinutes: rule.schedule.cooldownMinutes || 120,
            maxExecutionsPerDay: rule.schedule.maxExecutionsPerDay || 1
          })
          setEnableMaxExecutions(rule.schedule.maxExecutionsPerDay !== null)
        }
      } catch (err) {
        console.error(err)
        alert('Không tìm thấy Rule hoặc có lỗi xảy ra!')
        router.push('/rules')
      } finally {
        setFetchingRule(false)
      }
    }

    fetchRule()
  }, [id, router])

  // Update dynamic route label for Topnav breadcrumbs
  useEffect(() => {
    if (name) {
      if (typeof window !== 'undefined') {
        if (!(window as any).__dynamicRouteLabels) {
          (window as any).__dynamicRouteLabels = {}
        }
        (window as any).__dynamicRouteLabels[id] = name
        window.dispatchEvent(new CustomEvent('dynamic-route-labels-updated'))
      }
    }
  }, [id, name])

  // --- Fetch Supporting Data ---
  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => setAdsAccounts(data.accounts || []))
  }, [])

  useEffect(() => {
    fetch('/api/telegram/connections')
      .then(res => res.json())
      .then(data => setTelegramConnections(data.connections || []))
      .catch(err => console.error('[FETCH_TELEGRAM_CONNECTIONS_ERROR]', err));
  }, [])

  useEffect(() => {
    if (adsAccountId && targetType === 'specific') {
      setFetchingCampaigns(true)
      fetch(`/api/campaigns/${adsAccountId}?status=ALL`)
        .then(res => res.json())
        .then(data => {
          setCampaigns(data.campaigns || [])
          setFetchingCampaigns(false)
        })
    }
  }, [adsAccountId, targetType])

  // --- Handlers ---
  const handleAddCondition = (groupId: number) => {
    setConditions([...conditions, { conditionGroup: groupId, metric: 'real_cpa', operator: 'gt', value: '150000' }])
  }

  const handleAddGroup = () => {
    const nextGroupId = conditions.length > 0 ? Math.max(...conditions.map(c => c.conditionGroup)) + 1 : 0
    setConditions([...conditions, { conditionGroup: nextGroupId, metric: 'cflc_cost', operator: 'gt', value: '100000' }])
  }

  const handleRemoveCondition = (index: number) => {
    const newConditions = [...conditions]
    newConditions.splice(index, 1)
    if (newConditions.length === 0) {
      newConditions.push({ conditionGroup: 0, metric: 'cflc_cost', operator: 'gt', value: '100000' })
    }
    setConditions(newConditions)
  }

  const handleSave = async () => {
    if (!name || !adsAccountId) return alert('Vui lòng nhập tên và chọn tài khoản!')
    
    setLoading(true)
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          adsAccountId,
          targetType,
          targetValue: targetType === 'specific' ? selectedCampaignIds : null,
          conditions,
          actions,
          guardrailLearningProtection,
          guardrail3xKill,
          guardrailBudgetSuffocation,
          schedule: {
            ...schedule,
            maxExecutionsPerDay: enableMaxExecutions ? schedule.maxExecutionsPerDay : null
          }
        })
      })

      if (res.ok) {
        router.push('/rules')
        router.refresh()
      } else {
        const err = await res.json()
        alert('Lỗi: ' + err.message)
      }
    } catch (err) {
      alert('Đã có lỗi xảy ra!')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingRule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        <p className="text-[var(--text-3)] animate-pulse">Đang tải thông tin Rule...</p>
      </div>
    )
  }

  // --- Render Helpers ---
  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(campaignSearch.toLowerCase())
  )

  const groupedConditions = conditions.reduce((acc, c, idx) => {
    if (!acc[c.conditionGroup]) acc[c.conditionGroup] = []
    acc[c.conditionGroup].push({ ...c, originalIndex: idx })
    return acc
  }, {} as Record<number, any[]>)

  return (
    <div className="w-full pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-3)] hover:text-[var(--text-1)] w-9 h-9 flex items-center justify-center shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">Chỉnh sửa Rule</h1>
          <p className="text-sm text-[var(--text-3)]">Cập nhật thiết lập tự động hóa tối ưu.</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* --- Thông tin chung --- */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--text-1)]">1. Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[var(--text-2)]">Tên Rule</Label>
              <Input 
                id="name" 
                placeholder="VD: Tắt camp khi CPA quá cao" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-[var(--text-1)] bg-[var(--bg-card)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc" className="text-[var(--text-2)]">Mô tả (không bắt buộc)</Label>
              <Input 
                id="desc" 
                placeholder="Mô tả mục đích của rule này..." 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-[var(--text-1)] bg-[var(--bg-card)]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[var(--text-2)]">Tài khoản Google Ads áp dụng</Label>
              <Select value={adsAccountId} onValueChange={setAdsAccountId}>
                <SelectTrigger className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-[var(--text-1)] bg-[var(--bg-card)]">
                  <SelectValue placeholder="Chọn tài khoản...">
                    {adsAccounts.find(acc => acc.id === adsAccountId)
                      ? `${adsAccounts.find(acc => acc.id === adsAccountId).name} (${adsAccounts.find(acc => acc.id === adsAccountId).customerId})`
                      : (adsAccountId ? 'Đang tải tài khoản...' : 'Chọn tài khoản...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {adsAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.customerId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* --- Đối tượng áp dụng --- */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--text-1)]">2. Đối tượng áp dụng</CardTitle>
            <CardDescription className="text-[var(--text-3)]">Chọn các chiến dịch mà Rule này sẽ theo dõi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex gap-4">
              <Button 
                type="button"
                variant={targetType === 'all' ? 'default' : 'outline'}
                className={cn(
                  "flex-1 rounded-xl font-bold transition-all border",
                  targetType === 'all'
                    ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 border-transparent shadow-sm"
                    : "text-muted-foreground border-border hover:bg-secondary/40 hover:text-foreground bg-transparent"
                )}
                onClick={() => setTargetType('all')}
              >
                Tất cả chiến dịch
              </Button>
              <Button 
                type="button"
                variant={targetType === 'specific' ? 'default' : 'outline'}
                className={cn(
                  "flex-1 rounded-xl font-bold transition-all border",
                  targetType === 'specific'
                    ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 border-transparent shadow-sm"
                    : "text-muted-foreground border-border hover:bg-secondary/40 hover:text-foreground bg-transparent"
                )}
                onClick={() => setTargetType('specific')}
              >
                Chiến dịch cụ thể
              </Button>
            </div>

            {targetType === 'specific' && (
              <div className="border border-[var(--border)] rounded-[var(--radius)] p-4 bg-[var(--bg-secondary)]/50">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-3)]" />
                  <Input 
                    placeholder="Tìm kiếm chiến dịch..." 
                    className="pl-9 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] text-[var(--text-1)] bg-[var(--bg-card)]"
                    value={campaignSearch}
                    onChange={e => setCampaignSearch(e.target.value)}
                  />
                </div>
                
                {fetchingCampaigns ? (
                  <div className="text-center py-8 text-sm text-[var(--text-3)]">Đang tải danh sách...</div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {filteredCampaigns.map(c => (
                      <div key={c.id} className="flex items-center space-x-2 p-2 hover:bg-[var(--bg-secondary)] rounded-[calc(var(--radius)*0.6)] transition-colors">
                        <Checkbox 
                          id={c.id} 
                          checked={selectedCampaignIds.includes(c.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedCampaignIds([...selectedCampaignIds, c.id])
                            else setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== c.id))
                          }}
                        />
                        <Label htmlFor={c.id} className="flex-1 cursor-pointer font-semibold text-sm text-[var(--text-2)] flex items-center justify-between gap-3 min-w-0">
                          <span className="truncate">{c.name}</span>
                          <span className={cn(
                            "text-[9px] font-extrabold px-2 py-0.5 rounded-md border tracking-wide uppercase inline-flex items-center justify-center shrink-0 leading-none",
                            c.status === 'ENABLED'
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                          )}>
                            {c.status === 'ENABLED' ? 'Hoạt động' : (c.status === 'PAUSED' ? 'Tạm dừng' : c.status)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-3)] font-semibold">
                    Đã chọn <span className="text-primary font-bold">{selectedCampaignIds.length}</span> chiến dịch
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const allFilteredIds = filteredCampaigns.map(c => c.id)
                        const newSelected = Array.from(new Set([...selectedCampaignIds, ...allFilteredIds]))
                        setSelectedCampaignIds(newSelected)
                      }}
                      className="text-xs h-8 px-3 rounded-md font-semibold border-border hover:bg-secondary/60 text-foreground transition-all cursor-pointer"
                    >
                      Chọn tất cả
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedCampaignIds([])} 
                      className="text-xs h-8 px-3 rounded-md font-semibold border-destructive/20 hover:bg-destructive/10 text-destructive hover:border-destructive/30 transition-all cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Điều kiện (Core) --- */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg text-[var(--text-1)]">3. Điều kiện</CardTitle>
              <CardDescription className="text-[var(--text-3)]">
                Khi các điều kiện này thỏa mãn, Rule sẽ kích hoạt.
                <span className="block mt-1 text-[11px] text-muted-foreground italic font-medium">
                  * Chú thích: CFLC (Cost From Last Conversion) là chi tiêu thêm của chiến dịch kể từ khi có lượt chuyển đổi (đơn hàng) gần nhất
                </span>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddGroup} className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]">
              <Plus className="w-4 h-4 mr-1" /> Thêm nhóm (OR)
            </Button>
          </CardHeader>
          <CardContent className="grid gap-6">
            {Object.entries(groupedConditions).map(([groupId, groupConds], groupIdx) => (
              <div key={groupId} className="relative">
                {groupIdx > 0 && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-[1px] flex-1 bg-[var(--border)]" />
                    <Badge variant="secondary" className="px-4 py-1 rounded-[calc(var(--radius)*0.4)]">HOẶC (OR)</Badge>
                    <div className="h-[1px] flex-1 bg-[var(--border)]" />
                  </div>
                )}
                
                <div className="border border-[var(--primary)]/30 rounded-[var(--radius)] p-6 bg-[var(--bg-secondary)]/80 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-[var(--primary)]">Nhóm điều kiện {groupIdx + 1}</h4>
                    {Object.keys(groupedConditions).length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-[calc(var(--radius)*0.6)]"
                        onClick={() => {
                          const newConditions = conditions.filter(c => c.conditionGroup !== Number(groupId))
                          setConditions(newConditions.length ? newConditions : [{ conditionGroup: 0, metric: 'cflc_cost', operator: 'gt', value: '100000' }])
                        }}
                      >
                        Xóa nhóm
                      </Button>
                    )}
                  </div>
                  
                  {groupConds.map((c, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3">
                      {idx > 0 && <span className="text-xs font-bold text-[var(--text-3)] w-full sm:w-auto text-center">VÀ (AND)</span>}
                      <Select 
                        value={c.metric} 
                        onValueChange={val => {
                          const newConds = [...conditions]
                          newConds[c.originalIndex].metric = val
                          setConditions(newConds)
                        }}
                      >
                        <SelectTrigger className="w-[180px] h-9 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]">
                          <SelectValue placeholder="Chọn chỉ số...">
                            {c.metric === 'cflc_cost' && 'CFLC Chi tiêu'}
                            {c.metric === 'real_cpa' && 'Giá đơn thực (CPA)'}
                            {c.metric === 'real_roas' && 'ROAS đơn thực'}
                            {c.metric === 'cost' && 'Tổng chi tiêu hôm nay'}
                            {c.metric === 'real_conversions' && 'Số đơn thực'}
                            {c.metric === 'budget_spent_pct' && '% Ngân sách đã tiêu'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cflc_cost">CFLC Chi tiêu</SelectItem>
                          <SelectItem value="real_cpa">Giá đơn thực (CPA)</SelectItem>
                          <SelectItem value="real_roas">ROAS đơn thực</SelectItem>
                          <SelectItem value="cost">Tổng chi tiêu hôm nay</SelectItem>
                          <SelectItem value="real_conversions">Số đơn thực</SelectItem>
                          <SelectItem value="budget_spent_pct">% Ngân sách đã tiêu</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select 
                        value={c.operator}
                        onValueChange={val => {
                          const newConds = [...conditions]
                          newConds[c.originalIndex].operator = val
                          setConditions(newConds)
                        }}
                      >
                        <SelectTrigger className="w-[100px] h-9 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]">
                          <SelectValue className="w-full">
                            <span className="w-full text-center text-amber-600 dark:text-amber-400 font-bold block text-sm">
                              {c.operator === 'gt' && '>'}
                              {c.operator === 'lt' && '<'}
                              {c.operator === 'gte' && '>='}
                              {c.operator === 'lte' && '<='}
                              {c.operator === 'eq' && '='}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gt">{'>'}</SelectItem>
                          <SelectItem value="lt">{'<'}</SelectItem>
                          <SelectItem value="gte">{'>='}</SelectItem>
                          <SelectItem value="lte">{'<='}</SelectItem>
                          <SelectItem value="eq">{'='}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input 
                        className="w-[120px] h-9 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]" 
                        type="number"
                        value={c.value}
                        onChange={e => {
                          const newConds = [...conditions]
                          newConds[c.originalIndex].value = e.target.value
                          setConditions(newConds)
                        }}
                      />

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-[var(--text-3)] hover:text-rose-500 rounded-full"
                        onClick={() => handleRemoveCondition(c.originalIndex)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="mt-3 h-9 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all font-semibold flex items-center gap-1.5 cursor-pointer px-4"
                    onClick={() => handleAddCondition(Number(groupId))}
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm điều kiện (AND)
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>


        {/* --- Hành động --- */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--text-1)]">4. Hành động thực thi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {actions.map((action, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-4 p-4 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--bg-secondary)]/30 relative group shadow-sm">
                <Select 
                  value={action.actionType}
                  onValueChange={val => {
                    const newActions = [...actions]
                    newActions[idx].actionType = val
                    setActions(newActions)
                  }}
                >
                  <SelectTrigger className="w-[200px] rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]">
                    <SelectValue placeholder="Chọn hành động...">
                      {action.actionType === 'pause_campaign' && 'Tắt chiến dịch'}
                      {action.actionType === 'enable_campaign' && 'Bật chiến dịch'}
                      {action.actionType === 'adjust_budget' && 'Điều chỉnh ngân sách'}
                      {action.actionType === 'send_telegram' && 'Gửi cảnh báo Telegram'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pause_campaign">Tắt chiến dịch</SelectItem>
                    <SelectItem value="enable_campaign">Bật chiến dịch</SelectItem>
                    <SelectItem value="adjust_budget">Điều chỉnh ngân sách</SelectItem>
                    <SelectItem value="send_telegram">Gửi cảnh báo Telegram</SelectItem>
                  </SelectContent>
                </Select>

                {action.actionType === 'adjust_budget' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-2)]">Thay đổi (%)</span>
                    <Input 
                      className="w-[100px] rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]" 
                      type="number" 
                      placeholder="VD: 20" 
                      value={action.actionValue || ""}
                      onChange={e => {
                        const newActions = [...actions]
                        newActions[idx].actionValue = e.target.value
                        setActions(newActions)
                      }}
                    />
                    <span className="text-xs text-[var(--text-3)]">(Số âm để giảm)</span>
                  </div>
                )}

                {action.actionType === 'send_telegram' && (
                  <div className="flex-1 min-w-[280px] space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-[var(--text-3)]">Kết nối nhận tin:</span>
                      <select
                        value={action.telegramConnectionId || ""}
                        onChange={e => {
                          const newActions = [...actions]
                          newActions[idx].telegramConnectionId = e.target.value
                          setActions(newActions)
                        }}
                        required
                        className="h-9 px-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] text-xs focus:outline-none text-[var(--text-1)]"
                      >
                        <option value="">-- Chọn kết nối Telegram --</option>
                        {telegramConnections.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-[var(--text-3)] block">Nội dung tin nhắn tùy biến (Trống = dùng mặc định):</span>
                      <textarea
                        rows={3}
                        className="w-full p-2 border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] text-sm bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none min-h-[80px]"
                        placeholder="Ví dụ: Tài khoản {ads_account_name} vừa pause chiến dịch {campaign_name}..."
                        value={action.alertMessage || ""}
                        onChange={e => {
                          const newActions = [...actions]
                          newActions[idx].alertMessage = e.target.value
                          setActions(newActions)
                        }}
                      />
                      {/* Variables Helper Tags */}
                      <div className="w-full flex flex-wrap gap-1 mt-1 text-[10px] text-[var(--text-3)] items-center">
                        <span className="font-bold">Biến số:</span>
                        {[
                          'ads_account_name', 'action', 'campaign_id', 
                          'campaign_name', 'reason', 'cost', 
                          'real_conversions', 'real_cpa', 'real_roas'
                        ].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              const newActions = [...actions]
                              newActions[idx].alertMessage = (newActions[idx].alertMessage || "") + `{${v}}`
                              setActions(newActions)
                            }}
                            className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-[calc(var(--radius)*0.4)] hover:bg-[var(--border)] transition-colors border border-[var(--border)]/40 font-mono"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {actions.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-[var(--bg-secondary)]"
                    onClick={() => {
                      const newActions = [...actions]
                      newActions.splice(idx, 1)
                      setActions(newActions)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                )}
              </div>
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-fit rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]"
              onClick={() => setActions([...actions, { actionType: 'send_telegram', alertMessage: '' }])}
            >
              <Plus className="w-4 h-4 mr-1" /> Thêm hành động khác
            </Button>
          </CardContent>
        </Card>

        {/* --- Lịch chạy & Kỷ luật --- */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--text-1)]">5. Lịch chạy & Kỷ luật</CardTitle>
            <CardDescription className="text-[var(--text-3)]">Quy định thời gian robot được phép hoạt động và giãn cách.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[var(--text-2)]">Khung giờ hoạt động</Label>
              <div className="flex items-center gap-2 text-[var(--text-2)]">
                <Input 
                  type="time" 
                  value={schedule.hoursStart} 
                  onChange={e => setSchedule({...schedule, hoursStart: e.target.value})}
                  className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]"
                />
                <span>đến</span>
                <Input 
                  type="time" 
                  value={schedule.hoursEnd}
                  onChange={e => setSchedule({...schedule, hoursEnd: e.target.value})}
                  className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-[var(--text-2)]">Giãn cách thực thi (Cooldown - Phút)</Label>
              <Input 
                type="number" 
                value={schedule.cooldownMinutes}
                onChange={e => setSchedule({...schedule, cooldownMinutes: Number(e.target.value)})}
                className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]"
              />
              <p className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" /> Tránh Rule chạy dồn dập quá gần nhau.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center space-x-2 mb-1">
                <Checkbox 
                  id="enableMaxExecutions" 
                  checked={enableMaxExecutions}
                  onCheckedChange={(checked) => setEnableMaxExecutions(!!checked)}
                />
                <Label htmlFor="enableMaxExecutions" className="cursor-pointer text-[var(--text-2)]">Giới hạn số lần chạy / ngày</Label>
              </div>
              {enableMaxExecutions && (
                <div className="pl-6 space-y-2">
                  <Input 
                    type="number" 
                    placeholder="VD: 1"
                    value={schedule.maxExecutionsPerDay}
                    onChange={e => setSchedule({...schedule, maxExecutionsPerDay: Number(e.target.value)})}
                    className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)]"
                  />
                  <p className="text-[10px] text-[var(--text-3)] italic">
                    Rule sẽ dừng hoạt động trong ngày sau khi đạt số lần này.
                  </p>
                </div>
              )}
            </div>
            
            <div className="sm:col-span-2">
              <Label className="mb-2 block text-[var(--text-2)]">Ngày trong tuần</Label>
              <div className="flex flex-wrap gap-2">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => {
                  const dayVal = idx + 1
                  const isSelected = schedule.days.includes(dayVal)
                  return (
                    <Button 
                      key={day}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-9 w-12 rounded-[calc(var(--radius)*0.8)] font-semibold transition-all border",
                        isSelected 
                          ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 border-transparent shadow-md scale-105" 
                          : "text-muted-foreground border-border hover:bg-secondary bg-transparent"
                      )}
                      onClick={() => {
                        const newDays = schedule.days.includes(dayVal)
                          ? schedule.days.filter(d => d !== dayVal)
                          : [...schedule.days, dayVal]
                        setSchedule({...schedule, days: newDays})
                      }}
                    >
                      {day}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Lớp bảo vệ (Guardrails) --- */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--text-1)]">6. Lớp bảo vệ (Guardrails)</CardTitle>
            <CardDescription className="text-[var(--text-3)]">Cấu hình bộ lọc an toàn để chủ động bảo vệ tài khoản khỏi lỗi kỹ thuật.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-start space-x-3 p-2 hover:bg-[var(--bg-secondary)]/30 rounded-[calc(var(--radius)*0.6)]">
              <Checkbox 
                id="learningProtection" 
                checked={guardrailLearningProtection}
                onCheckedChange={(checked) => setGuardrailLearningProtection(!!checked)}
                className="mt-0.5 border-[var(--border)]"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="learningProtection" className="cursor-pointer font-semibold text-sm text-[var(--text-2)]">Bảo vệ giai đoạn máy học (Learning Phase Protection)</Label>
                <p className="text-xs text-[var(--text-3)]">Tự động bỏ qua chiến dịch nếu đang trong giai đoạn máy học (LEARNING) từ Google Ads để tránh làm nhiễu thuật toán.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-2 hover:bg-[var(--bg-secondary)]/30 rounded-[calc(var(--radius)*0.6)]">
              <Checkbox 
                id="guardrail3xKill" 
                checked={guardrail3xKill}
                onCheckedChange={(checked) => setGuardrail3xKill(!!checked)}
                className="mt-0.5 border-[var(--border)]"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="guardrail3xKill" className="cursor-pointer font-semibold text-sm text-[var(--text-2)]">Cầu chì an toàn 3x CPA (3x Kill Rule)</Label>
                <p className="text-xs text-[var(--text-3)]">Tự động tạm dừng chiến dịch quảng cáo nếu chi phí CPA thực tế hôm nay vượt quá 3 lần CPA mục tiêu.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-2 hover:bg-[var(--bg-secondary)]/30 rounded-[calc(var(--radius)*0.6)]">
              <Checkbox 
                id="guardrailBudgetSuffocation" 
                checked={guardrailBudgetSuffocation}
                onCheckedChange={(checked) => setGuardrailBudgetSuffocation(!!checked)}
                className="mt-0.5 border-[var(--border)]"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="guardrailBudgetSuffocation" className="cursor-pointer font-semibold text-sm text-[var(--text-2)]">Chống bóp nghẹt ngân sách (Budget Suffocation Warning)</Label>
                <p className="text-xs text-[var(--text-3)]">Giới hạn không cho phép tự động giảm ngân sách ngày xuống dưới ngưỡng 5x CPA mục tiêu.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Submit --- */}
        <div className="flex items-center justify-end gap-4 mt-4">
          <Button variant="outline" onClick={() => router.back()} className="rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]">Hủy bỏ</Button>
          <Button 
            size="lg" 
            className="px-10 gap-2 shadow-md hover:shadow-lg rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : <><Save className="w-4 h-4" /> Lưu thay đổi</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
