'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Sun, Moon, Paintbrush, ChevronDown, User, LogOut, Settings, RefreshCw, Menu } from 'lucide-react'
import ThemeCustomizer from './ThemeCustomizer'
import { cn } from "@/lib/utils"

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Bảng tổng quan',
  revenue: 'Báo cáo Doanh thu',
  campaigns: 'Chiến dịch Ads',
  rules: 'Quy tắc tự động',
  dayparting: 'Lập lịch chạy thầu',
  schedules: 'Lịch chạy biểu',
  optimizer: 'Budget Optimizer',
  placements: 'Rada Diệt Kênh Rác',
  accounts: 'Tài khoản Ads',
  products: 'Sản phẩm',
  connections: 'Quản lý kết nối',
  settings: 'Cài đặt hệ thống',
  admin: 'Quản trị hệ thống',
  users: 'Quản lý Users',
  logs: 'Nhật ký hệ thống',
  queues: 'Hàng chờ BullMQ',
  edit: 'Chỉnh sửa',
  new: 'Tạo mới',
}

interface TopnavProps {
  onMenuClick?: () => void;
}

export default function Topnav({ onMenuClick }: TopnavProps = {}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Listen to dynamic route label updates (e.g. mapping UUIDs to entity names)
  useEffect(() => {
    const handleUpdate = () => {
      if (typeof window !== 'undefined' && (window as any).__dynamicRouteLabels) {
        setDynamicLabels({ ...(window as any).__dynamicRouteLabels })
      }
    }
    handleUpdate()
    window.addEventListener('dynamic-route-labels-updated', handleUpdate)
    return () => window.removeEventListener('dynamic-route-labels-updated', handleUpdate)
  }, [])

  // Đọc theme từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      setTheme('light')
    }
  }, [])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  // Parse path to breadcrumbs
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean)
    return parts.map((part) => ROUTE_LABELS[part] || dynamicLabels[part] || part)
  }

  const breadcrumbs = getBreadcrumbs()
  const username = session?.user?.name || session?.user?.email || 'User'
  const email = session?.user?.email || 'user@example.com'
  const firstLetter = username.charAt(0).toUpperCase()

  return (
    <header className="h-[56px] px-5 border-b border-border flex justify-between items-center bg-card/65 backdrop-blur-md shrink-0 z-10 transition-colors duration-150">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-1.5 -ml-1 mr-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground md:hidden cursor-pointer shrink-0"
            title="Mở menu"
          >
            <Menu size={16} />
          </button>
        )}
        <span className="hidden sm:inline">Hệ thống</span>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <span key={index} className={cn("items-center gap-1.5 min-w-0", isLast ? "flex" : "hidden md:flex")}>
              <span className={cn("text-[10px] text-muted-foreground/50", isLast ? "hidden sm:inline" : "hidden md:inline")}>/</span>
              <span className={isLast ? "text-foreground font-semibold truncate" : "truncate"}>
                {crumb}
              </span>
            </span>
          );
        })}
      </div>

      {/* ── Actions & Profile ── */}
      <div className="flex items-center gap-3">
        {/* Sync Status Badge */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/60 border border-border px-2.5 py-1 rounded-full shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] inline-block animate-pulse" />
          <span>Hệ thống đồng bộ</span>
        </div>

        {/* Theme Switcher Button */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-all active:scale-[0.96]"
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-sky-400" />}
        </button>

        {/* Theme Customizer Trigger */}
        <button 
          onClick={() => setIsCustomizerOpen(true)}
          className="p-2 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-all active:scale-[0.96]"
          title="Tùy biến giao diện"
        >
          <Paintbrush size={14} className="text-primary" />
        </button>

        {/* ── User Profile Dropdown ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 p-1 rounded-full border border-border hover:bg-secondary/50 transition-all cursor-pointer"
          >
            {/* Avatar circle */}
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
              {firstLetter}
            </div>
            <ChevronDown size={12} className="text-muted-foreground pr-0.5" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User info info */}
              <div className="px-3 py-2 border-b border-border mb-1.5">
                <p className="text-xs font-bold text-foreground truncate">{username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{email}</p>
              </div>

              {/* Links */}
              <Link
                href="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                <Settings size={14} />
                <span>Cài đặt cá nhân</span>
              </Link>

              {/* Logout */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-all border-0 text-left cursor-pointer"
              >
                <LogOut size={14} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ThemeCustomizer 
        isOpen={isCustomizerOpen} 
        onClose={() => setIsCustomizerOpen(false)} 
      />
    </header>
  )
}
