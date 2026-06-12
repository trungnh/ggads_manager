'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, Calendar, RefreshCw, ChevronDown, 
  Search, Filter, BarChart2, Zap, ZapOff, 
  RotateCcw, ExternalLink, Save, X, Edit2,
  TrendingUp, Activity, DollarSign, Target, MousePointer2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CampaignChartModal from './CampaignChartModal'
import { cn } from "@/lib/utils"

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: string;
  cost: string;
  clicks: number;
  conversions: string;
  conversionValue: string;
  ctr: number;
  avgCpc: string;
  biddingStrategyType: string;
  targetCpa?: string;
  targetRoas?: number;
  realConversions: number;
  realConversionValue: string;
  cfCost: string;
  isExcluded?: boolean;
  cflcOverride?: string;
  realPending?: number;
  realSuccess?: number;
  realSuccessValue?: string;
}

interface CampaignListProps {
  account: { id: string, name: string, customerId: string, showOfflineOrders?: boolean };
  accounts: { id: string, name: string | null, customerId: string }[];
  initialCampaigns: Campaign[];
  startDate: string;
  endDate: string;
  showPausedByDefault?: boolean;
}

export default function CampaignListClient({ account, accounts, initialCampaigns, startDate, endDate, showPausedByDefault }: CampaignListProps) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [search, setSearch] = useState('')
  const [showEnabledOnly, setShowEnabledOnly] = useState(!showPausedByDefault)
  const [showSpendOnly, setShowSpendOnly] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Modal state
  const [selectedChartCampaign, setSelectedChartCampaign] = useState<{id: string, name: string} | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showOfflineOrders, setShowOfflineOrders] = useState(account.showOfflineOrders || false)

  // Inline editing states
  const [editingBudget, setEditingBudget] = useState<{ id: string, value: string } | null>(null)
  const [editingCpa, setEditingCpa] = useState<{ id: string, value: string } | null>(null)
  const [editingCflc, setEditingCflc] = useState<{ id: string, value: string } | null>(null)

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = showEnabledOnly ? c.status === 'ENABLED' : true;
      const matchSpend = showSpendOnly ? parseInt(c.cost) > 0 : true;
      return matchSearch && matchStatus && matchSpend;
    })
  }, [campaigns, search, showEnabledOnly, showSpendOnly])

  const totals = useMemo(() => {
    return filteredCampaigns.reduce((acc, c) => ({
      cost: acc.cost + (parseInt(c.cost) / 1000000),
      budget: acc.budget + (parseInt(c.budget) / 1000000),
      conversions: acc.conversions + parseFloat(c.conversions),
      realConversions: acc.realConversions + (c.realConversions || 0),
      clicks: acc.clicks + c.clicks,
      value: acc.value + (parseFloat(c.conversionValue) / 1000000)
    }), { cost: 0, budget: 0, conversions: 0, realConversions: 0, clicks: 0, value: 0 })
  }, [filteredCampaigns])

  const handleUpdate = async (campaignId: string, type: string, value: any) => {
    setUpdatingId(`${campaignId}-${type}`)
    const campaign = campaigns.find(c => c.id === campaignId)
    try {
      const res = await fetch('/api/campaigns/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: account.customerId, 
          campaignId, 
          type, 
          value,
          ...(type === 'cflc_override' && campaign ? {
            currentCost: campaign.cost,
            currentConversions: campaign.conversions
          } : {})
        })
      })
      if (res.ok) {
        // Refresh page to get latest data from DB
        router.refresh()
        // Also update local state for immediate feedback
        setCampaigns(prev => prev.map(c => {
          if (c.id === campaignId) {
            if (type === 'is_excluded') return { ...c, isExcluded: value }
            if (type === 'cflc_reset') return { ...c, cfCost: '0' }
            if (type === 'cflc_override') return { ...c, cfCost: value.toString() }
            if (type === 'budget') return { ...c, budget: value.toString() }
            if (type === 'target_cpa') return { ...c, targetCpa: value.toString() }
            return c
          }
          return c
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
      setEditingBudget(null)
      setEditingCpa(null)
      setEditingCflc(null)
    }
  }

  const handleSync = async () => {
    setUpdatingId('manual-sync')
    try {
      const res = await fetch('/api/accounts/sync-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: account.customerId, startDate, endDate })
      })
      if (res.ok) {
        router.refresh();
        setTimeout(() => window.location.reload(), 500); // Force full reload for immediate feedback
      } else {
        const err = await res.json()
        alert(err.error || "Lỗi khi đồng bộ dữ liệu")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleToggleOffline = async () => {
    const newValue = !showOfflineOrders
    setShowOfflineOrders(newValue)
    try {
      await fetch(`/api/accounts/${account.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_show_offline', showOffline: newValue })
      })
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const formatMoney = (micros: string | number) => {
    const val = typeof micros === 'string' ? parseInt(micros) / 1000000 : micros
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  return (
    <div className="p-0 bg-transparent min-h-screen text-foreground space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-[var(--radius)] border border-border shadow-sm">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Chiến dịch</h1>
              
              {/* Account Dropdown Selector */}
              <div className="relative flex items-center bg-background border border-border rounded-[calc(var(--radius)*0.6)] px-3 py-1 shadow-sm text-xs font-semibold hover:border-primary/30 transition duration-150">
                <select
                  value={account.customerId}
                  onChange={(e) => {
                    const custId = e.target.value
                    if (custId) {
                      router.push(`/campaigns/${custId}?startDate=${startDate}&endDate=${endDate}`)
                    }
                  }}
                  className="bg-transparent border-none text-foreground focus:outline-none cursor-pointer pr-4 font-bold appearance-none select-none max-w-[240px] truncate"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.customerId} className="bg-card text-foreground">
                      {acc.name || 'Tài khoản không tên'} ({acc.customerId})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 ml-1 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            
            <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground text-[10px] font-bold w-fit">
              ID: {account.customerId}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Quản lý hiệu suất và tối ưu hóa ngân sách theo thời gian thực.</p>
        </div>
        <div className="flex gap-2.5">
          <Button 
            variant="outline" 
            size="sm"
            className="cursor-pointer gap-1.5 font-bold text-xs" 
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings size={13} />
            Cấu hình
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="cursor-pointer gap-1.5 font-bold text-xs"
          >
            <Calendar size={13} />
            Lịch trình chạy
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Tổng chi tiêu', value: formatMoney(totals.cost), icon: DollarSign, colorClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
          { label: 'Tổng chuyển đổi', value: totals.realConversions.toLocaleString() + ' đơn', icon: Target, colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
          { label: 'CPA bình quân', value: (totals.realConversions > 0 ? formatMoney(totals.cost / totals.realConversions) : '—'), icon: Activity, colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
          { label: 'ROAS bình quân', value: (totals.cost > 0 ? (totals.value / totals.cost).toFixed(2) + '×' : '0.00×'), icon: TrendingUp, colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-card text-card-foreground p-5 rounded-[var(--radius)] border border-border shadow-sm flex items-center gap-4 hover:shadow-md transition duration-200">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.colorClass)}>
              <stat.icon size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">{stat.label}</div>
              <div className="text-base font-extrabold text-foreground tracking-tight leading-none mt-1.5">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-[var(--radius)] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Tìm chiến dịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-60 pl-9 pr-3 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary text-xs font-semibold outline-none transition duration-150"
            />
          </div>
          
          {/* Date Picker Range */}
          <div className="flex items-center gap-2 bg-background border border-border px-3.5 py-1.5 rounded-md text-xs text-muted-foreground font-semibold shadow-sm">
            <Calendar size={13} className="text-muted-foreground" />
            <span>Từ</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => router.push(`?startDate=${e.target.value}&endDate=${endDate}`)}
              className="bg-transparent border-0 text-foreground outline-none text-xs cursor-pointer font-bold"
            />
            <span className="text-border">|</span>
            <span>Đến</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => router.push(`?startDate=${startDate}&endDate=${e.target.value}`)}
              className="bg-transparent border-0 text-foreground outline-none text-xs cursor-pointer font-bold"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground pl-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground transition duration-150">
              <input type="checkbox" checked={showEnabledOnly} onChange={e => setShowEnabledOnly(e.target.checked)} className="rounded border-border text-primary bg-background focus:ring-0 focus:ring-offset-0" /> Bật
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground transition duration-150">
              <input type="checkbox" checked={showSpendOnly} onChange={e => setShowSpendOnly(e.target.checked)} className="rounded border-border text-primary bg-background focus:ring-0 focus:ring-offset-0" /> Chi tiêu &gt; 0
            </label>
          </div>
        </div>
        <div>
          <Button 
            onClick={handleSync}
            disabled={updatingId === 'manual-sync'}
            className="h-9 text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition duration-150"
          >
            <RefreshCw size={12} className={updatingId === 'manual-sync' ? 'animate-spin' : ''} />
            {updatingId === 'manual-sync' ? 'ĐANG ĐỒNG BỘ...' : 'ĐỒNG BỘ DATA'}
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border shadow-sm rounded-[var(--radius)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground">
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-16">ID</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-left px-3 w-64">Tên chiến dịch</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-32">Ngân sách</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-28">Trạng thái</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-28">Chi tiêu</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-20">ROAS</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-28">CPA</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-16">Đơn</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-20">CTR</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-20">Clicks</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-20">CPC</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-28">Doanh thu</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-24">CFLC</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-36">Chiến lược</th>
                <th className="font-bold text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCampaigns.map(c => {
                const cost = parseInt(c.cost) / 1000000
                const realSuccess = c.realSuccess || 0
                const realTotal = c.realConversions || 0
                const successValue = parseInt(c.realSuccessValue || '0') / 1000000
                
                const roas = cost > 0 ? (successValue / cost) : 0
                const cpa = realTotal > 0 ? (cost / realTotal) : 0
                const cpc = c.clicks > 0 ? (cost / c.clicks) : 0
                const ctr = c.ctr / 100 // stored as BPS, so /100 = %

                return (
                  <tr key={c.id} className="hover:bg-muted/10 transition duration-150">
                    <td className="p-3 text-center align-middle text-muted-foreground font-mono text-[10px]">{c.id}</td>
                    <td className="p-3 text-left align-middle font-bold text-foreground">
                      <div className="line-clamp-2 max-w-[240px] leading-relaxed">{c.name}</div>
                    </td>
                    
                    {/* Editable Budget */}
                    <td className="p-3 text-center align-middle">
                      {editingBudget?.id === c.id ? (
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          <input 
                            autoFocus
                            type="number"
                            value={editingBudget.value}
                            onChange={e => setEditingBudget({ id: c.id, value: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id, 'budget', parseInt(editingBudget.value) * 1000000)}
                            onBlur={() => setTimeout(() => setEditingBudget(null), 150)}
                            className="w-24 h-7 text-center rounded border border-primary bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(c.id, 'budget', parseInt(editingBudget.value) * 1000000)} className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition duration-100"><Save size={11} /></button>
                            <button onClick={() => setEditingBudget(null)} className="w-5 h-5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center hover:bg-rose-500/30 transition duration-100"><X size={11} /></button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingBudget({ id: c.id, value: (parseInt(c.budget) / 1000000).toString() })}
                          className="cursor-pointer flex items-center gap-1.5 justify-center hover:text-primary transition duration-150 font-medium text-foreground"
                        >
                          {formatMoney(c.budget)}
                          <Edit2 size={10} className="text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center align-middle">
                      {c.id === 'offline' ? (
                        <Badge className="bg-amber-500 hover:bg-amber-500 border-none text-white text-[9px] font-bold">OFFLINE</Badge>
                      ) : (
                        <Badge variant="outline" className={cn(
                          "border-transparent text-[9px] font-bold px-2 py-0.5",
                          c.status === 'ENABLED' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-500'
                        )}>
                          {c.status === 'ENABLED' ? 'Đang chạy' : 'Tạm dừng'}
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 text-right align-middle font-mono font-medium text-foreground">{formatMoney(c.cost)}</td>
                    <td className="p-3 text-center align-middle font-bold">
                      <span className={cn(roas < 1.5 ? 'text-rose-500' : 'text-emerald-500')}>{roas.toFixed(2)}</span>
                    </td>
                    <td className="p-3 text-right align-middle font-mono font-semibold text-sky-600 dark:text-sky-400">{cpa > 0 ? Math.round(cpa).toLocaleString() + ' ₫' : '—'}</td>
                    <td className="p-3 text-center align-middle font-extrabold text-foreground">{realTotal}</td>
                    <td className="p-3 text-center align-middle text-muted-foreground font-mono">{ctr.toFixed(2)}%</td>
                    <td className="p-3 text-center align-middle text-muted-foreground font-mono">{c.clicks.toLocaleString()}</td>
                    <td className="p-3 text-right align-middle text-muted-foreground font-mono">{Math.round(cpc).toLocaleString()} ₫</td>
                    <td className="p-3 text-right align-middle font-mono text-foreground font-semibold">{Math.round(successValue).toLocaleString()} ₫</td>
                    
                    {/* CFLC Column */}
                    <td className="p-3 text-center align-middle">
                      {c.id === 'offline' ? '—' : editingCflc?.id === c.id ? (
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          <input 
                            autoFocus
                            type="number"
                            value={editingCflc.value}
                            onChange={e => setEditingCflc({ id: c.id, value: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id, 'cflc_override', parseInt(editingCflc.value) * 1000000)}
                            onBlur={() => setTimeout(() => setEditingCflc(null), 150)}
                            className="w-24 h-7 text-center rounded border border-primary bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(c.id, 'cflc_override', parseInt(editingCflc.value) * 1000000)} className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition duration-100"><Save size={11} /></button>
                            <button onClick={() => setEditingCflc(null)} className="w-5 h-5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center hover:bg-rose-500/30 transition duration-100"><X size={11} /></button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingCflc({ id: c.id, value: (parseInt(c.cfCost || '0') / 1000000).toString() })} 
                          className="cursor-pointer font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 justify-center transition duration-150"
                        >
                          {formatMoney(c.cfCost)}
                        </div>
                      )}
                    </td>

                    {/* Editable CPA / Bidding Strategy */}
                    <td className="p-3 text-center align-middle">
                      {c.id === 'offline' ? '—' : editingCpa?.id === c.id ? (
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          <input 
                            autoFocus
                            type="number"
                            value={editingCpa.value}
                            onChange={e => setEditingCpa({ id: c.id, value: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id, 'target_cpa', parseInt(editingCpa.value) * 1000000)}
                            onBlur={() => setTimeout(() => setEditingCpa(null), 150)}
                            className="w-24 h-7 text-center rounded border border-primary bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(c.id, 'target_cpa', parseInt(editingCpa.value) * 1000000)} className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition duration-100"><Save size={11} /></button>
                            <button onClick={() => setEditingCpa(null)} className="w-5 h-5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center hover:bg-rose-500/30 transition duration-100"><X size={11} /></button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingCpa({ id: c.id, value: (parseInt(c.targetCpa || '0') / 1000000).toString() })} 
                          className="cursor-pointer space-y-0.5 hover:text-primary transition duration-150"
                        >
                          <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">{c.biddingStrategyType.replace(/_/g, ' ')}:</div>
                          <div className="fontWeight-bold font-semibold text-foreground">{c.targetCpa ? formatMoney(c.targetCpa) : (c.targetRoas ? (c.targetRoas / 100).toFixed(0) + '%' : 'N/A')}</div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center align-middle">
                      {c.id === 'offline' ? (
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedChartCampaign({ id: c.id, name: c.name })}
                            className="h-7 text-[10px] gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-bold hover:bg-blue-500/20 cursor-pointer"
                          >
                            <BarChart2 size={11} /> CHART
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdate(c.id, 'status', c.status === 'ENABLED' ? 'PAUSED' : 'ENABLED')}
                            className={cn(
                              "h-7 text-[10px] w-12 border-none font-bold cursor-pointer transition",
                              c.status === 'ENABLED' 
                                ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                            )}
                          >
                            {c.status === 'ENABLED' ? 'TẮT' : 'BẬT'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdate(c.id, 'is_excluded', !c.isExcluded)}
                            className={cn(
                              "h-7 text-[10px] gap-1 border-none font-bold cursor-pointer transition",
                              c.isExcluded 
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' 
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {c.isExcluded ? <ZapOff size={11} /> : <Zap size={11} />}
                            {c.isExcluded ? 'BỎ AUTO' : 'AUTO'}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedChartCampaign({ id: c.id, name: c.name })}
                            className="h-7 text-[10px] gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-bold hover:bg-blue-500/20 cursor-pointer"
                          >
                            <BarChart2 size={11} /> CHART
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-bold border-t border-border/80">
                <td colSpan={2} className="p-4 pl-5 text-left align-middle text-sm">TỔNG CỘNG</td>
                <td className="p-4 text-center align-middle font-mono text-sm">{formatMoney(totals.budget)}</td>
                <td className="p-4 text-center align-middle">-</td>
                <td className="p-4 text-right align-middle font-mono text-sm">{formatMoney(totals.cost)}</td>
                <td className="p-4 text-center align-middle text-sm">{(totals.cost > 0 ? totals.value / totals.cost : 0).toFixed(2)}</td>
                <td className="p-4 text-right align-middle font-mono text-sm">{formatMoney(totals.conversions > 0 ? totals.cost / totals.conversions : 0)}</td>
                <td className="p-4 text-center align-middle font-mono text-sm">{totals.conversions.toFixed(1)}</td>
                <td className="p-4 text-center align-middle">-</td>
                <td className="p-4 text-center align-middle font-mono text-sm">{totals.clicks.toLocaleString()}</td>
                <td className="p-4 text-center align-middle">-</td>
                <td className="p-4 text-right align-middle font-mono text-sm">{formatMoney(totals.value)}</td>
                <td className="p-4 text-center align-middle">-</td>
                <td className="p-4 text-center align-middle">-</td>
                <td className="p-4 text-center align-middle">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Ads Account Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md border border-border rounded-xl shadow-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-foreground m-0">Cấu hình tài khoản</h2>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="bg-transparent border-0 cursor-pointer text-muted-foreground hover:text-foreground transition duration-150 p-1"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-start bg-muted/30 border border-border p-4 rounded-lg">
                <div className="space-y-1 pr-4">
                  <div className="text-xs font-bold text-foreground">Hiển thị các đơn hàng OFFLINE</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">Bao gồm các đơn không có campaign_id từ Google Ads vào một hàng riêng</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={showOfflineOrders} 
                  onChange={handleToggleOffline} 
                  className="rounded border-border text-primary bg-background focus:ring-0 cursor-pointer w-5 h-5 mt-0.5" 
                />
              </div>

              <div className="text-[10px] text-muted-foreground font-medium italic">
                * Sau khi thay đổi, hãy nhấn ĐỒNG BỘ DATA để quét lại dữ liệu.
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={() => setShowSettingsModal(false)} className="w-full">Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Modal */}
      {selectedChartCampaign && (
        <CampaignChartModal 
          isOpen={!!selectedChartCampaign}
          onClose={() => setSelectedChartCampaign(null)}
          campaign={selectedChartCampaign}
          customerId={account.customerId}
        />
      )}
    </div>
  )
}
