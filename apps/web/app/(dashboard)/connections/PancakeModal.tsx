'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, RefreshCw, Check, Package, Search, Key, Plus, Database } from 'lucide-react'
import PancakeAccountModal from './PancakeAccountModal'

interface PancakeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData?: any
}

export default function PancakeModal({ isOpen, onClose, onSave, initialData }: PancakeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    pancakeAccountId: '',
    productDisplayId: '', // comma separated IDs
    excludedTags: [] as string[],
    calcInUsd: false,
    usdRate: '25450'
  })
  
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  
  const [loadingTags, setLoadingTags] = useState(false)
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([])

  const [loadingProducts, setLoadingProducts] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
    }
  }, [isOpen])

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        pancakeAccountId: initialData.pancakeAccountId || '',
        productDisplayId: initialData.config?.productDisplayId || '',
        excludedTags: initialData.config?.excludedTags || [],
        calcInUsd: initialData.config?.calcInUsd || false,
        usdRate: initialData.config?.usdRate || '25450'
      })
    } else {
      setFormData({
        name: '',
        pancakeAccountId: '',
        productDisplayId: '',
        excludedTags: [],
        calcInUsd: false,
        usdRate: '25450'
      })
      setAvailableTags([])
      setAvailableProducts([])
    }
  }, [initialData, isOpen])

  // Auto-load tags and products when editing
  useEffect(() => {
    if (isOpen && initialData?.pancakeAccountId && accounts.length > 0) {
      const account = accounts.find(a => a.id === initialData.pancakeAccountId)
      if (account) {
        fetchTags(account)
        fetchProducts(account.id)
      }
    }
  }, [isOpen, accounts.length, initialData?.pancakeAccountId])

  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch('/api/crm/pancake-accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
        // If editing and we have an ID, or if we have at least one account and none selected
        if (initialData?.pancakeAccountId) {
           setFormData(prev => ({ ...prev, pancakeAccountId: initialData.pancakeAccountId }))
        }
      }
    } catch (e) {
      console.error('Fetch accounts failed', e)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchTags = async (overrideAccount?: any) => {
    // If overrideAccount is a React click event, ignore it to prevent overriding with the event object
    const isEvent = overrideAccount && (overrideAccount.target || overrideAccount.nativeEvent || typeof overrideAccount.preventDefault === 'function');
    const account = (!isEvent && overrideAccount) || accounts.find(a => a.id === formData.pancakeAccountId)
    if (!account) return

    setLoadingTags(true)
    try {
      const res = await fetch('/api/crm/pancake/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: account.shopId, apiKey: account.apiKey })
      })

      let data
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      } else {
        const text = await res.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { error: text }
        }
      }

      if (res.ok) {
        setAvailableTags(data)
      } else {
        // Only alert if manually triggered
        if (!overrideAccount || isEvent) {
          alert(data.error || 'Không thể lấy danh sách thẻ. Vui lòng kiểm tra API Key.')
        }
      }
    } catch (error) {
      console.error('Failed to fetch tags', error)
    } finally {
      setLoadingTags(false)
    }
  }

  const fetchProducts = async (overrideAccountId?: string) => {
    const accountId = overrideAccountId || formData.pancakeAccountId
    if (!accountId) return
    
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/crm/pancake/products?accountId=${accountId}`)
      const result = await res.json()
      
      if (res.ok) {
        const productsList = result.data || result.products || (Array.isArray(result) ? result : [])
        setAvailableProducts(productsList)
      } else {
        if (!overrideAccountId) {
          alert(result.error || 'Không thể lấy danh sách sản phẩm. Vui lòng kiểm tra API Key.')
        }
      }
    } catch (e) {
      console.error('Failed to fetch products', e)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.pancakeAccountId) {
      alert("Vui lòng chọn hoặc thêm tài khoản Pancake")
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initialData?.id,
          name: formData.name,
          pancakeAccountId: formData.pancakeAccountId,
          type: 'pancake',
          config: {
            productDisplayId: formData.productDisplayId,
            excludedTags: formData.excludedTags,
            calcInUsd: formData.calcInUsd,
            usdRate: formData.usdRate
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

  const toggleProduct = (productId: string) => {
    const ids = formData.productDisplayId ? formData.productDisplayId.split(',').filter(id => id.trim()) : []
    const newIds = ids.includes(productId)
      ? ids.filter(id => id !== productId)
      : [...ids, productId]
    
    setFormData(prev => ({ ...prev, productDisplayId: newIds.join(',') }))
  }

  const toggleTag = (tagName: string) => {
    setFormData(prev => ({
      ...prev,
      excludedTags: prev.excludedTags.includes(tagName)
        ? prev.excludedTags.filter(t => t !== tagName)
        : [...prev.excludedTags, tagName]
    }))
  }

  const filteredProducts = availableProducts.filter(p => {
    const pName = (p.name || p.display_name || '').toLowerCase()
    const pSku = (p.sku || '').toLowerCase()
    const search = productSearch.toLowerCase()
    return pName.includes(search) || pSku.includes(search)
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] w-full max-w-[650px] max-h-[90vh] rounded-[var(--radius)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[calc(var(--radius)*0.8)] bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold m-0 leading-tight">Kết nối Pancake POS</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors p-2 rounded-full hover:bg-[var(--bg-secondary)] border-0 bg-transparent cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Account Selector Section */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Chọn tài khoản Pancake</label>
            <div className="flex flex-wrap gap-2">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, pancakeAccountId: acc.id }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-[calc(var(--radius)*0.8)] border transition-all text-xs font-medium cursor-pointer ${
                    formData.pancakeAccountId === acc.id 
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] shadow-sm' 
                    : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  <Key size={14} className={formData.pancakeAccountId === acc.id ? 'text-[var(--primary)]' : 'text-[var(--text-3)]'} />
                  {acc.name} ({acc.shopId})
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-[calc(var(--radius)*0.8)] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-2)] hover:border-[var(--primary)]/50 transition-all text-xs font-medium cursor-pointer"
              >
                <Plus size={14} />
                Thêm tài khoản mới
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Tên kết nối</label>
            <input
              type="text" required placeholder="Ví dụ: Giày Nam - Camp KR"
              className="w-full px-3 py-2.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Product Selector */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Sản phẩm áp dụng</label>
              <button
                type="button"
                onClick={() => fetchProducts()}
                disabled={loadingProducts || !formData.pancakeAccountId}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:opacity-80 disabled:opacity-30 transition-all border-0 bg-transparent cursor-pointer"
              >
                {loadingProducts ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                Load danh sách sản phẩm
              </button>
            </div>

            {availableProducts.length > 0 && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" size={14} />
                  <input 
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-3)] px-1">
                  Đã tải {availableProducts.length} sản phẩm. 
                  {productSearch && ` Khớp: ${filteredProducts.length}`}
                </p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 p-4 bg-[var(--bg-secondary)] rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] min-h-[100px] max-h-[300px] overflow-y-auto">
              {availableProducts.length === 0 ? (
                <p className="text-[11px] text-[var(--text-3)] m-auto italic">Chưa có sản phẩm nào. Vui lòng chọn tài khoản và bấm "Load danh sách sản phẩm".</p>
              ) : (
                filteredProducts.map((p, idx) => {
                  const pId = p.id || p.variation_id || p.product_id;
                  const pName = p.name || p.display_name || 'Sản phẩm không tên';
                  const isSelected = pId ? formData.productDisplayId.split(',').includes(pId.toString()) : false;
                  
                  return (
                    <button
                      key={pId || idx}
                      type="button"
                      onClick={() => pId && toggleProduct(pId.toString())}
                      className={`px-3 py-2 rounded-[calc(var(--radius)*0.8)] text-[11px] font-medium border transition-all flex flex-col items-start gap-0.5 text-left cursor-pointer ${
                        isSelected 
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm' 
                        : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:border-[var(--primary)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span className="font-bold">{pName}</span>
                      </div>
                      <span className={`text-[9px] opacity-70 font-mono ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-3)]'}`}>
                        Mã: {p.custom_id || p.sku || 'N/A'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Tags Excluder */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">Loại trừ thẻ đơn hàng</label>
              <button
                type="button"
                onClick={() => fetchTags()}
                disabled={loadingTags || !formData.pancakeAccountId}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:opacity-80 disabled:opacity-30 transition-all border-0 bg-transparent cursor-pointer"
              >
                {loadingTags ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Load các thẻ
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 p-4 bg-[var(--bg-secondary)] rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] min-h-[80px]">
              {availableTags.length === 0 ? (
                <p className="text-[11px] text-[var(--text-3)] m-auto italic">Bấm "Load các thẻ" để hiển thị danh sách thẻ đơn hàng.</p>
              ) : (
                availableTags.map(tag => {
                  const isExcluded = formData.excludedTags.includes(tag.name)
                  return (
                    <button
                      key={tag.id} type="button" onClick={() => toggleTag(tag.name)}
                      className={`px-3 py-1.5 rounded-[calc(var(--radius)*0.6)] text-[11px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isExcluded 
                        ? 'border-destructive/50 bg-destructive/10 text-destructive' 
                        : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:border-[var(--primary)]/50'
                      }`}
                    >
                      {isExcluded && <Check size={12} strokeWidth={3} />}
                      {tag.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 bg-[var(--bg-secondary)] p-5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)]">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-bold text-[var(--text-1)]">Tính toán bằng USD</div>
                <div className="text-[11px] text-[var(--text-3)]">Bật nếu shop tính tiền đơn hàng theo USD</div>
              </div>
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded cursor-pointer accent-[var(--primary)]"
                checked={formData.calcInUsd} 
                onChange={e => setFormData({ ...formData, calcInUsd: e.target.checked })} 
              />
            </div>

            {formData.calcInUsd && (
              <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4 animate-in slide-in-from-top-1">
                <label className="text-xs font-semibold text-[var(--text-2)] flex-shrink-0 uppercase tracking-tight">Tỉ giá USD/VND:</label>
                <input 
                  type="number" 
                  className="flex-1 px-3 py-2 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-mono"
                  value={formData.usdRate} 
                  onChange={e => setFormData({ ...formData, usdRate: e.target.value })} 
                />
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-[var(--bg-card)] py-4 border-t border-[var(--border)]">
            <button 
              type="button" onClick={onClose} 
              className="flex-1 py-3 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-transparent font-semibold text-[var(--text-2)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button 
              type="submit" disabled={loading} 
              className="flex-1 py-3 rounded-[calc(var(--radius)*0.8)] bg-[var(--text-1)] text-[var(--bg-card)] font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 border-0 cursor-pointer"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Đang lưu...' : 'Lưu kết nối'}
            </button>
          </div>
        </form>
      </div>

      <PancakeAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={(acc) => {
          setAccounts(prev => [...prev, acc])
          setFormData(prev => ({ ...prev, pancakeAccountId: acc.id }))
        }}
      />
    </div>
  )
}
