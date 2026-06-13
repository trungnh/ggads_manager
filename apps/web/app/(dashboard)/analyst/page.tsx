'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Loader2, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Printer, 
  Settings, 
  Clock, 
  Sparkles, 
  Calendar,
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react'

interface CheckItem {
  id: string
  name: string
  status: 'passed' | 'warning' | 'failed' | 'info'
  message: string
}

interface ActionPlanItem {
  severity: 'critical' | 'warning' | 'info'
  task: string
  recommendation: string
}

interface AuditLog {
  id: string
  score: number
  triggerType: 'MANUAL' | 'AUTO'
  createdAt: string
  resultJson: {
    checks: CheckItem[]
    critique: string
    actionPlan: ActionPlanItem[]
  }
}

interface AdsAccount {
  id: string
  name: string
  customerId: string
  healthAuditAutoEnabled: boolean
  healthAuditCronFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  healthAuditLastRun: string | null
}

const LOADING_STEPS = [
  "Đang truy xuất cấu hình tài khoản...",
  "Đang tải dữ liệu snapshots chiến dịch hôm nay...",
  "Đang đối chiếu mức độ an toàn ngân sách (Budget Suffocation)...",
  "Đang quét vị trí hiển thị rác & chi phí lãng phí...",
  "Đang gửi dữ liệu lâm sàng cho Gemini Flash AI chẩn đoán...",
  "Đang phân tích đề xuất tối ưu & lập hồ sơ bệnh án..."
]

