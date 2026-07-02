'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Database, 
  FileSpreadsheet, 
  Trash2, 
  Edit2, 
  Settings2, 
  Send, 
  LayoutGrid, 
  Sparkles, 
  Store, 
  ShieldCheck, 
  HelpCircle,
  Cpu,
  Key,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react'
import PancakeModal from './PancakeModal'
import GoogleSheetModal from './GoogleSheetModal'
import TelegramModal from './TelegramModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export interface CrmConnection {
  id: string
  name: string
  type: string
  config: any
  pancakeAccountId?: string
  createdAt: string | Date | null
}

interface ConnectionsPageClientProps {
  initialConnections: any[]
  initialTelegramConnections?: any[]
  initialAiConnections?: any[]
}

export default function ConnectionsPageClient({ 
  initialConnections, 
  initialTelegramConnections = [],
  initialAiConnections = []
}: ConnectionsPageClientProps) {
  const [connections, setConnections] = useState<CrmConnection[]>(initialConnections)
  const [telegramConnections, setTelegramConnections] = useState<any[]>(initialTelegramConnections)
  
  // AI Connections states nhúng từ Settings
  const [aiConnectionsList, setAiConnectionsList] = useState<any[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [editingAIProvider, setEditingAIProvider] = useState<string | null>(null)
  const [aiApiKeyInput, setAiApiKeyInput] = useState("")
  const [isSavingAIKey, setIsSavingAIKey] = useState(false)
  const [testingAIProvider, setTestingAIProvider] = useState<string | null>(null)
  const [aiError, setAiError] = useState("")
  const [aiSuccess, setAiSuccess] = useState("")

  const [isPancakeModalOpen, setIsPancakeModalOpen] = useState(false)
  const [isGSheetModalOpen, setIsGSheetModalOpen] = useState(false)
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  
  const [editingConnection, setEditingConnection] = useState<CrmConnection | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  // Automatically switch to AI tab if ?tab=ai is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'ai' || tabParam === 'ai_insights') {
        setFilterType('ai_insights');
      }
    }
  }, []);

  // Map initial AI connections to visual settings list format
  useEffect(() => {
    const formattedInitial = ['gemini', 'gemini-pro', 'openai'].map(provider => {
      const dbConn = initialAiConnections.find(c => c.provider === provider);
      return {
        provider,
        status: dbConn?.status || 'none',
        hasKey: !!dbConn,
        maskedKey: dbConn ? '***' : ''
      };
    });
    setAiConnectionsList(formattedInitial);
  }, [initialAiConnections]);

  const fetchAIConnections = async () => {
    setIsLoadingAI(true)
    try {
      const res = await fetch("/api/settings/ai-connections")
      if (res.ok) {
        const data = await res.json()
        setAiConnectionsList(data.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch AI connections:", err)
    } finally {
      setIsLoadingAI(false)
    }
  }

  const handleSaveAIKey = async (provider: string) => {
    if (!aiApiKeyInput) return
    setIsSavingAIKey(true)
    setAiError("")
    setAiSuccess("")
    try {
      const res = await fetch("/api/settings/ai-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: aiApiKeyInput }),
      })
      if (res.ok) {
        setAiSuccess(`Đã cấu hình khóa API cho ${provider === 'openai' ? 'OpenAI' : provider === 'gemini-pro' ? 'Gemini Pro' : 'Gemini Flash'} thành công!`)
        setAiApiKeyInput("")
        setEditingAIProvider(null)
        fetchAIConnections()
      } else {
        const data = await res.json()
        setAiError(data.error || "Gặp lỗi khi lưu khóa API.")
      }
    } catch (err) {
      setAiError("Gặp lỗi kết nối khi lưu khóa API.")
    } finally {
      setIsSavingAIKey(false)
    }
  }

  const handleDeleteAIKey = async (provider: string) => {
    const providerLabel = provider === 'openai' ? 'OpenAI' : provider === 'gemini-pro' ? 'Gemini Pro' : 'Gemini Flash';
    if (!confirm(`Bạn có chắc chắn muốn gỡ cấu hình khóa API của ${providerLabel}?`)) return
    setAiError("")
    setAiSuccess("")
    try {
      const res = await fetch(`/api/settings/ai-connections?provider=${provider}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setAiSuccess(`Đã gỡ cấu hình khóa API của ${providerLabel} thành công.`)
        fetchAIConnections()
      } else {
        const data = await res.json()
        setAiError(data.error || "Gặp lỗi khi gỡ khóa API.")
      }
    } catch (err) {
      setAiError("Gặp lỗi kết nối khi gỡ khóa API.")
    }
  }

  const handleTestAIConnection = async (provider: string) => {
    setTestingAIProvider(provider)
    setAiError("")
    setAiSuccess("")
    try {
      const res = await fetch("/api/settings/ai-connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAiSuccess(`✅ ${data.message || 'Kết nối hoạt động tốt!'}`)
      } else {
        setAiError(`❌ Thử nghiệm thất bại: ${data.error || 'Khóa API không hợp lệ hoặc hết hạn'}`)
      }
    } catch (err) {
      setAiError("❌ Lỗi kết nối khi kiểm tra API Key.")
    } finally {
      setTestingAIProvider(null)
    }
  }

  const filteredCrmConnections = connections.filter(conn => {
    if (filterType === 'all') return true
    return conn.type === filterType
  })

  const filteredTelegramConnections = telegramConnections.filter(conn => {
    if (filterType === 'all') return true
    return filterType === 'telegram'
  })

  const activeAiConnections = aiConnectionsList.filter(conn => conn.hasKey && conn.status === 'active')
  const filteredAiConnections = activeAiConnections.filter(() => {
    if (filterType === 'all') return true
    return filterType === 'ai_insights'
  })

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kết nối này?')) return
    try {
      const res = await fetch(`/api/crm?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConnections(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Delete CRM connection failed', error)
    }
  }

  const handleDeleteTelegramConnection = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kết nối Telegram này?')) return
    try {
      const res = await fetch(`/api/telegram/connections?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTelegramConnections(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Delete Telegram failed', error)
    }
  }

  const handleSaveConnection = (newConnection: CrmConnection) => {
    setConnections(prev => {
      const exists = prev.find(c => c.id === newConnection.id)
      if (exists) return prev.map(c => c.id === newConnection.id ? newConnection : c)
      return [...prev, newConnection]
    })
  }

  const handleSaveTelegramConnection = (newConnection: any) => {
    setTelegramConnections(prev => {
      const exists = prev.find(c => c.id === newConnection.id)
      if (exists) return prev.map(c => c.id === newConnection.id ? newConnection : c)
      return [...prev, newConnection]
    })
  }

  // --- Counters Calculations ---
  const googleCount = connections.filter(c => c.type === 'google_sheet').length
  const pancakeCount = connections.filter(c => c.type === 'pancake').length
  const telegramCount = telegramConnections.length
  const aiCount = activeAiConnections.length
  const totalCount = googleCount + pancakeCount + telegramCount + aiCount

  const CARDS = [
    {
      name: 'Tổng cộng',
      count: totalCount,
      icon: LayoutGrid,
      bgClass: 'bg-red-500/10 text-red-500 dark:bg-red-950/20 dark:text-red-400',
      countClass: 'text-red-600 dark:text-red-400',
      type: 'all'
    },
    {
      name: 'Google',
      count: googleCount,
      icon: FileSpreadsheet,
      bgClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
      countClass: 'text-emerald-600 dark:text-emerald-400',
      type: 'google_sheet'
    },
    {
      name: 'Telegram',
      count: telegramCount,
      icon: Send,
      bgClass: 'bg-sky-500/10 text-sky-500 dark:bg-sky-950/20 dark:text-sky-400',
      countClass: 'text-sky-500 dark:text-sky-400',
      type: 'telegram'
    },
    {
      name: 'Kết nối AI',
      count: aiCount,
      icon: Sparkles,
      bgClass: 'bg-cyan-500/10 text-cyan-500 dark:bg-cyan-950/20 dark:text-cyan-400',
      countClass: 'text-cyan-600 dark:text-cyan-400',
      type: 'ai_insights'
    },
    {
      name: 'Pancake',
      count: pancakeCount,
      icon: Database,
      bgClass: 'bg-blue-500/10 text-blue-500 dark:bg-blue-950/20 dark:text-blue-400',
      countClass: 'text-blue-600 dark:text-blue-400',
      type: 'pancake'
    }
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* --- Status alerts nhúng từ AI settings page --- */}
      {(aiError || aiSuccess) && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          {aiError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <span className="font-semibold">Lỗi hệ thống AI:</span> {aiError}
              </div>
              <button onClick={() => setAiError("")} className="text-zinc-400 hover:text-zinc-100 border-0 bg-transparent cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {aiSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1">
                <span className="font-semibold">Thành công:</span> {aiSuccess}
              </div>
              <button onClick={() => setAiSuccess("")} className="text-zinc-400 hover:text-zinc-100 border-0 bg-transparent cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Active Integration Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-card)] p-8 rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-1)]">Quản lý kết nối & Tích hợp</h1>
          <p className="text-sm text-[var(--text-3)]">Cấu hình kết nối dữ liệu Pancake CRM, Google Sheet, Telegram Bot và thiết lập API Trợ lý AI.</p>
        </div>
        
        {/* Unified Add Connection Action Dropdown */}
        <div className="relative">
          <Button 
            className="gap-2 shadow-md shadow-emerald-500/10 h-11 px-6 rounded-[calc(var(--radius)*0.8)] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex items-center transition-all cursor-pointer border-0"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
          >
            <Plus size={18} />
            Thêm kết nối
          </Button>
          
          {isAddMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsAddMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-card)] shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <button 
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg-secondary)] text-[var(--text-1)] flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  onClick={() => {
                    setEditingConnection(null)
                    setIsGSheetModalOpen(true)
                    setIsAddMenuOpen(false)
                  }}
                >
                  <FileSpreadsheet size={15} className="text-emerald-500" />
                  Thêm Google Sheet
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg-secondary)] text-[var(--text-1)] flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  onClick={() => {
                    setEditingConnection(null)
                    setIsPancakeModalOpen(true)
                    setIsAddMenuOpen(false)
                  }}
                >
                  <Database size={15} className="text-blue-500" />
                  Thêm kết nối Pancake
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg-secondary)] text-[var(--text-1)] flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  onClick={() => {
                    setEditingConnection(null)
                    setIsTelegramModalOpen(true)
                    setIsAddMenuOpen(false)
                  }}
                >
                  <Send size={15} className="text-sky-500" />
                  Thêm kết nối Telegram Bot
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg-secondary)] text-[var(--text-1)] flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent border-t border-[var(--border)] pt-2 mt-1"
                  onClick={() => {
                    setFilterType('ai_insights')
                    setIsAddMenuOpen(false)
                  }}
                >
                  <Sparkles size={15} className="text-cyan-500" />
                  Thêm cấu hình AI Key
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Brand Connection Counters Grid --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {CARDS.map(card => {
          const Icon = card.icon
          const isActive = filterType === card.type
          return (
            <button 
              key={card.name} 
              onClick={() => setFilterType(card.type)}
              type="button"
              className={`w-full text-left p-4 rounded-[calc(var(--radius)*0.8)] border flex items-center justify-between shadow-sm transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 translate-y-[-2px] shadow-md bg-[var(--bg-card)]' 
                  : 'border-[var(--border)] bg-[var(--bg-card)] opacity-80 hover:opacity-100 hover:translate-y-[-2px] hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-[calc(var(--radius)*0.6)] flex items-center justify-center shrink-0 ${card.bgClass}`}>
                  <Icon size={16} />
                </div>
                <span className="text-xs font-bold text-[var(--text-2)] truncate">{card.name}</span>
              </div>
              <span className={`text-sm font-extrabold shrink-0 ${card.countClass}`}>{card.count}</span>
            </button>
          )
        })}
      </div>

      {/* --- Active Connections Section --- */}
      {filterType !== 'ai_insights' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Settings2 size={18} className="text-emerald-500" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-2)]">
              {filterType === 'all' ? 'Các kết nối đang hoạt động' : `Kết nối ${CARDS.find(c => c.type === filterType)?.name || ''} đang hoạt động`}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCrmConnections.length === 0 && filteredTelegramConnections.length === 0 && filteredAiConnections.length === 0 ? (
              <div className="col-span-full p-20 text-center bg-[var(--bg-card)] rounded-[var(--radius)] border border-dashed border-[var(--border)] opacity-60">
                <Database size={48} className="mx-auto mb-4 text-[var(--text-3)]" />
                <p className="text-xs text-[var(--text-3)] italic">Chưa có kết nối nào được tạo hoặc không khớp bộ lọc.</p>
              </div>
            ) : (
              <>
                {/* Render CRM connections */}
                {filteredCrmConnections.map(conn => (
                  <div key={conn.id} className="group bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] hover:border-emerald-500/30 transition-all shadow-sm flex flex-col justify-between hover:shadow-md duration-200">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-11 h-11 rounded-[calc(var(--radius)*0.8)] flex items-center justify-center ${conn.type === 'pancake' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                          {conn.type === 'pancake' ? <Database size={22} /> : <FileSpreadsheet size={22} />}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)]" onClick={() => { setEditingConnection(conn); conn.type === 'pancake' ? setIsPancakeModalOpen(true) : setIsGSheetModalOpen(true) }}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] border border-transparent text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteConnection(conn.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-[var(--text-1)] truncate">{conn.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-[calc(var(--radius)*0.4)] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-3)]">
                            {conn.type === 'pancake' ? 'Pancake POS' : 'Google Sheet'}
                          </span>
                          <span className="text-[10px] text-[var(--text-3)]" suppressHydrationWarning>
                            {new Date(conn.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-extrabold text-[var(--text-3)] uppercase tracking-tight">Chi tiết nguồn</p>
                        <p className="text-xs font-semibold truncate text-[var(--text-2)]">
                          {conn.type === 'pancake' 
                            ? (conn.pancakeAccountId ? 'Tài khoản đã gán' : 'Chưa gán account')
                            : (conn.config.sheetName || 'N/A')
                          }
                        </p>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-extrabold text-[var(--text-3)] uppercase tracking-tight">Dữ liệu lấy theo</p>
                        <p className="text-xs font-semibold truncate text-[var(--text-2)]">
                          {conn.type === 'pancake'
                            ? (conn.config.productDisplayId ? `ID: ${conn.config.productDisplayId}` : 'Toàn bộ Shop')
                            : (conn.config.range || 'N/A')
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Render Telegram connections */}
                {filteredTelegramConnections.map(conn => (
                  <div key={conn.id} className="group bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] hover:border-sky-500/30 transition-all shadow-sm flex flex-col justify-between hover:shadow-md duration-200">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-11 h-11 rounded-[calc(var(--radius)*0.8)] flex items-center justify-center bg-sky-500/10 text-sky-500">
                          <Send size={20} />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] border border-transparent text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTelegramConnection(conn.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-[var(--text-1)] truncate">{conn.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-[calc(var(--radius)*0.4)] bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400">
                            Telegram Bot
                          </span>
                          <span className="text-[10px] text-[var(--text-3)]" suppressHydrationWarning>
                            {new Date(conn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-extrabold text-[var(--text-3)] uppercase tracking-tight">Chat ID</p>
                        <p className="text-xs font-semibold truncate text-[var(--text-2)]">
                          {conn.chatId}
                        </p>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-extrabold text-[var(--text-3)] uppercase tracking-tight">Trạng thái</p>
                        <p className="text-xs font-semibold truncate text-emerald-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Hoạt động
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Render active AI connections in summary card grid */}
                {filteredAiConnections.map(conn => (
                  <div key={conn.provider} className="group bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] hover:border-cyan-500/30 transition-all shadow-sm flex flex-col justify-between hover:shadow-md duration-200">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-11 h-11 rounded-[calc(var(--radius)*0.8)] flex items-center justify-center bg-cyan-500/10 text-cyan-500">
                          <Cpu size={20} />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)]" onClick={() => setFilterType('ai_insights')} title="Cấu hình">
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[calc(var(--radius)*0.6)] border border-transparent text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAIKey(conn.provider)} title="Gỡ Key">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-[var(--text-1)] truncate">
                          {conn.provider === 'gemini' ? 'Gemini 2.5 / 3.5 Flash' : conn.provider === 'gemini-pro' ? 'Gemini 2.5 Pro' : 'OpenAI GPT-4o'}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-[calc(var(--radius)*0.4)] bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                            Trợ lý AI
                          </span>
                          <span className="text-[10px] text-[var(--text-3)]">
                            Mã hóa AES-256
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-extrabold text-[var(--text-3)] uppercase tracking-tight">API Key</p>
                        <p className="text-xs font-semibold truncate text-[var(--text-2)] font-mono">
                          ••••••••••••***
                        </p>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-extrabold text-[var(--text-3)] uppercase tracking-tight">Trạng thái</p>
                        <p className="text-xs font-semibold truncate text-emerald-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Đã liên kết
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        /* --- AI Connections Management Tab View --- */
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={18} className="text-cyan-500" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-2)]">
              Quản lý khóa kết nối Trợ lý AI Key bảo mật
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: Gemini Flash */}
            {(() => {
              const conn = aiConnectionsList.find(c => c.provider === "gemini");
              const isEditing = editingAIProvider === "gemini";
              const isTesting = testingAIProvider === "gemini";

              return (
                <Card className="border border-[var(--border)] bg-[var(--bg-card)] shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)] animate-pulse">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <Badge className={conn?.hasKey 
                        ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold text-xs" 
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2.5 py-0.5 rounded-full font-medium text-xs"
                      }>
                        {conn?.hasKey ? "🟢 Hoạt động" : "⚪ Chưa cấu hình"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-[var(--text-1)] mt-4">
                      Gemini 2.5 / 3.5 Flash
                    </CardTitle>
                    <CardDescription className="text-[var(--text-3)] mt-1.5 text-xs leading-relaxed">
                      Siêu tốc độ, cực kỳ tiết kiệm chi phí. Model hoàn hảo chuyên biệt dành cho quét hàng loạt kênh rác ở Rada.
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-2 pb-6 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      {conn?.hasKey && !isEditing && (
                        <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                          <span className="font-mono text-xs text-[var(--text-3)] tracking-widest">AIzaSy••••••••••••***</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/5 border-emerald-500/10">Đã mã hóa</Badge>
                        </div>
                      )}

                      {isEditing && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-[var(--text-3)]" />
                            <Input 
                              type="password" 
                              placeholder="Nhập API Key..." 
                              value={aiApiKeyInput}
                              onChange={(e) => setAiApiKeyInput(e.target.value)}
                              className="pl-9 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { setEditingAIProvider(null); setAiApiKeyInput(""); }}
                              className="rounded-lg text-xs border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]"
                            >
                              Hủy
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveAIKey("gemini")}
                              disabled={isSavingAIKey || !aiApiKeyInput}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs border-0"
                            >
                              {isSavingAIKey && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              Lưu lại
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex gap-2 mt-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setEditingAIProvider("gemini"); setAiApiKeyInput(""); }}
                          className="flex-1 rounded-xl text-xs font-semibold border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]"
                        >
                          {conn?.hasKey ? "Cập nhật Key" : "Cài đặt Key"}
                        </Button>
                        {conn?.hasKey && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={isTesting}
                              onClick={() => handleTestAIConnection("gemini")}
                              className="rounded-xl px-3 border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                              title="Kiểm tra kết nối"
                            >
                              {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" /> : <Send className="h-3.5 w-3.5 text-[var(--text-3)]" />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAIKey("gemini")}
                              className="rounded-xl px-3 hover:bg-rose-950/20 text-rose-500 border-[var(--border)] hover:border-rose-900/30"
                              title="Xóa Key"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* CARD 2: Gemini Pro */}
            {(() => {
              const conn = aiConnectionsList.find(c => c.provider === "gemini-pro");
              const isEditing = editingAIProvider === "gemini-pro";
              const isTesting = testingAIProvider === "gemini-pro";

              return (
                <Card className="border border-[var(--border)] bg-[var(--bg-card)] shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
                        <Key className="h-6 w-6" />
                      </div>
                      <Badge className={conn?.hasKey 
                        ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold text-xs" 
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2.5 py-0.5 rounded-full font-medium text-xs"
                      }>
                        {conn?.hasKey ? "🟢 Hoạt động" : "⚪ Chưa cấu hình"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-[var(--text-1)] mt-4">
                      Gemini 2.5 Pro
                    </CardTitle>
                    <CardDescription className="text-[var(--text-3)] mt-1.5 text-xs leading-relaxed">
                      Phân tích thông minh với độ chính xác cao nhất. Phù hợp cho các kiểm định và tối ưu chiến dịch sâu.
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-2 pb-6 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      {conn?.hasKey && !isEditing && (
                        <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                          <span className="font-mono text-xs text-[var(--text-3)] tracking-widest">AIzaSy••••••••••••***</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/5 border-emerald-500/10">Đã mã hóa</Badge>
                        </div>
                      )}

                      {isEditing && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-[var(--text-3)]" />
                            <Input 
                              type="password" 
                              placeholder="Nhập API Key..." 
                              value={aiApiKeyInput}
                              onChange={(e) => setAiApiKeyInput(e.target.value)}
                              className="pl-9 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { setEditingAIProvider(null); setAiApiKeyInput(""); }}
                              className="rounded-lg text-xs border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]"
                            >
                              Hủy
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveAIKey("gemini-pro")}
                              disabled={isSavingAIKey || !aiApiKeyInput}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs border-0"
                            >
                              {isSavingAIKey && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              Lưu lại
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex gap-2 mt-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setEditingAIProvider("gemini-pro"); setAiApiKeyInput(""); }}
                          className="flex-1 rounded-xl text-xs font-semibold border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]"
                        >
                          {conn?.hasKey ? "Cập nhật Key" : "Cài đặt Key"}
                        </Button>
                        {conn?.hasKey && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={isTesting}
                              onClick={() => handleTestAIConnection("gemini-pro")}
                              className="rounded-xl px-3 border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                              title="Kiểm tra kết nối"
                            >
                              {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" /> : <Send className="h-3.5 w-3.5 text-[var(--text-3)]" />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAIKey("gemini-pro")}
                              className="rounded-xl px-3 hover:bg-rose-950/20 text-rose-500 border-[var(--border)] hover:border-rose-900/30"
                              title="Xóa Key"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* CARD 3: OpenAI */}
            {(() => {
              const conn = aiConnectionsList.find(c => c.provider === "openai");
              const isEditing = editingAIProvider === "openai";
              const isTesting = testingAIProvider === "openai";

              return (
                <Card className="border border-[var(--border)] bg-[var(--bg-card)] shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-550 shadow-[0_0_15px_rgba(59,130,246,0.08)]">
                        <Bot className="h-6 w-6" />
                      </div>
                      <Badge className={conn?.hasKey 
                        ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold text-xs" 
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2.5 py-0.5 rounded-full font-medium text-xs"
                      }>
                        {conn?.hasKey ? "🟢 Hoạt động" : "⚪ Chưa cấu hình"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-[var(--text-1)] mt-4">
                      OpenAI GPT-4o
                    </CardTitle>
                    <CardDescription className="text-[var(--text-3)] mt-1.5 text-xs leading-relaxed">
                      Linh hoạt cho đa dạng nghiệp vụ tối ưu và kết nối dịch vụ ngoại. Khuyên dùng model GPT-4o-mini tối ưu chi phí.
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-2 pb-6 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      {conn?.hasKey && !isEditing && (
                        <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                          <span className="font-mono text-xs text-[var(--text-3)] tracking-widest">sk-proj••••••••••••***</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/5 border-emerald-500/10">Đã mã hóa</Badge>
                        </div>
                      )}

                      {isEditing && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-[var(--text-3)]" />
                            <Input 
                              type="password" 
                              placeholder="Nhập API Key..." 
                              value={aiApiKeyInput}
                              onChange={(e) => setAiApiKeyInput(e.target.value)}
                              className="pl-9 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { setEditingAIProvider(null); setAiApiKeyInput(""); }}
                              className="rounded-lg text-xs border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]"
                            >
                              Hủy
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveAIKey("openai")}
                              disabled={isSavingAIKey || !aiApiKeyInput}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs border-0"
                            >
                              {isSavingAIKey && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              Lưu lại
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex gap-2 mt-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setEditingAIProvider("openai"); setAiApiKeyInput(""); }}
                          className="flex-1 rounded-xl text-xs font-semibold border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)]"
                        >
                          {conn?.hasKey ? "Cập nhật Key" : "Cài đặt Key"}
                        </Button>
                        {conn?.hasKey && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={isTesting}
                              onClick={() => handleTestAIConnection("openai")}
                              className="rounded-xl px-3 border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                              title="Kiểm tra kết nối"
                            >
                              {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" /> : <Send className="h-3.5 w-3.5 text-[var(--text-3)]" />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAIKey("openai")}
                              className="rounded-xl px-3 hover:bg-rose-950/20 text-rose-500 border-[var(--border)] hover:border-rose-900/30"
                              title="Xóa Key"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

          </div>
        </div>
      )}

      {/* --- Modals --- */}
      <PancakeModal 
        isOpen={isPancakeModalOpen} 
        onClose={() => { setIsPancakeModalOpen(false); setEditingConnection(null) }}
        onSave={handleSaveConnection}
        initialData={editingConnection}
      />

      <GoogleSheetModal 
        isOpen={isGSheetModalOpen} 
        onClose={() => { setIsGSheetModalOpen(false); setEditingConnection(null) }}
        onSave={handleSaveConnection}
        initialData={editingConnection}
      />

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => { setIsTelegramModalOpen(false); setEditingConnection(null) }}
        onSave={handleSaveTelegramConnection}
        initialData={editingConnection}
      />
    </div>
  )
}
