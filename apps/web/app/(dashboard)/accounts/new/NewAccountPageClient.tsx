'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { 
  LayoutGrid, ShieldCheck, CheckCircle2, RefreshCw, 
  Users, Link2, ExternalLink, ChevronRight, Mail, Plus
} from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'

interface OAuthConnection {
  id: string;
  email: string;
  provider: string;
}

interface AdsAccount {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  isManager: boolean;
  parentId?: string;
  loginCustomerId?: string;
  isSynced?: boolean;
}

export default function NewAccountPageClient() {
  const router = useRouter()
  
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AdsAccount[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // 1. Load existing connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch('/api/oauth/connections')
        if (res.ok) {
          const data = await res.json()
          setConnections(data)
          if (data.length > 0) {
            setSelectedConnectionId(data[0].id)
          }
        }
      } catch (e) {
        console.error('Failed to load connections')
      } finally {
        setLoadingConnections(false)
      }
    }
    fetchConnections()
  }, [])

  // 2. Load accounts when connection changes
  useEffect(() => {
    if (selectedConnectionId) {
      loadAccounts(selectedConnectionId)
    } else {
      setAccounts([])
    }
  }, [selectedConnectionId])

  const loadAccounts = async (connId: string) => {
    setLoadingAccounts(true)
    setAccounts([])
    setStatus('idle')
    try {
      const res = await fetch(`/api/oauth/google-ads/list-accounts?connectionId=${connId}`)
      const data = await res.json()
      if (res.ok) {
        setAccounts(data)
        // Auto-select accounts that are already synced
        const syncedIds = data.filter((a: AdsAccount) => a.isSynced && !a.isManager).map((a: AdsAccount) => a.id);
        setSelectedIds(prev => {
          // Merge with existing selections if any, or just set if first load
          const newSet = new Set([...prev, ...syncedIds]);
          return Array.from(newSet);
        });
      } else {
        setStatus('error')
        setMessage(data.error || 'Lỗi tải danh sách tài khoản')
      }
    } catch (e) {
      setStatus('error')
      setMessage('Lỗi kết nối API Google Ads')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const { data: session } = useSession()

  const handleConnectNew = () => {
    // Set a cookie to track the user who is linking (for Auth.js callback)
    if (session?.user?.id) {
      document.cookie = `auth_linking_user_id=${session.user.id}; path=/; max-age=600`;
    }
    signIn('google', { callbackUrl: window.location.href })
  }

  const handleSaveAccounts = async () => {
    if (selectedIds.length === 0 || !selectedConnectionId) return
    setSyncing(true)
    
    const accountsToSave = selectedIds.map(id => {
      const acc = accounts.find(a => a.id === id);
      return {
        id: id,
        name: acc?.name,
        currency: acc?.currency,
        timeZone: acc?.timeZone,
        loginCustomerId: acc?.loginCustomerId
      };
    });

    try {
      const res = await fetch('/api/oauth/google-ads/save-accounts', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionId: selectedConnectionId,
          accounts: accountsToSave 
        })
      })
      if (res.ok) {
        setStatus('success')
        setMessage(`Đã lưu ${selectedIds.length} tài khoản thành công!`)
        setTimeout(() => router.push('/accounts'), 1500)
      } else {
        const data = await res.json()
        setStatus('error')
        setMessage(data.error || 'Lưu tài khoản thất bại')
      }
    } catch (e) {
      setStatus('error')
      setMessage('Lỗi kết nối server')
    } finally {
      setSyncing(false)
    }
  }

  const toggleAccount = (id: string, isManager: boolean) => {
    if (isManager) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const topLevel = accounts.filter(a => !a.parentId);
  const getChildren = (parentId: string) => accounts.filter(a => a.parentId === parentId);

  const renderAccountItem = (acc: AdsAccount, isChild = false) => (
    <div 
      key={acc.id}
      onClick={() => toggleAccount(acc.id, acc.isManager)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12,
        marginLeft: isChild ? 32 : 0,
        border: selectedIds.includes(acc.id) ? '1.5px solid var(--text-1)' : '1px solid var(--border)',
        background: selectedIds.includes(acc.id) ? 'var(--bg-secondary)' : (acc.isManager ? 'var(--bg-secondary)' : 'transparent'),
        cursor: acc.isManager ? 'default' : 'pointer', 
        transition: 'all 0.1s',
        marginBottom: 4,
        opacity: acc.isManager ? 0.8 : 1
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: acc.isManager ? '#EEEDFE' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {acc.isManager ? <Users size={18} color="#3C3489" /> : <ShieldCheck size={18} color="#666" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {isChild && <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />}
          {acc.name}
          {acc.isSynced && (
            <span style={{ 
              fontSize: 10, padding: '2px 6px', borderRadius: 6, 
              background: '#10b98115', color: '#10b981', border: '1px solid #10b98130' 
            }}>
              Đã đồng bộ
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: isChild ? 20 : 0 }}>
          ID: {acc.id} • {acc.currency} • {acc.isManager ? 'Quản lý (MCC)' : 'Tài khoản cá nhân'}
        </div>
      </div>
      {!acc.isManager && (
        <div style={{ 
          width: 18, height: 18, borderRadius: 4, 
          border: '1.5px solid var(--border)', 
          background: selectedIds.includes(acc.id) ? 'var(--text-1)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {selectedIds.includes(acc.id) && <CheckCircle2 size={12} color="white" />}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 40, paddingBottom: 100 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--bg-card)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <LayoutGrid size={32} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-1)' }}>
          Đồng bộ tài khoản Google Ads
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
          Kết nối và chọn các tài khoản quảng cáo bạn muốn quản lý.
        </p>
      </div>

      <div style={{ 
        background: 'var(--bg-card)', border: '0.5px solid var(--border)', 
        borderRadius: 16, padding: 24
      }}>
        {/* Connection Selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 12 }}>
            Chọn Google Account đã kết nối:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {connections.map(conn => (
              <button
                key={conn.id}
                onClick={() => setSelectedConnectionId(conn.id)}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: selectedConnectionId === conn.id ? '1.5px solid var(--text-1)' : '1px solid var(--border)',
                  background: selectedConnectionId === conn.id ? 'var(--bg-secondary)' : 'transparent',
                  color: selectedConnectionId === conn.id ? 'var(--text-1)' : 'var(--text-3)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Mail size={14} />
                {conn.email}
              </button>
            ))}
            <button
              onClick={handleConnectNew}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                border: '1px dashed var(--border)', background: 'transparent',
                color: 'var(--text-1)', cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              Kết nối Mail mới
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          {loadingAccounts ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: 'var(--text-3)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12 }}>Đang quét danh sách tài khoản...</p>
            </div>
          ) : accounts.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                  Tìm thấy {accounts.filter(a => !a.isManager).length} tài khoản quảng cáo
                </span>
                <button 
                  onClick={() => {
                    const allIds = accounts.filter(a => !a.isManager).map(a => a.id);
                    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds);
                  }}
                  style={{ fontSize: 12, color: 'var(--text-1)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  {selectedIds.length === accounts.filter(a => !a.isManager).length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              </div>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 24, paddingRight: 4 }}>
                {topLevel.map(parent => (
                  <div key={parent.id}>
                    {renderAccountItem(parent)}
                    {getChildren(parent.id).map(child => renderAccountItem(child, true))}
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSaveAccounts} 
                disabled={syncing || selectedIds.length === 0}
                className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 disabled:bg-zinc-100 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center justify-center shadow-md hover:shadow-lg cursor-pointer"
              >
                {syncing ? <RefreshCw size={18} className="animate-spin mr-2" /> : null}
                Lưu {selectedIds.length} tài khoản đã chọn
              </Button>
            </div>
          ) : selectedConnectionId ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 14 }}>Không tìm thấy tài khoản Ads nào trong Mail này.</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 14 }}>Hãy chọn một Mail Google để bắt đầu quét tài khoản.</p>
            </div>
          )}
        </div>

        {status !== 'idle' && (
          <div style={{ 
            marginTop: 16, padding: 12, borderRadius: 8, fontSize: 13, textAlign: 'center', fontWeight: 500,
            background: status === 'success' ? '#EAF3DE' : '#FEE2E2',
            color: status === 'success' ? '#3B6D11' : '#991B1B'
          }}>
            {message}
          </div>
        )}
      </div>

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
