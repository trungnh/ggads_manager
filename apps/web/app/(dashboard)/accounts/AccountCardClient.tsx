'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ShieldCheck, Settings, Trash2, RefreshCw } from "lucide-react"

interface AccountCardProps {
  acc: {
    id: string;
    customerId: string;
    name: string;
    currencyCode: string;
    status: string;
  };
  onDeleted: () => void;
}

export default function AccountCardClient({ acc, onDeleted }: AccountCardProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xoá tài khoản "${acc.name}"? Dữ liệu đã đồng bộ của tài khoản này sẽ không còn hiển thị cho bạn.`)) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/accounts/${acc.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted()
      } else {
        alert('Xoá tài khoản thất bại.')
      }
    } catch (e) {
      alert('Lỗi kết nối.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-200 ${deleting ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[calc(var(--radius)*0.8)] bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[var(--text-1)] truncate">
            {acc.name}
          </div>
          <div className="text-xs text-[var(--text-3)] font-mono">ID: {acc.customerId}</div>
        </div>
        <button 
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-[calc(var(--radius)*0.6)] text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center shrink-0"
        >
          {deleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 px-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.6)]">
          <div className="text-[9px] text-[var(--text-3)] uppercase font-bold tracking-tight">Tiền tệ</div>
          <div className="text-xs font-semibold text-[var(--text-2)] font-mono mt-0.5">{acc.currencyCode}</div>
        </div>
        <div className="p-2 px-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.6)]">
          <div className="text-[9px] text-[var(--text-3)] uppercase font-bold tracking-tight">Trạng thái</div>
          <div className="text-xs font-semibold text-emerald-500 mt-0.5">{acc.status}</div>
        </div>
      </div>

      <div className="flex gap-2.5 mt-2">
        <Link href={`/accounts/${acc.id}/settings`} className="flex-1">
          <Button variant="outline" className="w-full h-9 rounded-[calc(var(--radius)*0.8)] border-[var(--border)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-secondary)] text-xs gap-1.5 flex items-center justify-center cursor-pointer">
            <Settings size={14} />
            Cấu hình
          </Button>
        </Link>
        <Link href={`/campaigns?customerId=${acc.customerId}`}>
          <Button variant="default" className="h-9 px-4 rounded-[calc(var(--radius)*0.8)] text-xs font-bold cursor-pointer">
            Chiến dịch
          </Button>
        </Link>
      </div>
    </div>
  )
}
