"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, Pause, BarChart2 } from "lucide-react";
import { ChartPopup } from "./ChartPopup";

// Types
type SignalVariant = 'error' | 'warning' | 'success' | 'ai'
type StatusVariant = 'live' | 'paused' | 'alert'

interface Campaign {
  campaignId: string
  name: string
  status: string
  budgetMicros: string
  costMicros: string
  googleConversions: number
  realConversions: number
  budgetId: string
}

function StatusPill({ status }: { status: StatusVariant }) {
  const map = {
    live:   { bg: '#EAF3DE', color: '#3B6D11', label: '● Live' },
    paused: { bg: 'var(--bg-secondary)', color: 'var(--text-3)', label: 'Đã dừng' },
    alert:  { bg: '#FAEEDA', color: '#854F0B', label: '⚠ Live' },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      gap: 5, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 500,
    }}>
      {s.label}
    </span>
  )
}

function Signal({ label, variant }: { label: string; variant: SignalVariant }) {
  const map = {
    error:   { color: '#A32D2D', bg: '#FCEBEB' },
    warning: { color: '#854F0B', bg: '#FAEEDA' },
    success: { color: '#3B6D11', bg: '#EAF3DE' },
    ai:      { color: '#3C3489', bg: '#EEEDFE' },
  }
  const s = map[variant]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, color: s.color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: s.color
      }} />
      {label}
    </div>
  )
}

export function CampaignTable({ campaigns, customerId }: { campaigns: any[], customerId: string }) {
  const [data, setData] = useState(campaigns);

  const handleStatusToggle = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    setData(data.map(c => c.campaignId === campaignId ? { ...c, status: newStatus } : c));
    
    try {
      await fetch(`/api/campaigns/${customerId}/${campaignId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error(e);
      setData(data.map(c => c.campaignId === campaignId ? { ...c, status: currentStatus } : c));
    }
  };

  const formatCurrency = (microsStr: string | number) => {
    const amount = Number(microsStr) / 1000000;
    if (amount === 0) return '—';
    return new Intl.NumberFormat('vi-VN', { 
      maximumFractionDigits: 1,
    }).format(amount) + 'k';
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
      marginBottom: 16,
    }}>
      <Table>
        <TableHeader>
          <TableRow style={{ background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
            <TableHead style={{ width: 40 }}></TableHead>
            <TableHead style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }}>Chiến dịch</TableHead>
            <TableHead style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }}>Trạng thái</TableHead>
            <TableHead style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }} className="text-right">Ngân sách</TableHead>
            <TableHead style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }} className="text-right">Chi phí</TableHead>
            <TableHead style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }} className="text-right">ROAS</TableHead>
            <TableHead style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }}>Signals</TableHead>
            <TableHead style={{ width: 40 }}></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((campaign) => {
            const cost = Number(campaign.costMicros) / 1000000;
            const roas = (campaign.realConversions || 0) > 0 ? (1000 / (cost / campaign.realConversions)).toFixed(1) + '×' : '—';
            const status: StatusVariant = campaign.status === 'ENABLED' ? 'live' : 'paused';

            return (
              <TableRow key={campaign.campaignId} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <TableCell>
                  <input 
                    type="checkbox" 
                    checked={campaign.status === 'ENABLED'} 
                    onChange={() => handleStatusToggle(campaign.campaignId, campaign.status)}
                    style={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                  {campaign.name}
                </TableCell>
                <TableCell>
                  <StatusPill status={status} />
                </TableCell>
                <TableCell className="text-right" style={{ color: 'var(--text-2)' }}>
                  {formatCurrency(campaign.budgetMicros)}
                </TableCell>
                <TableCell className="text-right" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                  {formatCurrency(campaign.costMicros)}
                </TableCell>
                <TableCell className="text-right" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                  {roas}
                </TableCell>
                <TableCell>
                  {campaign.status === 'ENABLED' ? (
                    <Signal label="Đang hoạt động tốt" variant="success" />
                  ) : (
                    <Signal label="Đã tạm dừng" variant="ai" />
                  )}
                </TableCell>
                <TableCell>
                  <ChartPopup campaignId={campaign.campaignId} campaignName={campaign.name} customerId={customerId}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <BarChart2 className="w-4 h-4 text-text-3" />
                    </Button>
                  </ChartPopup>
                </TableCell>
              </TableRow>
            );
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

