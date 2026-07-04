'use client'

import { useEffect, useState } from 'react'
import { X, TrendingUp, DollarSign, Target } from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts'

interface ChartData {
  date: string;
  spend: number;
  cpa: number;
}

interface CampaignChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: { id: string, name: string };
  customerId: string;
  startDate: string;
  endDate: string;
}

export default function CampaignChartModal({ isOpen, onClose, campaign, customerId, startDate, endDate }: CampaignChartModalProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch(`/api/campaigns/chart?customerId=${customerId}&campaignId=${campaign.id}&startDate=${startDate}&endDate=${endDate}`)
        .then(res => res.json())
        .then(d => setData(d))
        .finally(() => setLoading(false))
    }
  }, [isOpen, campaign.id, customerId, startDate, endDate])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: 'var(--bg-card)', width: '100%', maxWidth: 900,
        borderRadius: 24, border: '0.5px solid var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '24px 32px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
              Hiệu suất chiến dịch: {campaign.name}
            </h2>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
              <span>ID: {campaign.id}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                {startDate === endDate ? `Báo cáo ngày ${startDate}` : `Từ ngày ${startDate} đến ${endDate}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ 
            width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-secondary)', 
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={20} style={{ color: 'var(--text-2)' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 32, flex: 1 }}>
          {loading ? (
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              Đang tải biểu đồ...
            </div>
          ) : data.length === 0 ? (
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              Không có dữ liệu lịch sử cho chiến dịch này.
            </div>
          ) : (
            <div style={{ height: 400, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M ₫` : v >= 1000 ? `${(v/1000).toFixed(0)}k ₫` : `${v} ₫`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M ₫` : v >= 1000 ? `${(v/1000).toFixed(0)}k ₫` : `${v} ₫`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', border: '0.5px solid var(--border)', 
                      borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                    }}
                    labelStyle={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Chi tiêu (VND)') return [`${Number(value).toLocaleString('vi-VN')} ₫`, 'Chi tiêu']
                      if (name === 'CPA thực tế') return [`${Number(value).toLocaleString('vi-VN')} ₫`, 'CPA thực tế']
                      return [value, name]
                    }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="spend" 
                    name="Chi tiêu (VND)"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSpend)" 
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cpa" 
                    name="CPA thực tế"
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCpa)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{ padding: '16px 32px', background: 'var(--bg-secondary)', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Chi tiêu hàng ngày</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>CPA thực tế</span>
          </div>
        </div>
      </div>
    </div>
  )
}
