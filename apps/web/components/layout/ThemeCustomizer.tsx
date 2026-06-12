'use client'

import { X, Check, Sun, Moon, Maximize2, Minimize2 } from 'lucide-react'
import { useThemeCustomizer, ThemePreset, AccentColor } from '@/components/providers/ThemeProviderCustomizer'
import { useEffect, useState } from 'react'

interface ThemeCustomizerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const {
    themePreset,
    setThemePreset,
    accentColor,
    setAccentColor,
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

  const BASE_PRESETS = [
    { id: 'zinc', name: 'Zinc (Xám chì)', color: 'bg-zinc-500' },
    { id: 'slate', name: 'Slate (Xám đá)', color: 'bg-slate-500' },
    { id: 'stone', name: 'Stone (Xám cuội)', color: 'bg-stone-500' },
    { id: 'neutral', name: 'Neutral (Trung tính)', color: 'bg-neutral-400' }
  ] as const

  const ACCENT_COLORS = [
    { id: 'default', name: 'Mặc định', color: 'bg-foreground border border-border' },
    { id: 'blue', name: 'Xanh dương', color: 'bg-blue-500' },
    { id: 'green', name: 'Xanh lá', color: 'bg-emerald-500' },
    { id: 'orange', name: 'Cam', color: 'bg-orange-500' },
    { id: 'red', name: 'Đỏ', color: 'bg-red-500' }
  ] as const

  const RADII = [
    { value: '0px', label: '0px (Sắc cạnh)' },
    { value: '4px', label: '4px (Hiện đại)' },
    { value: '8px', label: '8px (Bo vừa)' },
    { value: '12px', label: '12px (Bo tròn)' }
  ]

  return (
    <div className="fixed inset-0 z-[1500] animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sliding Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold tracking-tight text-foreground">Cấu hình giao diện</h2>
            <p className="text-[10px] text-muted-foreground font-medium">Tùy biến không gian làm việc của bạn</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-0 bg-transparent p-1 rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          
          {/* Section: Light/Dark Mode */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chế độ hiển thị</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleThemeMode('light')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'border-primary bg-secondary text-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Sun size={14} className="text-amber-500" />
                Giao diện Sáng
              </button>
              <button
                onClick={() => toggleThemeMode('dark')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'border-primary bg-secondary text-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Moon size={14} className="text-sky-400" />
                Giao diện Tối
              </button>
            </div>
          </div>

          {/* Section: Base Preset Themes */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chủ đề nền (Base theme)</h3>
            <div className="grid grid-cols-2 gap-2">
              {BASE_PRESETS.map(preset => {
                const isActive = themePreset === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => setThemePreset(preset.id)}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-secondary text-foreground shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ${preset.color}`} />
                    <span className="truncate">{preset.name.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Accent Colors */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Màu điểm nhấn (Accent color)</h3>
            <div className="grid grid-cols-2 gap-2">
              {ACCENT_COLORS.map(color => {
                const isActive = accentColor === color.id
                return (
                  <button
                    key={color.id}
                    onClick={() => setAccentColor(color.id)}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-secondary text-foreground shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ${color.color}`} />
                    <span className="truncate">{color.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Radius Bo góc */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Độ bo góc (Radius)</h3>
            <div className="grid grid-cols-2 gap-2">
              {RADII.map(item => {
                const isActive = radius === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => setRadius(item.value)}
                    className={`py-2 px-2.5 rounded-lg border text-center text-[10px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-secondary text-foreground shadow-sm'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Content Width Khung chứa */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Khung nội dung (Layout Width)</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setContentWidth('compact')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 text-[10px] font-bold transition-all cursor-pointer ${
                  contentWidth === 'compact'
                    ? 'border-primary bg-secondary text-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                <Minimize2 size={13} />
                Boxed (Hộp)
              </button>
              <button
                onClick={() => setContentWidth('wide')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 text-[10px] font-bold transition-all cursor-pointer ${
                  contentWidth === 'wide'
                    ? 'border-primary bg-secondary text-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                <Maximize2 size={13} />
                Wide (Tràn viền)
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border bg-secondary/30 text-center text-[9px] text-muted-foreground font-semibold shrink-0 uppercase tracking-widest">
          NNHD Ads Manager v1.0 • Built with AI
        </div>

      </div>
    </div>
  )
}
