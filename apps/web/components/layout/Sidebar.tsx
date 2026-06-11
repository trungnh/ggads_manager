'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Megaphone,
  Sliders,
  Clock,
  Sparkles,
  TrendingUp,
  Calendar,
  LineChart,
  Package,
  Settings,
  LogOut,
  Link as LinkIcon,
  Users,
  Terminal,
  Cpu,
  FolderSync,
  ChevronLeft,
  ChevronRight,
  Radar
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useThemeCustomizer } from '@/components/providers/ThemeProviderCustomizer'

// ── Cấu trúc nav items được tổ chức khoa học ──────────────────────
const NAV = [
  {
    section: 'Báo cáo & Phân tích',
    items: [
      { href: '/dashboard',   icon: LayoutGrid,  label: 'Bảng tổng quan' },
      { href: '/revenue',     icon: LineChart,   label: 'Báo cáo Doanh thu' },
    ],
  },
  {
    section: 'Tối ưu Chiến dịch',
    items: [
      { href: '/campaigns',   icon: Megaphone,   label: 'Chiến dịch Ads',   badge: '4 active',   badgeColor: 'green' },
      { href: '/rules',       icon: Sliders,     label: 'Quy tắc tự động',      badge: '0 active',  badgeColor: 'green' },
      { href: '/dayparting',  icon: Clock,       label: 'Lập lịch' },
      { href: '/schedules',   icon: Calendar,    label: 'Lịch chạy biểu' },
    ],
  },
  {
    section: 'AI Integration',
    items: [
      { href: '/optimizer/placements', icon: Radar, label: 'Rada Diệt Kênh Rác'},
      { href: '/optimizer',   icon: TrendingUp,  label: 'Budget Optimizer'},
    ],
  },
  {
    section: 'Cấu hình & Tích hợp',
    items: [
      { href: '/accounts',    icon: FolderSync,  label: 'Tài khoản Ads' },
      { href: '/products',    icon: Package,     label: 'Sản phẩm' },
      { href: '/connections', icon: LinkIcon,    label: 'Quản lý kết nối' },
    ],
  },
  {
    section: 'Quản trị hệ thống',
    items: [
      { href: '/admin/users',  icon: Users,       label: 'Quản lý Users' },
      { href: '/admin/logs',   icon: Terminal,    label: 'Nhật ký hệ thống' },
      { href: '/admin/queues', icon: Cpu,         label: 'Hàng chờ BullMQ' },
    ],
  },
]

// ── Badge màu theo type (Hỗ trợ đa theme) ──
const BADGE_CLASSES: Record<string, string> = {
  green:  'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30',
  blue:   'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/50 dark:border-sky-900/30',
  amber:  'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useThemeCustomizer()
  const [stats, setStats] = useState({ campaignsCount: 4, rulesCount: 8 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/sidebar/stats')
        if (res.ok) {
          const data = await res.json()
          setStats({
            campaignsCount: data.campaignsCount ?? 4,
            rulesCount: data.rulesCount ?? 8
          })
        }
      } catch (err) {
        console.error('Failed to fetch sidebar stats:', err)
      }
    }
    fetchStats()
  }, [])

  return (
    <aside 
      className={`shrink-0 h-screen bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-[64px]' : 'w-[230px]'
      }`}
    >
      {/* ── Logo ── */}
      <div 
        className={`h-[52px] flex items-center border-b border-[var(--border)] shrink-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'px-0 justify-center' : 'px-4 gap-2.5'
        }`}
      >
        {/* Logo mark */}
        <div className="w-6 h-6 rounded-[calc(var(--radius)*0.6)] bg-[var(--primary)] flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--primary)]/30">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="currentColor" className="text-[var(--bg-card)]" />
          </svg>
        </div>
        {!isSidebarCollapsed && (
          <>
            <span className="text-[12.5px] font-bold text-[var(--text-1)] tracking-wide truncate">
              Google Ads Manager
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[calc(var(--radius)*0.4)] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 ml-auto tracking-wider uppercase">
              AI
            </span>
          </>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.section} className="space-y-1">
            {/* Section label */}
            <div 
              className={`px-4 pb-1 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest transition-all duration-200 ${
                isSidebarCollapsed ? 'opacity-0 h-0 py-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              {group.section}
            </div>

            {/* Nav items */}
            <div className="px-2 space-y-[2px]">
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center rounded-[calc(var(--radius)*0.6)] text-xs font-semibold transition-all duration-200 ${
                      isSidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'
                    } ${
                      isActive 
                        ? 'text-[var(--primary)] bg-[var(--bg-secondary)] border-l-2 border-[var(--primary)] shadow-[0_0_10px_var(--primary)]/5' 
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)]/50 hover:translate-x-[2px]'
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon
                      size={isSidebarCollapsed ? 17 : 14.5}
                      className={`shrink-0 transition-colors duration-200 ${
                        isActive 
                          ? 'text-[var(--primary)] opacity-100 drop-shadow-[0_0_4px_var(--primary)]/30' 
                          : 'opacity-65 group-hover:opacity-100 text-[var(--text-3)]'
                      }`}
                    />
                    {!isSidebarCollapsed && <span className="flex-1 min-w-0 truncate">{item.label}</span>}

                    {/* Badge */}
                    {!isSidebarCollapsed && (item.badge || item.label === 'Chiến dịch Ads' || item.label === 'Quy tắc tự động') && (
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-[calc(var(--radius)*0.4)] shrink-0 ${BADGE_CLASSES[item.badgeColor || 'green']}`}>
                        {item.label === 'Chiến dịch Ads' 
                          ? `${stats.campaignsCount} active`
                          : item.label === 'Quy tắc tự động'
                            ? `${stats.rulesCount} active`
                            : item.badge
                        }
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer: Settings + User ── */}
      <div className="p-2 border-t border-[var(--border)] shrink-0 space-y-1 bg-[var(--bg-secondary)]/30">
        
        {/* Toggle Collapse Trigger */}
        <div 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`flex items-center rounded-[calc(var(--radius)*0.6)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer text-xs font-semibold ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-2.5'
          }`}
          title={isSidebarCollapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Thu gọn Menu</span>
            </>
          )}
        </div>

        <Link
          href="/settings"
          className={`flex items-center rounded-[calc(var(--radius)*0.6)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-secondary)] transition-all text-xs font-semibold ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-2.5'
          }`}
          title={isSidebarCollapsed ? "Cài đặt hệ thống" : undefined}
        >
          <Settings size={isSidebarCollapsed ? 16 : 14.5} className="opacity-65 text-[var(--text-3)]" />
          {!isSidebarCollapsed && <span>Cài đặt hệ thống</span>}
        </Link>

        {/* Logout */}
        <div 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`flex items-center rounded-[calc(var(--radius)*0.6)] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-all text-xs font-semibold cursor-pointer ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-2.5'
          }`}
          title={isSidebarCollapsed ? "Đăng xuất" : undefined}
        >
          <LogOut size={isSidebarCollapsed ? 16 : 14.5} />
          {!isSidebarCollapsed && <span>Đăng xuất</span>}
        </div>
      </div>
    </aside>
  )
}
