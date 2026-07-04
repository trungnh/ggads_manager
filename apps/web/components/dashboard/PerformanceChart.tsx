'use client'

import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ChartDataPoint = {
  date: string
  cost: number      // Chi phí thực tế (VND)
  leads: number     // Đơn hàng CRM thực tế
  roas: number      // Chỉ số ROAS
}

// Định dạng tiền VND viết tắt
const formatVNDShort = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ₫`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k ₫`
  }
  return `${value} ₫`
}

export default function PerformanceChart({ 
  data = [], 
  rangeLabel = "today" 
}: { 
  data?: ChartDataPoint[], 
  rangeLabel?: string 
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-[350px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] flex items-center justify-center text-[var(--text-3)] text-sm">
        Đang tải biểu đồ xu hướng...
      </div>
    )
  }

  // Tính toán tổng quan trong khoảng bộ lọc chọn
  const totalCost = data.reduce((acc, d) => acc + d.cost, 0)
  const totalLeads = data.reduce((acc, d) => acc + d.leads, 0)
  const averageRoas = data.length > 0 
    ? Number((data.reduce((acc, d) => acc + d.roas, 0) / data.length).toFixed(2))
    : 0;

  const getRangeLabelText = (label: string) => {
    if (label === "today") return "Hôm nay (7 ngày qua)"
    if (label === "yesterday") return "Hôm qua (7 ngày qua)"
    if (label === "7days") return "7 ngày qua"
    if (label === "15days") return "15 ngày qua"
    if (label === "30days") return "30 ngày qua"
    return label || "Tùy chọn"
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-5 mb-6 shadow-sm">
      {/* Header controls */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-1)]">
            Biểu đồ Hiệu suất & Xu hướng Tương quan
          </h3>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Sự tương quan giữa Chi tiêu quảng cáo (Spend) và Kết quả kinh doanh thực tế (CRM Leads, ROAS)
          </p>
        </div>

        {/* Filters */}
        <div className="text-xs font-semibold px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full text-[var(--text-3)] font-mono">
          {getRangeLabelText(rangeLabel)}
        </div>
      </div>

      {/* Overview Quick Stats */}
      <div className="grid grid-cols-3 gap-4 bg-[var(--bg-secondary)]/50 border border-dashed border-[var(--border)] rounded-[calc(var(--radius)*0.8)] p-3 mb-5">
        <div>
          <div className="text-[11px] text-[var(--text-3)] mb-0.5">Tổng Chi tiêu chi nhánh</div>
          <div className="text-base font-bold text-[var(--text-1)]">{formatVNDShort(totalCost)}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-3)] mb-0.5">Tổng Đơn CRM hoàn tất</div>
          <div className="text-base font-bold text-[var(--text-1)]">{totalLeads} đơn</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-3)] mb-0.5">ROAS Thực trung bình</div>
          <div className="text-base font-bold text-emerald-500">{averageRoas}×</div>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            
            <YAxis 
              yAxisId="left"
              tickFormatter={formatVNDShort}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis 
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${v}`}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip 
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 12,
                color: 'var(--text-1)',
              }}
              formatter={(value: any, name: any) => {
                if (name === 'cost') return [formatVNDShort(Number(value)), 'Chi phí']
                if (name === 'leads') return [`${value} đơn`, 'Đơn hàng CRM']
                if (name === 'roas') return [`${value}×`, 'ROAS']
                return [value, name]
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />

            <Legend 
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              formatter={(value) => {
                if (value === 'cost') return <span className="text-[var(--text-2)] font-medium">Chi phí quảng cáo (VND)</span>
                if (value === 'leads') return <span className="text-[var(--text-2)] font-medium">Đơn hàng CRM</span>
                if (value === 'roas') return <span className="text-[var(--text-2)] font-medium">ROAS Thực</span>
                return value
              }}
            />

            {/* Spend visual represented as soft area flow */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cost"
              fill="rgba(59, 109, 17, 0.08)"
              stroke="#3B6D11"
              strokeWidth={1.5}
            />

            {/* CRM Leads line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="leads"
              stroke="#0284C7"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1.5, fill: 'var(--bg-card)' }}
              activeDot={{ r: 5 }}
            />

            {/* ROAS Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="roas"
              stroke="#D97706"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, strokeWidth: 1.5, fill: 'var(--bg-card)' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
