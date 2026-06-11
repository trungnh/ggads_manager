'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, ChevronDown, Sun, Moon, Paintbrush } from 'lucide-react'
import ThemeCustomizer from './ThemeCustomizer'

export default function Topnav() {
  const [loading, setLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState('vừa xong')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)

  // Đọc theme từ localStorage khi mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  // Chuyển đổi theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleGlobalSync = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts/sync', { method: 'POST' })
      if (res.ok) {
        setLastSynced('vừa xong')
        window.location.reload() // Reload to reflect new accounts
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="h-[52px] bg-[var(--bg-card)] border-b border-[var(--border)] flex justify-end items-center px-5 gap-3 shrink-0 transition-colors duration-200">
      {/* Breadcrumb */}
	  {/*
      <div className="flex items-center gap-1.5 flex-1 text-xs text-[var(--text-3)] font-medium">
        <span>Tài khoản</span>
        <ChevronDown size={11} className="text-[var(--text-3)]" />
        <span className="text-[var(--text-1)] font-semibold tracking-wide">
          Tất cả tài khoản
        </span>
      </div>*/}

      {/* Actions */}
      <div className="flex items-center gap-2.5">

        {/* Theme Switcher Button */}
        <button 
          onClick={toggleTheme}
          className="p-1.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)]/80 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] active:scale-[0.96] transition-all"
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={12.5} className="text-amber-500" /> : <Moon size={12.5} className="text-sky-400" />}
        </button>

        {/* Theme Customizer Trigger */}
        <button 
          onClick={() => setIsCustomizerOpen(true)}
          className="p-1.5 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)]/80 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] active:scale-[0.96] transition-all"
          title="Tùy biến giao diện"
        >
          <Paintbrush size={12.5} className="text-[var(--primary)]" />
        </button>

        {/* Sync status */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-2)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2.5 py-1.5 rounded-[calc(var(--radius)*0.8)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] inline-block animate-pulse" />
          <span>Đồng bộ {lastSynced}</span>
        </div>

        {/* Sync button */}
		{/*
        <button 
          onClick={handleGlobalSync}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] px-3.5 py-1.5 rounded-[calc(var(--radius)*0.8)] bg-[var(--primary)] hover:opacity-90 text-[var(--bg-card)] font-bold shadow-sm transition-all duration-200 active:scale-[0.98] border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
        >
          <RefreshCw size={11.5} className={`shrink-0 transition-transform ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Đang đồng bộ...' : 'Sync ngay'}</span>
        </button>
		*/}
      </div>

      <ThemeCustomizer 
        isOpen={isCustomizerOpen} 
        onClose={() => setIsCustomizerOpen(false)} 
      />
    </header>
  )
}
