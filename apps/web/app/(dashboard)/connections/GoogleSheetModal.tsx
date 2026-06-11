'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { X, Loader2, Mail, Plus } from 'lucide-react'

interface GoogleSheetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData?: any
}

interface OAuthConnection {
  id: string;
  email: string;
  provider: string;
}

export default function GoogleSheetModal({ isOpen, onClose, onSave, initialData }: GoogleSheetModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sheetId: '',
    sheetName: '',
    oauthConnectionId: '',
    // Mapping columns
    conversionDateCol: '',
    phoneCol: '',
    conversionValueCol: '',
    campaignIdCol: ''
  })
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingConnections, setLoadingConnections] = useState(true)

  const { data: session } = useSession()

  useEffect(() => {
    if (isOpen) {
      fetchConnections()
    }
  }, [isOpen])

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        sheetId: initialData.config?.sheetId || '',
        sheetName: initialData.config?.sheetName || '',
        oauthConnectionId: initialData.oauthConnectionId || '',
        conversionDateCol: initialData.config?.conversionDateCol || '',
        phoneCol: initialData.config?.phoneCol || '',
        conversionValueCol: initialData.config?.conversionValueCol || '',
        campaignIdCol: initialData.config?.campaignIdCol || ''
      })
    }
  }, [initialData])

  const fetchConnections = async () => {
    setLoadingConnections(true)
    try {
      const res = await fetch('/api/oauth/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
        if (data.length > 0 && !formData.oauthConnectionId) {
          setFormData(prev => ({ ...prev, oauthConnectionId: data[0].id }))
        }
      }
    } catch (e) {
      console.error('Failed to load connections')
    } finally {
      setLoadingConnections(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.oauthConnectionId) return;
    
    setLoading(true)

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initialData?.id,
          name: formData.name,
          type: 'google_sheet',
          oauthConnectionId: formData.oauthConnectionId,
          config: {
            sheetId: formData.sheetId,
            sheetName: formData.sheetName,
            conversionDateCol: formData.conversionDateCol,
            phoneCol: formData.phoneCol,
            conversionValueCol: formData.conversionValueCol,
            campaignIdCol: formData.campaignIdCol
          }
        })
      })

      if (res.ok) {
        const saved = await res.json()
        onSave(saved)
        onClose()
      }
    } catch (error) {
      console.error('Save failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = () => {
    if (session?.user?.id) {
      document.cookie = `auth_linking_user_id=${session.user.id}; path=/; max-age=600`;
    }
    signIn('google', { callbackUrl: window.location.href })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] w-full max-w-[550px] max-h-[95vh] rounded-[var(--radius)] overflow-y-auto border border-[var(--border)] shadow-2xl flex flex-col">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-card)] z-[1]">
          <h2 className="text-lg font-semibold m-0 leading-tight">Kết nối Google Sheet</h2>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-[var(--text-3)] hover:text-[var(--text-1)] p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Connection Selector */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Chọn Google Account</label>
            {loadingConnections ? (
              <div className="p-2.5 text-xs text-[var(--text-3)]">Đang tải danh sách...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connections.map(conn => (
                  <button
                    key={conn.id} type="button"
                    onClick={() => setFormData({ ...formData, oauthConnectionId: conn.id })}
                    className={`px-3 py-1.5 rounded-[calc(var(--radius)*0.8)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                      formData.oauthConnectionId === conn.id 
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] shadow-sm' 
                        : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-3)] hover:border-[var(--primary)]/50'
                    }`}
                  >
                    <Mail size={12} />
                    {conn.email}
                  </button>
                ))}
                <button
                  type="button" onClick={handleOAuth}
                  className="px-3 py-1.5 rounded-[calc(var(--radius)*0.8)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-dashed border-[var(--border)] bg-transparent text-[var(--text-1)] hover:border-[var(--primary)]/50 transition-all"
                >
                  <Plus size={12} />
                  Kết nối Mail mới
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Tên kết nối</label>
              <input
                type="text" required placeholder="Ví dụ: Đơn hàng T4"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Tên Sheet</label>
              <input
                type="text" required placeholder="Ví dụ: Trang tính 1"
                value={formData.sheetName} onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Google Sheet ID</label>
            <input
              type="text" required placeholder="ID từ URL của Google Sheet"
              value={formData.sheetId} onChange={e => setFormData({ ...formData, sheetId: e.target.value })}
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
            />
          </div>

          {/* Column Mapping Section */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-1)]">Cấu hình cột dữ liệu</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-tight">Cột ngày chuyển đổi</label>
                <input
                  type="text" placeholder="Ví dụ: A hoặc Ngày"
                  value={formData.conversionDateCol} onChange={e => setFormData({ ...formData, conversionDateCol: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-tight">Cột số điện thoại</label>
                <input
                  type="text" placeholder="Ví dụ: B hoặc SĐT"
                  value={formData.phoneCol} onChange={e => setFormData({ ...formData, phoneCol: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-tight">Cột giá trị</label>
                <input
                  type="text" placeholder="Ví dụ: C hoặc Giá trị"
                  value={formData.conversionValueCol} onChange={e => setFormData({ ...formData, conversionValueCol: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-tight">Cột Campaign ID</label>
                <input
                  type="text" placeholder="Ví dụ: D hoặc Campaign ID"
                  value={formData.campaignIdCol} onChange={e => setFormData({ ...formData, campaignIdCol: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-xs font-medium"
                />
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-3)] m-0 leading-normal">Mẹo: Bạn có thể nhập tên cột hoặc ký hiệu cột (A, B, C...).</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-secondary)] transition-colors text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit" disabled={loading || !formData.oauthConnectionId}
              className="flex-1 py-3 rounded-[calc(var(--radius)*0.8)] border-0 bg-[var(--text-1)] text-[var(--bg-card)] font-bold transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu...
                </>
              ) : 'Lưu kết nối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
