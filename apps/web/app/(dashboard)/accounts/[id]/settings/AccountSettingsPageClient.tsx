'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Settings, 
  Database, 
  Target, 
  Plus, 
  Trash2, 
  Loader2,
  Mail,
  Save,
  Info,
  Eye,
  EyeOff
} from 'lucide-react'

interface Source {
  id: string
  connectionId: string
  name: string
  type: 'pancake' | 'google_sheet'
  isEnabled: boolean
}

export default function AccountSettingsPageClient() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [data, setData] = useState<{
    account: any
    showPausedByDefault: boolean
    linkedSources: Source[]
    availableConnections: any[]
  } | null>(null)

  const [showPaused, setShowPaused] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [id])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${id}/settings`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setShowPaused(json.showPausedByDefault)
      }
    } catch (e) {
      console.error('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkSource = async (connectionId: string) => {
    setSaving('linking')
    try {
      const res = await fetch(`/api/accounts/${id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link_source', crmConnectionId: connectionId })
      })
      if (res.ok) fetchSettings()
    } finally {
      setSaving(null)
    }
  }

  const handleUnlinkSource = async (connectionId: string) => {
    if (!confirm('Bạn có chắc muốn gỡ nguồn đơn hàng này?')) return
    setSaving('unlinking')
    try {
      const res = await fetch(`/api/accounts/${id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink_source', crmConnectionId: connectionId })
      })
      if (res.ok) fetchSettings()
    } finally {
      setSaving(null)
    }
  }

  const toggleShowPaused = async () => {
    const newValue = !showPaused
    setShowPaused(newValue)
    setSaving('showPaused')
    try {
      await fetch(`/api/accounts/${id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_show_paused', 
          showPaused: newValue 
        })
      })
    } finally {
      setSaving(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--text-3)' }}>
      <Loader2 className="animate-spin" />
    </div>
  )

  if (!data) return <div>Failed to load settings.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={24} className="text-primary" />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Cài đặt tài khoản</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '14px', margin: '4px 0 0 0' }}>{data.account.name} ({data.account.customerId})</p>
        </div>
      </div>

      {/* Order Sources Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} className="text-primary" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Nguồn đơn hàng</h2>
          </div>
          
          <div style={{ position: 'relative' }}>
             <select 
               onChange={(e) => e.target.value && handleLinkSource(e.target.value)}
               disabled={saving === 'linking'}
               style={{ 
                 padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', 
                 background: 'var(--text-1)', color: 'var(--bg-card)', fontSize: '14px', fontWeight: 500,
                 cursor: 'pointer', outline: 'none'
               }}
             >
               <option value="">+ Thêm nguồn đơn hàng</option>
               {data.availableConnections
                 .filter(conn => !data.linkedSources.some(s => s.connectionId === conn.id))
                 .map(conn => (
                   <option key={conn.id} value={conn.id}>{conn.type === 'pancake' ? '🥞' : '📊'} {conn.name}</option>
                 ))
               }
             </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {data.linkedSources.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: '40px', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-3)' }}>
              Chưa có nguồn đơn hàng nào được liên kết.
            </div>
          ) : (
            data.linkedSources.map(source => (
              <div key={source.id} style={{ 
                padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {source.type === 'pancake' ? '🥞' : '📊'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{source.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase' }}>{source.type}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnlinkSource(source.connectionId)}
                  disabled={saving === 'unlinking'}
                  style={{ padding: '8px', color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Campaigns Settings Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Target size={20} className="text-primary" />
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Cài đặt chiến dịch</h2>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Default Load Paused Setting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-2)' }}>{showPaused ? <Eye size={20} /> : <EyeOff size={20} />}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Mặc định hiển thị chiến dịch tạm dừng</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Tự động bật bộ lọc hiển thị các chiến dịch PAUSED khi vào trang danh sách.</div>
              </div>
            </div>
            <div 
              onClick={toggleShowPaused}
              style={{ 
                width: '48px', height: '26px', borderRadius: '13px', 
                background: showPaused ? 'var(--text-1)' : 'var(--border)',
                position: 'relative', cursor: 'pointer', transition: '0.2s',
                opacity: saving === 'showPaused' ? 0.5 : 1
              }}
            >
              <div style={{ 
                width: '22px', height: '22px', borderRadius: '11px', background: 'var(--bg-card)',
                position: 'absolute', top: '2px', left: showPaused ? '24px' : '2px',
                transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}

