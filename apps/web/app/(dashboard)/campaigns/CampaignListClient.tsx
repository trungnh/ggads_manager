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
    <div className="p-0 bg-transparent min-h-screen text-slate-800 dark:text-slate-100">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Chiến dịch</h1>
              
              {/* Account Dropdown Selector */}
              <select
                value={account.customerId}
                onChange={(e) => {
                  const custId = e.target.value
                  if (custId) {
                    router.push(`/campaigns/${custId}?startDate=${startDate}&endDate=${endDate}`)
                  }
                }}
                className="h-8 rounded-[calc(var(--radius)*0.6)] border border-slate-250 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800 px-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer max-w-[280px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] truncate"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.customerId} className="bg-[var(--bg-card)] text-slate-800 dark:text-slate-100">
                    {acc.name || 'Tài khoản không tên'} ({acc.customerId})
                  </option>
                ))}
              </select>
            </div>
            
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold w-fit">
              ID: {account.customerId}
            </Badge>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-450">Quản lý hiệu suất và tối ưu hóa ngân sách theo thời gian thực.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-8.5 text-xs bg-white dark:bg-slate-950 border-slate-250 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] cursor-pointer gap-1.5 font-semibold" onClick={() => setShowSettingsModal(true)}>
            <Settings size={13} />
            Cấu hình
          </Button>
          <Button variant="outline" className="h-8.5 text-xs bg-white dark:bg-slate-950 border-slate-250 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer gap-1.5 font-semibold">
            <Calendar size={13} />
            Lịch trình chạy
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Tổng chi tiêu', value: formatMoney(totals.cost), icon: DollarSign, color: '#3b82f6' },
          { label: 'Tổng chuyển đổi', value: totals.realConversions.toLocaleString() + ' đơn', icon: Target, color: '#10b981' },
          { label: 'CPA bình quân', value: (totals.realConversions > 0 ? formatMoney(totals.cost / totals.realConversions) : '—'), icon: Activity, color: '#f59e0b' },
          { label: 'ROAS bình quân', value: (totals.cost > 0 ? (totals.value / totals.cost).toFixed(2) + '×' : '0.00×'), icon: TrendingUp, color: '#10b981' }
        ].map((stat, i) => (
          <div key={i} className="glass-card glow-emerald p-4.5 rounded-xl border border-slate-200 dark:border-slate-900 flex items-center gap-4 hover:-translate-y-[2px] transition-all duration-300 group shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}12` }}>
              <stat.icon size={18} style={{ color: stat.color }} className="drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{stat.label}</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-none mt-1.5 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4.5 mb-5 rounded-xl border border-[var(--border)] bg-white/40 dark:bg-slate-950/20 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input 
              type="text" 
              placeholder="Tìm chiến dịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-60 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:border-emerald-500/80 focus:ring-emerald-500/10 text-xs font-semibold outline-none transition-all shadow-sm"
            />
          </div>
          
          {/* Date Picker Range */}
          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-3.5 py-1.5 rounded-lg text-xs text-[var(--text-2)] font-semibold shadow-sm">
            <Calendar size={13} className="text-[var(--text-3)]" />
            <span>Từ</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => router.push(`?startDate=${e.target.value}&endDate=${endDate}`)}
              className="bg-transparent border-0 text-[var(--text-1)] outline-none text-xs cursor-pointer font-bold"
            />
            <span className="text-[var(--text-3)] opacity-40 font-normal">|</span>
            <span>Đến</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => router.push(`?startDate=${startDate}&endDate=${e.target.value}`)}
              className="bg-transparent border-0 text-[var(--text-1)] outline-none text-xs cursor-pointer font-bold"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-2)] pl-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
              <input type="checkbox" checked={showEnabledOnly} onChange={e => setShowEnabledOnly(e.target.checked)} className="rounded border-[var(--border)] text-emerald-500 bg-[var(--bg-card)] focus:ring-0 focus:ring-offset-0" /> Bật
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
              <input type="checkbox" checked={showSpendOnly} onChange={e => setShowSpendOnly(e.target.checked)} className="rounded border-[var(--border)] text-emerald-500 bg-[var(--bg-card)] focus:ring-0 focus:ring-offset-0" /> Chi tiêu &gt; 0
            </label>
          </div>
        </div>
        <div>
          <Button 
            variant="outline" 
            onClick={handleSync}
            disabled={updatingId === 'manual-sync'}
            className="h-8.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-0 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RefreshCw size={12} className={updatingId === 'manual-sync' ? 'animate-spin' : ''} />
            {updatingId === 'manual-sync' ? 'ĐANG ĐỒNG BỘ...' : 'ĐỒNG BỘ DATA'}
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card border border-[var(--border)] shadow-xl rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-16">ID</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-left px-3 w-64">Tên chiến dịch</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-32">Ngân sách</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-28">Trạng thái</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-28">Chi tiêu</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-20">ROAS</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-28">CPA</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-16">Đơn</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-20">CTR</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-20">Clicks</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-20">CPC</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-28">Doanh thu</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-right px-3 w-24">CFLC</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-36">Chiến lược</th>
                <th className="font-bold text-[var(--text-2)] text-[10px] uppercase tracking-wider py-3.5 text-center px-3 w-24">Thao tác</th>
              </tr>
            </thead>
          <tbody>
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
                <tr key={c.id} style={{ borderBottom: '0.5px solid var(--border)', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={TD}><span style={{ color: 'var(--text-3)', fontSize: 11 }}>{c.id}</span></td>
                  <td style={{ ...TD, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>{c.name}</div>
                  </td>
                  
                  {/* Editable Budget */}
                  <td style={TD}>
                    {editingBudget?.id === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <input 
                          autoFocus
                          type="number"
                          value={editingBudget.value}
                          onChange={e => setEditingBudget({ id: c.id, value: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id, 'budget', parseInt(editingBudget.value) * 1000000)}
                          onBlur={() => setTimeout(() => setEditingBudget(null), 150)}
                          style={EDIT_INPUT}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleUpdate(c.id, 'budget', parseInt(editingBudget.value) * 1000000)} style={ICON_BTN_CHECK}><Save size={12} /></button>
                          <button onClick={() => setEditingBudget(null)} style={ICON_BTN_X}><X size={12} /></button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setEditingBudget({ id: c.id, value: (parseInt(c.budget) / 1000000).toString() })}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
                      >
                        {formatMoney(c.budget)}
                        <Edit2 size={12} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
                      </div>
                    )}
                  </td>

                  <td style={TD}>
                    {c.id === 'offline' ? (
                      <Badge style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>OFFLINE</Badge>
                    ) : (
                      <Badge variant="outline" style={{ 
                        background: c.status === 'ENABLED' ? '#10b98115' : '#ef444415',
                        color: c.status === 'ENABLED' ? '#10b981' : '#ef4444',
                        borderColor: 'transparent'
                      }}>
                        {c.status === 'ENABLED' ? 'Đang chạy' : 'Tạm dừng'}
                      </Badge>
                    )}
                  </td>

                  <td style={TD}><span style={{ fontWeight: 500 }}>{formatMoney(c.cost)}</span></td>
                  <td style={TD}><span style={{ color: roas < 1.5 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{roas.toFixed(2)}</span></td>
                  <td style={TD}><span style={{ color: '#3b82f6', fontWeight: 500 }}>{cpa > 0 ? Math.round(cpa).toLocaleString() + ' ₫' : '—'}</span></td>
                  <td style={TD}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{realTotal}</span>
                  </td>
                  <td style={TD}>{ctr.toFixed(2)}%</td>
                  <td style={TD}>{c.clicks.toLocaleString()}</td>
                  <td style={TD}>{Math.round(cpc).toLocaleString()} ₫</td>
                  <td style={TD}><span style={{ fontWeight: 600 }}>{Math.round(successValue).toLocaleString()} ₫</span></td>
                  
                  {/* CFLC Column */}
                  <td style={TD}>
                    {c.id === 'offline' ? '—' : editingCflc?.id === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <input 
                          autoFocus
                          type="number"
                          value={editingCflc.value}
                          onChange={e => setEditingCflc({ id: c.id, value: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id, 'cflc_override', parseInt(editingCflc.value) * 1000000)}
                          onBlur={() => setTimeout(() => setEditingCflc(null), 150)}
                          style={EDIT_INPUT}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleUpdate(c.id, 'cflc_override', parseInt(editingCflc.value) * 1000000)} style={ICON_BTN_CHECK}><Save size={12} /></button>
                          <button onClick={() => setEditingCflc(null)} style={ICON_BTN_X}><X size={12} /></button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setEditingCflc({ id: c.id, value: (parseInt(c.cfCost || '0') / 1000000).toString() })} style={{ cursor: 'pointer', fontWeight: 500, color: '#f59e0b' }}>
                        {formatMoney(c.cfCost)}
                      </div>
                    )}
                  </td>

                  {/* Editable CPA / Bidding Strategy */}
                  <td style={TD}>
                    {c.id === 'offline' ? '—' : editingCpa?.id === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <input 
                          autoFocus
                          type="number"
                          value={editingCpa.value}
                          onChange={e => setEditingCpa({ id: c.id, value: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id, 'target_cpa', parseInt(editingCpa.value) * 1000000)}
                          onBlur={() => setTimeout(() => setEditingCpa(null), 150)}
                          style={EDIT_INPUT}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleUpdate(c.id, 'target_cpa', parseInt(editingCpa.value) * 1000000)} style={ICON_BTN_CHECK}><Save size={12} /></button>
                          <button onClick={() => setEditingCpa(null)} style={ICON_BTN_X}><X size={12} /></button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setEditingCpa({ id: c.id, value: (parseInt(c.targetCpa || '0') / 1000000).toString() })} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.biddingStrategyType.replace(/_/g, ' ')}:</div>
                        <div style={{ fontWeight: 600 }}>{c.targetCpa ? formatMoney(c.targetCpa) : (c.targetRoas ? (c.targetRoas / 100).toFixed(0) + '%' : 'N/A')}</div>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={TD}>
                    {c.id === 'offline' ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedChartCampaign({ id: c.id, name: c.name })}
                          style={{ height: 28, fontSize: 11, gap: 4, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }}
                        >
                          <BarChart2 size={12} /> CHART
                        </Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdate(c.id, 'status', c.status === 'ENABLED' ? 'PAUSED' : 'ENABLED')}
                          style={{ 
                            height: 28, fontSize: 11, width: 60,
                            background: c.status === 'ENABLED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: c.status === 'ENABLED' ? '#10b981' : '#ef4444',
                            border: 'none'
                          }}
                        >
                          {c.status === 'ENABLED' ? 'TẮT' : 'BẬT'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdate(c.id, 'is_excluded', !c.isExcluded)}
                          style={{ 
                            height: 28, fontSize: 11, gap: 4,
                            background: c.isExcluded ? 'rgba(245, 158, 11, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                            color: c.isExcluded ? '#f59e0b' : '#6b7280',
                            border: 'none',
                            fontWeight: 600
                          }}
                        >
                          {c.isExcluded ? <ZapOff size={12} /> : <Zap size={12} />}
                          {c.isExcluded ? 'BỎ AUTO' : 'AUTO'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedChartCampaign({ id: c.id, name: c.name })}
                          style={{ height: 28, fontSize: 11, gap: 4, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }}
                        >
                          <BarChart2 size={12} /> CHART
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
              <td colSpan={2} style={{ ...TD, textAlign: 'left' }}>TỔNG CỘNG</td>
              <td style={TD}>{formatMoney(totals.budget)}</td>
              <td style={TD}>-</td>
              <td style={TD}>{formatMoney(totals.cost)}</td>
              <td style={TD}>{(totals.cost > 0 ? totals.value / totals.cost : 0).toFixed(2)}</td>
              <td style={TD}>{formatMoney(totals.conversions > 0 ? totals.cost / totals.conversions : 0)}</td>
              <td style={TD}>{totals.conversions.toFixed(1)}</td>
              <td style={TD}>-</td>
              <td style={TD}>{totals.clicks.toLocaleString()}</td>
              <td style={TD}>-</td>
              <td style={TD}>{formatMoney(totals.value)}</td>
              <td style={TD}>-</td>
              <td style={TD}>-</td>
              <td style={TD}>-</td>
            </tr>
          </tfoot>
        </table>
      </div>
      </div>

      {/* Ads Account Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', width: '100%', maxWidth: '450px',
            borderRadius: '16px', border: '1px solid var(--border)', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Cấu hình tài khoản</h2>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-1)' }}>Hiển thị các đơn hàng OFFLINE</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '280px' }}>Bao gồm các đơn không có campaign_id từ Google Ads vào một hàng riêng</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={showOfflineOrders} 
                  onChange={handleToggleOffline} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                * Sau khi thay đổi, hãy nhấn ĐỒNG BỘ DATA để quét lại dữ liệu.
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Button onClick={() => setShowSettingsModal(false)} style={{ width: '100%' }}>Đóng</Button>
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

const TH: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'center',
  color: '#9A9894',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const TD: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'center',
  verticalAlign: 'middle'
}

const EDIT_INPUT: React.CSSProperties = {
  width: 100,
  height: 28,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid #10b981',
  background: 'var(--bg-card)',
  color: 'var(--text-1)',
  fontSize: 12,
  outline: 'none',
  textAlign: 'center'
}

const ICON_BTN_CHECK: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, background: '#10b981', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const ICON_BTN_X: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
}
