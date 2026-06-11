'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Send } from 'lucide-react'

interface TelegramModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (connection: any) => void
  initialData?: any
}

export default function TelegramModal({ isOpen, onClose, onSave, initialData }: TelegramModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    botToken: '',
    chatId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        botToken: initialData.botToken || '',
        chatId: initialData.chatId || ''
      })
    } else {
      setFormData({ name: '', botToken: '', chatId: '' })
    }
    setError(null)
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/telegram/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        onSave(data.connection)
        onClose()
      } else {
        setError(data.error || 'Lưu kết nối thất bại')
      }
    } catch (err: any) {
      console.error('Save connection failed', err)
      setError('Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] animate-in fade-in duration-200 p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-[480px] rounded-[var(--radius)] border border-[var(--border)] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
          <h2 className="text-lg font-semibold m-0 flex items-center gap-2 leading-tight">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            Kết nối Telegram Bot
          </h2>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors p-2 rounded-full hover:bg-[var(--bg-secondary)] border-0 bg-transparent cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-[calc(var(--radius)*0.8)] bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-500 leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Tên kết nối</label>
            <input
              type="text" required placeholder="Ví dụ: Kênh Báo Cáo Sếp, Group Cảnh Báo"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-xs font-medium"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Bot Token</label>
            <input
              type="text" required placeholder="Nhập Bot Token (từ @BotFather)"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-xs font-medium"
              value={formData.botToken} onChange={e => setFormData({ ...formData, botToken: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Chat ID</label>
            <input
              type="text" required placeholder="Nhập Chat ID hoặc Channel ID (-100...)"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-xs font-medium"
              value={formData.chatId} onChange={e => setFormData({ ...formData, chatId: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-2)] transition-colors text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button 
              type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-[calc(var(--radius)*0.8)] border-0 bg-sky-500 hover:bg-sky-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-lg shadow-sky-500/10"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Gửi Tin Nhắn Thử & Lưu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
