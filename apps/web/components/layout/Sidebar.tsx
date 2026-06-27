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
  ChevronLeft,
  ChevronRight,
  Radar,
  Activity,
  BookOpen
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useThemeCustomizer } from '@/components/providers/ThemeProviderCustomizer'
import { cn } from '@/lib/utils'

// ── Cấu trúc nav items được tổ chức khoa học ──────────────────────
const NAV = [
  {
    section: 'Báo cáo & Phân tích',
    items: [
      { href: '/dashboard',   icon: LayoutGrid,  label: 'Bảng tổng quan' },
      { href: '/revenue',     icon: LineChart,   label: 'Thống kê Doanh thu' },
    ],
  },
  {
    section: 'Tối ưu Chiến dịch',
    items: [
      { href: '/campaigns',   icon: Megaphone,   label: 'Chiến dịch Ads' },
      { href: '/rules',       icon: Sliders,     label: 'Quy tắc tự động' },
      { href: '/dayparting',  icon: Clock,       label: 'Lập lịch' },
      { href: '/schedules',   icon: Calendar,    label: 'Lịch chạy biểu' },
    ],
  },
  {
    section: 'AI Integration',
    items: [
      { href: '/analyst',     icon: Activity,    label: 'AI Analyst' },
      { href: '/optimizer/placements', icon: Radar, label: 'Rada Diệt Kênh Rác'},
      //{ href: '/optimizer',   icon: TrendingUp,  label: 'Budget Optimizer'},
    ],
  },
  {
    section: 'Cấu hình & Tích hợp',
    items: [
      { href: '/accounts',    icon: FolderSyncIcon,  label: 'Đồng bộ TK Ads' },
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

// Custom FolderSync Icon since FolderSync isn't in older lucide versions
function FolderSyncIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3.5" />
      <path d="M12 10v4h4" />
      <path d="M12 14 10 12" />
      <path d="M22 19v-4h-4" />
      <path d="M22 15 20 17" />
      <circle cx="17" cy="17" r="3" />
    </svg>
  )
}

// ── Badge màu theo type ──
const BADGE_CLASSES: Record<string, string> = {
  green:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  blue:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  amber:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
}

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export default function Sidebar({ className, onClose }: SidebarProps = {}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useThemeCustomizer()
  const [stats, setStats] = useState({ campaignsCount: 4, rulesCount: 8 })
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Lọc menu items dựa trên vai trò của người dùng
  const filteredNav = NAV.filter((group) => {
    if (group.section === 'Quản trị hệ thống') {
      return session?.user?.role === 'admin' || session?.user?.role === 'superadmin'
    }
    return true
  })

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
      className={cn(
        "shrink-0 h-screen bg-card border-r border-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out z-20",
        isSidebarCollapsed ? 'w-[70px]' : 'w-[240px]',
        className
      )}
    >
      {/* ── Header Logo ── */}
      <div className="h-[56px] px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo Mark */}
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground tracking-tight truncate">
                Ads Manager
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate">
                Automated AI Suite
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {filteredNav.map((group) => (
          <div key={group.section} className="space-y-1.5">
            {/* Section label */}
            {!isSidebarCollapsed ? (
              <div className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.section}
              </div>
            ) : (
              <div className="h-px bg-border my-2 mx-1" />
            )}

            {/* Nav items */}
            <div className="space-y-[4px]">
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon

                // Dynamic counts for specific pages
                let badgeText = ''
                if (item.label === 'Chiến dịch Ads') {
                  badgeText = `${stats.campaignsCount} active`
                } else if (item.label === 'Quy tắc tự động') {
                  badgeText = `${stats.rulesCount} active`
                }

                return (
                  <div
                    key={item.href}
                    className="relative flex items-center"
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      href={item.href}
                      onClick={() => onClose?.()}
                      className={`w-full flex items-center rounded-md text-xs font-medium transition-all duration-150 ${
                        isSidebarCollapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2'
                      } ${
                        isActive 
                          ? 'text-foreground bg-secondary font-semibold border-l-2 border-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                      }`}
                    >
                      <Icon
                        size={isSidebarCollapsed ? 18 : 16}
                        className={`shrink-0 transition-colors duration-150 ${
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      />
                      {!isSidebarCollapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}

                      {/* Badge in expanded mode */}
                      {!isSidebarCollapsed && badgeText && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${BADGE_CLASSES.green}`}>
                          {badgeText}
                        </span>
                      )}
                    </Link>

                    {/* Left Active Indicator Bar (when collapsed) */}
                    {isSidebarCollapsed && isActive && (
                      <div className="absolute left-0 w-1 h-5 rounded-r-full bg-primary" />
                    )}

                    {/* Collapsed Tooltip */}
                    {isSidebarCollapsed && hoveredItem === item.href && (
                      <div className="absolute left-[56px] z-50 px-2.5 py-1.5 text-[11px] font-medium text-popover-foreground bg-popover border border-border rounded-md shadow-md whitespace-nowrap pointer-events-none transition-all animate-in fade-in slide-in-from-left-2 duration-150">
                        {item.label}
                        {badgeText && (
                          <span className="ml-1.5 text-[9px] text-emerald-500 font-bold">
                            ({badgeText})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer / Actions ── */}
      <div className="p-3 border-t border-border shrink-0 space-y-1 bg-secondary/20">
        {/* Toggle Collapse Trigger */}
        <div 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`flex items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer text-xs font-medium ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-3'
          }`}
          title={isSidebarCollapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Thu gọn Menu</span>
            </>
          )}
        </div>

        {/* User Guide */}
        <Link
          href="/guide"
          onClick={() => onClose?.()}
          className={`flex items-center rounded-md transition-all text-xs font-medium ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-3'
          } ${
            pathname === '/guide'
              ? 'text-foreground bg-secondary font-semibold border-l-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
          title={isSidebarCollapsed ? "Hướng dẫn sử dụng" : undefined}
        >
          <BookOpen 
            size={isSidebarCollapsed ? 18 : 16} 
            className={pathname === '/guide' ? 'text-primary' : 'text-muted-foreground'}
          />
          {!isSidebarCollapsed && <span>Hướng dẫn sử dụng</span>}
        </Link>

        {/* System Settings */}
        <Link
          href="/settings"
          onClick={() => onClose?.()}
          className={`flex items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all text-xs font-medium ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-3'
          }`}
          title={isSidebarCollapsed ? "Cài đặt hệ thống" : undefined}
        >
          <Settings size={isSidebarCollapsed ? 18 : 16} />
          {!isSidebarCollapsed && <span>Cài đặt hệ thống</span>}
        </Link>

        {/* Logout */}
        <div 
          onClick={() => {
            onClose?.();
            signOut({ callbackUrl: '/login' });
          }}
          className={`flex items-center rounded-md text-destructive hover:bg-destructive/10 transition-all text-xs font-medium cursor-pointer ${
            isSidebarCollapsed ? 'justify-center py-2.5' : 'px-3 py-2 gap-3'
          }`}
          title={isSidebarCollapsed ? "Đăng xuất" : undefined}
        >
          <LogOut size={isSidebarCollapsed ? 18 : 16} />
          {!isSidebarCollapsed && <span>Đăng xuất</span>}
        </div>
      </div>
    </aside>
  )
}
