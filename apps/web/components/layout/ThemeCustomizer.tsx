'use client'

import { X, Check, Sun, Moon, Maximize2, Minimize2 } from 'lucide-react'
import { useThemeCustomizer } from '@/components/providers/ThemeProviderCustomizer'
import { useEffect, useState } from 'react'

interface ThemeCustomizerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const {
    themePreset,
    setThemePreset,
    radius,
    setRadius,
    contentWidth,
    setContentWidth
  } = useThemeCustomizer()

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) {
      setThemeMode(saved)
    }
  }, [isOpen])

  const toggleThemeMode = (mode: 'light' | 'dark') => {
    setThemeMode(mode)
    localStorage.setItem('theme', mode)
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (!isOpen) return null

  const PRESETS = [
    { id: 'neutral', name: 'Neutral (Slate)', color: 'bg-slate-500' },
    { id: 'tangerine', name: 'Tangerine (Quất)', color: 'bg-orange-500' },
    { id: 'brutalist', name: 'Brutalist (Stark)', color: 'bg-black dark:bg-white' },
    { id: 'softpop', name: 'Soft Pop (Teal)', color: 'bg-teal-500' }
  ] as const

  const RADII = [
    { value: '0px', label: '0px (Sharp)' },
    { value: '8px', label: '8px (Modern)' },
    { value: '12px', label: '12px (Premium)' },
    { value: '16px', label: '16px (Soft)' }
  ]

  return (
    <div className="fixed inset-0 z-[1500] animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sliding Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)] shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-1)]">Tùy biến giao diện</h2>
            <p className="text-[10px] text-[var(--text-3)] font-medium">Thiết kế không gian làm việc của bạn</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          
          {/* Section: Light/Dark Mode */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-2)]">Chế độ hiển thị</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => toggleThemeMode('light')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'border-primary bg-[var(--bg-secondary)] text-[var(--text-1)] shadow-sm'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                <Sun size={14} className="text-amber-500" />
                Giao diện Sáng
              </button>
              <button
                onClick={() => toggleThemeMode('dark')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'border-primary bg-[var(--bg-secondary)] text-[var(--text-1)] shadow-sm'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                <Moon size={14} className="text-sky-400" />
                Giao diện Tối
              </button>
            </div>
          </div>

          {/* Section: Color Presets */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-2)]">Bộ màu sắc (Color Presets)</h3>
            <div className="space-y-2">
              {PRESETS.map(preset => {
                const isActive = themePreset === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => setThemePreset(preset.id)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-[var(--bg-secondary)] text-[var(--text-1)] shadow-sm'
                        : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded-full shrink-0 shadow-sm ${preset.color}`} />
                      <span className="truncate">{preset.name}</span>
                    </div>
                    {isActive && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Radius Bo góc */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-2)]">Độ bo góc (Radius)</h3>
            <div className="grid grid-cols-2 gap-2">
              {RADII.map(item => {
                const isActive = radius === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => setRadius(item.value)}
                    className={`py-2 px-2.5 rounded-lg border text-center text-[10px] font-extrabold transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-[var(--bg-secondary)] text-[var(--text-1)] shadow-sm'
                        : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Content Width Khung chứa */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-2)]">Khung nội dung (Layout Width)</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setContentWidth('compact')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-extrabold transition-all cursor-pointer ${
                  contentWidth === 'compact'
                    ? 'border-primary bg-[var(--bg-secondary)] text-[var(--text-1)] shadow-sm'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                <Minimize2 size={13} />
                Boxed (Hộp)
              </button>
              <button
                onClick={() => setContentWidth('wide')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-extrabold transition-all cursor-pointer ${
                  contentWidth === 'wide'
                    ? 'border-primary bg-[var(--bg-secondary)] text-[var(--text-1)] shadow-sm'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                <Maximize2 size={13} />
                Wide (Tràn viền)
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-center text-[9px] text-[var(--text-3)] font-semibold shrink-0 uppercase tracking-widest">
          NNHD Ads Manager v1.0 • Built with AI
        </div>

      </div>
    </div>
  )
}