export default function AnalystPage() {
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [latestAudit, setLatestAudit] = useState<AuditLog | null>(null)
  
  // States
  const [loading, setLoading] = useState(false)
  const [loadingStepIdx, setLoadingStepIdx] = useState(0)
  const [fetchingAudit, setFetchingAudit] = useState(false)
  
  // Settings Panel
  const [showSettings, setShowSettings] = useState(false)
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY')
  const [savingSettings, setSavingSettings] = useState(false)

  // 1. Fetch accessible accounts on load
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/accounts')
        if (!res.ok) throw new Error('Failed to fetch accounts')
        const data = await res.json()
        const accounts = data.accounts || []
        setAdsAccounts(accounts)
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id)
        }
      } catch (err) {
        console.error("[FETCH_ACCOUNTS_ERROR]", err)
      }
    }
    fetchAccounts()
  }, [])

  // 2. Fetch latest audit log when selected account changes
  useEffect(() => {
    if (!selectedAccountId) return
    
    // Set settings state from current account object
    const currentAcc = adsAccounts.find(a => a.id === selectedAccountId)
    if (currentAcc) {
      setAutoEnabled(currentAcc.healthAuditAutoEnabled)
      setFrequency(currentAcc.healthAuditCronFrequency || 'WEEKLY')
    }

    const fetchLatestAudit = async () => {
      setFetchingAudit(true)
      try {
        const res = await fetch(`/api/analyst/audit?adsAccountId=${selectedAccountId}`)
        if (!res.ok) throw new Error('Failed to fetch audit')
        const data = await res.json()
        setLatestAudit(data.audit)
      } catch (err) {
        console.error("[FETCH_AUDIT_ERROR]", err)
        setLatestAudit(null)
      } finally {
        setFetchingAudit(false)
      }
    }
    fetchLatestAudit()
  }, [selectedAccountId, adsAccounts])

  // 3. Trigger manual audit
  const handleRunAudit = async () => {
    if (!selectedAccountId) return
    setLoading(true)
    setLoadingStepIdx(0)

    // Simulate clinical steps progress loading
    const interval = setInterval(() => {
      setLoadingStepIdx(prev => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 600)

    try {
      const res = await fetch('/api/analyst/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsAccountId: selectedAccountId })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to run audit')
      }

      const data = await res.json()
      setLatestAudit(data.audit)
    } catch (err: any) {
      alert(`Lỗi chạy chẩn đoán: ${err.message}`)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  // 4. Save cron settings
  const handleSaveSettings = async () => {
    if (!selectedAccountId) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/analyst/audit/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adsAccountId: selectedAccountId,
          healthAuditAutoEnabled: autoEnabled,
          healthAuditCronFrequency: frequency
        })
      })

      if (!res.ok) throw new Error('Failed to save settings')

      // Update local state
      setAdsAccounts(prev => prev.map(a => {
        if (a.id === selectedAccountId) {
          return {
            ...a,
            healthAuditAutoEnabled: autoEnabled,
            healthAuditCronFrequency: frequency
          }
        }
        return a
      }))
      
      setShowSettings(false)
    } catch (err: any) {
      alert(`Không thể lưu cấu hình: ${err.message}`)
    } finally {
      setSavingSettings(false)
    }
  }

  // Get active account display name
  const activeAccount = adsAccounts.find(a => a.id === selectedAccountId)

  // Status mapping colors & icons
  const getStatusConfig = (status: CheckItem['status']) => {
    switch(status) {
      case 'passed':
        return {
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/55',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          label: 'Đạt'
        }
      case 'warning':
        return {
          color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/55',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          label: 'Cảnh báo'
        }
      case 'failed':
        return {
          color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/55',
          icon: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          label: 'Không Đạt'
        }
      default:
        return {
          color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/55',
          icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
          label: 'Gợi ý'
        }
    }
  }

  // Health Score color class
  const getScoreColor = (score: number) => {
    if (score >= 80) return { stroke: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Khỏe mạnh (Ổn định)' }
    if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Trung bình (Cần theo dõi)' }
    return { stroke: '#ef4444', text: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Nguy cấp (Cần xử lý gấp)' }
  }

  const scoreInfo = latestAudit ? getScoreColor(latestAudit.score) : { stroke: '#71717a', text: 'text-zinc-500', bg: 'bg-zinc-500/10', label: 'Chưa có thông tin' }

  // Circular progress stroke offset calculation
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = latestAudit 
    ? circumference - (latestAudit.score / 100) * circumference 
    : circumference

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* --- HEADER BLOCK --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-[var(--radius)] border border-border shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[calc(var(--radius)*0.8)] bg-zinc-100 dark:bg-zinc-800/50 border border-border flex items-center justify-center text-primary">
            <Activity className="w-6 h-6 animate-pulse text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Creative ICU & Ad Diagnostics</h1>
            <p className="text-xs text-muted-foreground mt-1">Chẩn đoán lỗi kỹ thuật tài khoản Google Ads bằng AI & Đề xuất cấp cứu.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Account Selector */}
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[260px] rounded-[calc(var(--radius)*0.8)] border-border bg-card text-foreground font-medium text-xs h-9">
              <SelectValue placeholder="Chọn tài khoản Ads...">
                {activeAccount
                  ? `${activeAccount.name || 'Không tên'} (${activeAccount.customerId})`
                  : (selectedAccountId ? 'Đang tải tài khoản...' : 'Chọn tài khoản Ads...')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {adsAccounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                  {acc.name} ({acc.customerId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Settings Trigger */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
            className={cn("h-9 font-bold text-xs gap-1.5", showSettings && "bg-secondary text-foreground")}
          >
            <Settings className="w-4 h-4" /> Cấu hình
          </Button>

          {/* Print PDF */}
          {latestAudit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.print()}
              className="h-9 font-bold text-xs gap-1.5 border-border"
            >
              <Printer className="w-4 h-4" /> Tải báo cáo PDF
            </Button>
          )}

          {/* Diagnostics Trigger Button */}
          <Button 
            onClick={handleRunAudit}
            disabled={loading || !selectedAccountId}
            className="h-9 gap-2 font-bold text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 border-0 shadow-sm transition-all hover:scale-[1.02] cursor-pointer rounded-[calc(var(--radius)*0.8)] min-w-[150px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang chẩn đoán...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Chẩn đoán tài khoản
              </>
            )}
          </Button>
        </div>
      </div>

      {/* --- NOTICE BANNER FOR MINIMUM DATA REQUIREMENT --- */}
      <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-[var(--radius)] text-xs text-amber-800 dark:text-amber-300 no-print">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">Lưu ý về dữ liệu tối thiểu:</p>
          <p className="leading-relaxed">
            Để việc phân tích và chấm điểm sức khỏe tài khoản được chính xác nhất, hệ thống yêu cầu dữ liệu đồng bộ liên tục <strong>tối thiểu trong 7 ngày</strong> gần nhất. Nếu dữ liệu của bạn bị gián đoạn hoặc thiếu, kết quả chẩn đoán có thể hiển thị điểm số tối ưu ảo (Ví dụ: Đạt tuyệt đối do chưa có chi tiêu thực tế được ghi nhận).
          </p>
        </div>
      </div>

      {/* --- REPORT TITLE FOR PRINT ONLY --- */}
      {latestAudit && activeAccount && (
        <div className="hidden print:block border-b border-zinc-300 pb-4 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black text-black">BÁO CÁO CHẨN ĐOÁN SỨC KHỎE GOOGLE ADS</h1>
              <p className="text-sm text-zinc-600 mt-1">Hệ thống phân tích & Tự động hóa Google Ads Manager</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-600">Ngày lập báo cáo: {new Date(latestAudit.createdAt).toLocaleDateString('vi-VN')}</p>
              <p className="text-xs font-bold text-black mt-1">Tài khoản: {activeAccount.name} ({activeAccount.customerId})</p>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS DRAWER / COLLAPSIBLE PANEL --- */}
      {showSettings && (
        <Card className="bg-card border border-border rounded-[var(--radius)] shadow-md p-6 max-w-xl mr-auto animate-in slide-in-from-top duration-200 no-print">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Lịch trình chẩn đoán tự động (Auto-Audit Cron)
            </CardTitle>
            <CardDescription className="text-xs">
              Bật chế độ tự động quét chẩn đoán tài khoản định kỳ và gửi báo cáo về hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-md border border-border">
              <Checkbox 
                id="autoEnabled" 
                checked={autoEnabled}
                onCheckedChange={(checked) => setAutoEnabled(!!checked)}
                className="mt-0.5"
              />
              <div className="grid gap-1 leading-none">
                <label htmlFor="autoEnabled" className="cursor-pointer font-bold text-xs text-foreground">Kích hoạt chẩn đoán tự động</label>
                <p className="text-[10px] text-muted-foreground">Tự động chạy chẩn đoán định kỳ theo lịch trình bên dưới.</p>
              </div>
            </div>

            {autoEnabled && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-foreground">Tần suất quét tự động</label>
                <div className="flex gap-2">
                  {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(freq => (
                    <Button
                      key={freq}
                      type="button"
                      variant={frequency === freq ? 'default' : 'outline'}
                      onClick={() => setFrequency(freq)}
                      className="flex-1 text-xs font-semibold h-8"
                    >
                      {freq === 'DAILY' ? 'Hàng ngày' : freq === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="text-xs h-8">Hủy</Button>
              <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings} className="text-xs font-bold h-8 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                {savingSettings ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- RUNNING DIAGNOSTICS LOADING BOARD --- */}
      {loading && (
        <Card className="border border-border rounded-[var(--radius)] bg-card p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm no-print">
          <div className="relative mb-6">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
            <Activity className="w-6 h-6 text-emerald-600 absolute top-3 left-3 animate-pulse" />
          </div>
          <h3 className="text-md font-bold text-foreground animate-pulse mb-3">Đang chạy chẩn đoán tài khoản Ads...</h3>
          <div className="bg-secondary/40 px-4 py-2 rounded-md max-w-md border border-border">
            <p className="text-xs font-mono text-muted-foreground transition-all duration-300">
              {LOADING_STEPS[loadingStepIdx]}
            </p>
          </div>
          <div className="w-48 bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-6">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((loadingStepIdx + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </Card>
      )}

      {/* --- NO AUDIT LOGS PLACEHOLDER --- */}
      {!loading && !fetchingAudit && !latestAudit && (
        <Card className="border-dashed border-border rounded-[var(--radius)] bg-card py-20 flex flex-col items-center justify-center text-center max-w-7xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-5 text-zinc-400">
            <FileText className="w-8 h-8" />
          </div>
          <CardTitle className="text-base mb-2 text-foreground font-bold">Chưa có kết quả chẩn đoán nào</CardTitle>
          <CardDescription className="max-w-xs mb-6 text-xs text-muted-foreground leading-relaxed">
            Hệ thống chưa tìm thấy hồ sơ chẩn đoán sức khỏe nào cho tài khoản này. Nhấn nút dưới đây để chạy kiểm toán lâm sàng.
          </CardDescription>
          <Button 
            onClick={handleRunAudit}
            disabled={!selectedAccountId}
            className="rounded-[calc(var(--radius)*0.8)] text-xs font-bold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 border-0 shadow-sm transition-all cursor-pointer h-9 px-6"
          >
            Chạy chẩn đoán ngay
          </Button>
        </Card>
      )}

      {/* --- FETCHING LOADER --- */}
      {!loading && fetchingAudit && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 no-print">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Đang truy xuất hồ sơ chẩn đoán...</p>
        </div>
      )}

      {/* --- MAIN REPORTS DASHBOARD VIEW --- */}
      {!loading && !fetchingAudit && latestAudit && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Health Score circular gauge & Summary (1/3 width) */}
          <div className="space-y-6 print-card">
            
            {/* Score Ring Widget */}
            <Card className="bg-card border border-border rounded-[var(--radius)] shadow-sm print-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground">Điểm số Sức khỏe Ads</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Phân tích dựa trên các quy tắc bảo vệ ngân sách, thầu và CPA mục tiêu.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
                <div className="relative flex items-center justify-center w-36 h-36">
                  {/* Outer circle track */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      className="stroke-zinc-100 dark:stroke-zinc-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      stroke={scoreInfo.stroke}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  {/* Inside text */}
                  <div className="absolute text-center">
                    <span className={cn("text-3xl font-black tracking-tight", scoreInfo.text)}>
                      {latestAudit.score}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground block">/100</span>
                  </div>
                </div>
                
                {/* Score Status Badge */}
                <div className="mt-5 text-center">
                  <span className={cn("text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-transparent", 
                    latestAudit.score >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200" :
                    latestAudit.score >= 50 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200" :
                    "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200"
                  )}>
                    {scoreInfo.label}
                  </span>
                  
                  <p className="text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Chạy gần nhất: {new Date(latestAudit.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Diagnostics Summary Box */}
            <Card className="bg-card border border-border rounded-[var(--radius)] shadow-sm relative overflow-hidden print-card">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-amber-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Bác sĩ AI chẩn đoán
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Nhận xét lâm sàng tổng hợp bởi Gemini API.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs leading-relaxed text-foreground pb-6 whitespace-pre-line italic">
                &ldquo;{latestAudit.resultJson.critique}&rdquo;
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Clinical Checklist & AI Action Plan (2/3 width) */}
          <div className="md:col-span-2 space-y-6 print-card">
            
            {/* 1. Clinical Checks Checklist */}
            <Card className="bg-card border border-border rounded-[var(--radius)] shadow-sm print-card">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground">1. Kết quả kiểm tra lâm sàng</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Các tiêu chuẩn kỹ thuật tự động kiểm tra định kỳ trong tài khoản.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {latestAudit.resultJson.checks.map((check) => {
                  const config = getStatusConfig(check.status)
                  return (
                    <div key={check.id} className="p-4 flex items-start gap-3.5 hover:bg-secondary/10 transition-colors">
                      <div className="mt-0.5 shrink-0">{config.icon}</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground">{check.name}</h4>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none uppercase tracking-wide", config.color)}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {check.message}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* 2. AI Action Plan / Priorities (Triage Board) */}
            <Card className="bg-card border border-border rounded-[var(--radius)] shadow-sm print-card">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  2. Đề xuất phác đồ điều trị (Action Plan)
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Các việc nên làm ngay được tối ưu hóa theo thứ tự ưu tiên cho nhà quảng cáo in-house.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {latestAudit.resultJson.actionPlan.map((plan, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-3 rounded-md border text-xs flex flex-col gap-1.5 shadow-sm",
                      plan.severity === 'critical' ? 'bg-rose-50/30 dark:bg-rose-950/5 border-l-4 border-l-rose-500 border-r-border border-y-border' :
                      plan.severity === 'warning' ? 'bg-amber-50/30 dark:bg-amber-950/5 border-l-4 border-l-amber-500 border-r-border border-y-border' :
                      'bg-blue-50/30 dark:bg-blue-950/5 border-l-4 border-l-blue-500 border-r-border border-y-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-foreground">{plan.task}</span>
                      <span className={cn(
                        "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase",
                        plan.severity === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                        plan.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                      )}>
                        {plan.severity === 'critical' ? 'Khẩn cấp' : plan.severity === 'warning' ? 'Cần làm' : 'Tham khảo'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {plan.recommendation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      )}

    </div>
  )
}
