'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface PancakeAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (account: any) => void
  initialData?: any
}

export default function PancakeAccountModal({ isOpen, onClose, onSave, initialData }: PancakeAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    shopId: '',
    apiKey: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        shopId: initialData.shopId || '',
        apiKey: initialData.apiKey || ''
      })
    } else {
      setFormData({ name: '', shopId: '', apiKey: '' })
    }
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/crm/pancake-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initialData?.id,
          ...formData
        })
      })

      if (res.ok) {
        const saved = await res.json()
        onSave(saved)
        onClose()
      }
    } catch (error) {
      console.error('Save account failed', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] animate-in fade-in duration-200 p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-[450px] rounded-[var(--radius)] border border-[var(--border)] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
          <h2 className="text-lg font-semibold m-0 leading-tight">
            {initialData ? 'Chỉnh sửa tài khoản Pancake' : 'Thêm tài khoản Pancake'}
          </h2>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors p-2 rounded-full hover:bg-[var(--bg-secondary)] border-0 bg-transparent cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wider">Tên tài khoản</label>
            <input
              type="text" required placeholder="Ví dụ: Shop Giày Main"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all text-xs"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wider">Shop ID</label>
            <input
              type="text" required placeholder="Nhập Shop ID"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all text-xs font-mono"
              value={formData.shopId} onChange={e => setFormData({ ...formData, shopId: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wider">API Key</label>
            <input
              type="password" required placeholder="Nhập API Key"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all text-xs font-mono"
              value={formData.apiKey} onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-2)] transition-colors font-medium text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button 
              type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-[calc(var(--radius)*0.8)] border-0 bg-[var(--text-1)] text-[var(--bg-card)] font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-lg shadow-black/10"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Lưu tài khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
