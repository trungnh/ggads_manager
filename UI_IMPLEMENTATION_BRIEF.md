# ADSFLOW — UI IMPLEMENTATION BRIEF
### Dành cho AI Coder (Gemini / Cursor / Claude Code)
### Version: Dashboard + Campaigns Page

---

## ⚠️ ĐỌC TRƯỚC KHI CODE

Đây là bản hướng dẫn implementation cực kỳ chi tiết. Mọi quyết định design đã được đưa ra sẵn. Nhiệm vụ của AI coder là **thực thi chính xác**, không phải sáng tạo thêm.

**KHÔNG được:**
- Dùng Bootstrap, Ant Design, Material UI, Chakra UI
- Dùng font Arial, Roboto, Inter mặc định
- Dùng background trắng toàn trang mà không có sidebar
- Tự ý thêm gradient, shadow nặng, border-radius lớn
- Đặt content ở giữa màn hình (centered layout)

**PHẢI dùng:**
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Font: Geist Sans (Google Fonts hoặc `next/font/google`)
- Layout: sidebar cố định 220px bên trái + main area bên phải

---

## 1. PROJECT SETUP

### 1.1 Cài đặt

```bash
npx create-next-app@latest adsflow --typescript --tailwind --app --src-dir
cd adsflow
npx shadcn-ui@latest init
npx shadcn-ui@latest add button badge card table toggle
npm install @fontsource/geist-sans lucide-react recharts
```

### 1.2 `tailwind.config.ts` — Màu sắc custom

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Semantic colors — dùng xuyên suốt toàn app
        green: {
          bg:   '#EAF3DE',
          text: '#3B6D11',
          border: '#639922',
        },
        red: {
          bg:   '#FCEBEB',
          text: '#A32D2D',
          border: '#E24B4A',
        },
        amber: {
          bg:   '#FAEEDA',
          text: '#854F0B',
          border: '#EF9F27',
        },
        purple: {
          bg:   '#EEEDFE',
          text: '#3C3489',
          border: '#534AB7',
        },
        teal: {
          bg:   '#E1F5EE',
          text: '#0F6E56',
        },
      },
      borderWidth: {
        'DEFAULT': '0.5px',  // Mọi border mặc định là 0.5px
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 1.3 `src/app/globals.css`

```css
@import '@fontsource/geist-sans/400.css';
@import '@fontsource/geist-sans/500.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --sidebar-width: 220px;
  --topnav-height: 52px;
  --font-sans: 'Geist Sans', system-ui, sans-serif;

  /* Light mode */
  --bg-page:   #F5F4F0;
  --bg-card:   #FFFFFF;
  --bg-secondary: #F0EEE9;
  --border:    rgba(0,0,0,0.10);
  --border-md: rgba(0,0,0,0.18);
  --text-1:    #1A1A1A;
  --text-2:    #5A5855;
  --text-3:    #9A9894;
}

.dark {
  --bg-page:      #111110;
  --bg-card:      #1C1C1A;
  --bg-secondary: #242422;
  --border:       rgba(255,255,255,0.10);
  --border-md:    rgba(255,255,255,0.18);
  --text-1:       #EEECEA;
  --text-2:       #9A9894;
  --text-3:       #6A6864;
}

* { box-sizing: border-box; }

body {
  font-family: var(--font-sans);
  background: var(--bg-page);
  color: var(--text-1);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar tối giản */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-md); border-radius: 2px; }
```

---

## 2. LAYOUT STRUCTURE

### 2.1 Root Layout — `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ads Manager',
  description: 'Google Ads Manager với AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
```

### 2.2 Dashboard Layout — `src/app/(dashboard)/layout.tsx`

```typescript
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar cố định bên trái */}
      <Sidebar />

      {/* Main area chiếm phần còn lại */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        <Topnav />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: 'var(--bg-page)',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## 3. SIDEBAR COMPONENT

### File: `src/components/layout/Sidebar.tsx`

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, Megaphone, Sliders, Clock, BarChart2,
  Sparkles, TrendingUp, Calendar, LineChart, Package,
  Settings, ChevronRight
} from 'lucide-react'

// ── Cấu trúc nav items ──────────────────────────────────────────
const NAV = [
  {
    section: 'Tổng quan',
    items: [
      { href: '/',            icon: LayoutGrid,  label: 'Dashboard' },
      { href: '/campaigns',   icon: Megaphone,   label: 'Chiến dịch',     badge: '4 live',   badgeColor: 'green' },
      { href: '/rules',       icon: Sliders,     label: 'Rule Engine',    badge: '8 rules',  badgeColor: 'green' },
      { href: '/dayparting',  icon: Clock,       label: 'Dayparting' },
    ],
  },
  {
    section: 'AI Features',
    items: [
      { href: '/analyst',   icon: Sparkles,    label: 'AI Analyst',       badge: 'Mới',      badgeColor: 'purple' },
      { href: '/optimizer', icon: TrendingUp,  label: 'Budget Optimizer' },
    ],
  },
  {
    section: 'Quản lý',
    items: [
      { href: '/schedules', icon: Calendar,   label: 'Lịch chạy' },
      { href: '/revenue',   icon: LineChart,  label: 'Doanh thu' },
      { href: '/products',  icon: Package,    label: 'Sản phẩm' },
    ],
  },
]

// ── Badge màu theo type ──────────────────────────────────────────
const BADGE_STYLES: Record<string, React.CSSProperties> = {
  green:  { background: '#EAF3DE', color: '#3B6D11' },
  purple: { background: '#EEEDFE', color: '#3C3489' },
  amber:  { background: '#FAEEDA', color: '#854F0B' },
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      height: '100vh',
      background: 'var(--bg-card)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: 'var(--topnav-height)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        borderBottom: '0.5px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 26, height: 26,
          borderRadius: 6,
          background: 'var(--text-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
          AdsFlow
        </span>
        <span style={{
          fontSize: 10, padding: '1px 6px',
          borderRadius: 20,
          background: '#EEEDFE', color: '#3C3489',
          marginLeft: 2,
        }}>
          AI
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV.map((group) => (
          <div key={group.section}>
            {/* Section label */}
            <div style={{
              padding: '12px 16px 4px',
              fontSize: 10, fontWeight: 500,
              color: 'var(--text-3)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {group.section}
            </div>

            {/* Nav items */}
            {group.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 10px',
                    margin: '1px 6px',
                    borderRadius: 8,
                    color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                    background: isActive ? 'var(--bg-secondary)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                    fontSize: 13,
                    textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Icon
                    size={15}
                    style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>

                  {/* Badge */}
                  {item.badge && (
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 20,
                      ...(BADGE_STYLES[item.badgeColor || 'green']),
                      flexShrink: 0,
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer: Settings + User ── */}
      <div style={{
        padding: '8px',
        borderTop: '0.5px solid var(--border)',
        flexShrink: 0,
      }}>
        <Link
          href="/settings"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 8,
            color: 'var(--text-2)', fontSize: 13,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Settings size={15} style={{ opacity: 0.55 }} />
          Cài đặt AI
        </Link>

        {/* User row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
          marginTop: 2,
        }}>
          {/* Avatar */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#EEEDFE', color: '#3C3489',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, flexShrink: 0,
          }}>
            TN
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>
              Trần Nam
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Admin</div>
          </div>
          <ChevronRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  )
}
```

---

## 4. TOPNAV COMPONENT

### File: `src/components/layout/Topnav.tsx`

```typescript
'use client'
import { RefreshCw, ChevronDown } from 'lucide-react'

export default function Topnav() {
  return (
    <header style={{
      height: 'var(--topnav-height)',
      background: 'var(--bg-card)',
      borderBottom: '0.5px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flex: 1, fontSize: 13, color: 'var(--text-3)',
      }}>
        <span>Tài khoản</span>
        <ChevronDown size={12} />
        <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>
          Thời Trang XYZ
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

        {/* Sync status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--text-3)',
          padding: '5px 10px', borderRadius: 8,
          border: '0.5px solid var(--border)',
        }}>
          {/* Pulsing green dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4caf50',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          Đồng bộ 2 phút trước
        </div>

        {/* Account switcher */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, padding: '5px 10px', borderRadius: 8,
          border: '0.5px solid var(--border-md)',
          background: 'transparent', cursor: 'pointer',
          color: 'var(--text-2)',
        }}>
          Thời Trang XYZ
          <ChevronDown size={12} />
        </button>

        {/* Sync button */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, padding: '5px 12px', borderRadius: 8,
          background: 'var(--text-1)', color: 'var(--bg-card)',
          border: 'none', cursor: 'pointer', fontWeight: 500,
        }}>
          <RefreshCw size={12} />
          Sync ngay
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  )
}
```

---

## 5. DASHBOARD PAGE

### File: `src/app/(dashboard)/page.tsx`

```typescript
import KpiGrid from '@/components/dashboard/KpiGrid'
import AiInsightBanner from '@/components/dashboard/AiInsightBanner'
import CampaignTable from '@/components/campaigns/CampaignTable'
import RuleEnginePanel from '@/components/dashboard/RuleEnginePanel'
import ActivityLog from '@/components/dashboard/ActivityLog'

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1200 }}>
      {/* AI Insight Banner */}
      <AiInsightBanner />

      {/* KPI cards */}
      <KpiGrid />

      {/* Campaign table */}
      <CampaignTable />

      {/* Bottom 2 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginTop: 0,
      }}>
        <RuleEnginePanel />
        <ActivityLog />
      </div>
    </div>
  )
}
```

---

## 6. KPI CARDS

### File: `src/components/dashboard/KpiGrid.tsx`

```typescript
// KPI sparkline data — mảng 7 số đại diện 7 ngày gần nhất
const KPI_DATA = [
  {
    label: 'Chi phí hôm nay',
    sublabel: 'live',
    value: '4.2tr ₫',
    delta: '+12%',
    deltaDir: 'up' as const,
    deltaLabel: 'vs TB 7 ngày',
    sparks: [2.8, 3.1, 2.5, 3.8, 3.2, 3.9, 4.2],
    sparkColor: '#3B6D11',
  },
  {
    label: 'Đơn hàng CRM',
    value: '63',
    delta: '+31%',
    deltaDir: 'up' as const,
    deltaLabel: 'vs TB',
    sparks: [40, 48, 35, 58, 52, 55, 63],
    sparkColor: '#3B6D11',
  },
  {
    label: 'CPA thực',
    value: '66.7k ₫',
    delta: '-15%',
    deltaDir: 'up' as const,   // giảm CPA là TỐT → màu xanh
    deltaLabel: 'vs TB',
    sparks: [82, 75, 90, 68, 72, 70, 67],
    sparkColor: '#3B6D11',
    invertSpark: true,         // bar cao = CPA cao = xấu → invert màu
  },
  {
    label: 'ROAS',
    value: '3.8×',
    delta: '+0.4',
    deltaDir: 'neutral' as const,
    deltaLabel: 'vs TB',
    sparks: [2.9, 3.1, 2.8, 3.4, 3.6, 3.5, 3.8],
    sparkColor: '#0F6E56',
  },
]

// Sparkline mini bar chart (7 bars)
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 2,
      height: 24, marginTop: 10,
    }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.round((v / max) * 100)}%`,
            borderRadius: 2,
            background: i === data.length - 1 ? color : 'var(--border-md)',
            minHeight: 2,
          }}
        />
      ))}
    </div>
  )
}

const DELTA_COLOR = {
  up:      '#3B6D11',
  down:    '#A32D2D',
  neutral: 'var(--text-3)',
}

export default function KpiGrid() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 10,
      marginBottom: 16,
    }}>
      {KPI_DATA.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          {/* Label row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 4,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {kpi.label}
            </span>
            {kpi.sublabel && (
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                {kpi.sublabel}
              </span>
            )}
          </div>

          {/* Value */}
          <div style={{
            fontSize: 22, fontWeight: 500,
            color: 'var(--text-1)', lineHeight: 1.1,
            marginBottom: 4,
          }}>
            {kpi.value}
          </div>

          {/* Delta */}
          <div style={{
            fontSize: 11,
            color: DELTA_COLOR[kpi.deltaDir],
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontWeight: 500 }}>{kpi.delta}</span>
            <span style={{ color: 'var(--text-3)' }}>{kpi.deltaLabel}</span>
          </div>

          {/* Sparkline */}
          <Sparkline data={kpi.sparks} color={kpi.sparkColor} />
        </div>
      ))}
    </div>
  )
}
```

---

## 7. AI INSIGHT BANNER

### File: `src/components/dashboard/AiInsightBanner.tsx`

```typescript
export default function AiInsightBanner() {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      gap: 12,
      marginBottom: 16,
    }}>
      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#EEEDFE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 15,
      }}>
        ✦
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>
            AI Analyst — Báo cáo hôm qua 14/01
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 20,
            background: '#EEEDFE', color: '#3C3489',
          }}>
            Mới
          </span>
        </div>

        <p style={{
          fontSize: 12, color: 'var(--text-2)',
          lineHeight: 1.5, marginBottom: 10,
        }}>
          Chi phí +12%, đơn +31% so TB 7 ngày. ROAS cải thiện.
          2 vấn đề cần xử lý: "Đầm Dự Tiệc" chi 890k mà 0 đơn CRM,
          "Áo Thu Đông" hết budget lúc 4h chiều.
        </p>

        {/* Action chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ActionChip variant="danger" label="Đầm Dự Tiệc: 0 đơn CRM" />
          <ActionChip variant="success" label="Tăng budget Áo Thu Đông +30%" />
          <ActionChip variant="default" label="Xem phân tích đầy đủ" />
        </div>
      </div>
    </div>
  )
}

function ActionChip({
  label, variant
}: { label: string; variant: 'danger' | 'success' | 'default' }) {
  const styles = {
    danger:  { background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #E24B4A' },
    success: { background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #639922' },
    default: { background: 'transparent', color: 'var(--text-2)', border: '0.5px solid var(--border-md)' },
  }
  return (
    <button style={{
      fontSize: 11, padding: '4px 10px',
      borderRadius: 8, cursor: 'pointer',
      ...styles[variant],
    }}>
      {label}
    </button>
  )
}
```

---

## 8. CAMPAIGN TABLE

### File: `src/components/campaigns/CampaignTable.tsx`

```typescript
'use client'
import { useState } from 'react'

// Types
type SignalVariant = 'error' | 'warning' | 'success' | 'ai'
type StatusVariant = 'live' | 'paused' | 'alert'

interface Campaign {
  id: string
  name: string
  status: StatusVariant
  budget: string
  cost: string
  orders: number
  cpa: string | null
  roas: string | null
  signal: { label: string; variant: SignalVariant } | null
  enabled: boolean
}

// ── Mock data ────────────────────────────────────────────────────
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1', name: 'Áo Thu Đông', status: 'live',
    budget: '1.5tr', cost: '1.24tr', orders: 18,
    cpa: '41k', roas: '4.2×',
    signal: { label: 'Budget hết 4h', variant: 'warning' },
    enabled: true,
  },
  {
    id: '2', name: 'Đầm Dự Tiệc', status: 'alert',
    budget: '1.2tr', cost: '890k', orders: 0,
    cpa: null, roas: null,
    signal: { label: '0 đơn CRM', variant: 'error' },
    enabled: true,
  },
  {
    id: '3', name: 'Flash Sale 1.14', status: 'live',
    budget: '800k', cost: '340k', orders: 4,
    cpa: '85k', roas: '2.1×',
    signal: { label: 'CPA +150%', variant: 'warning' },
    enabled: true,
  },
  {
    id: '4', name: 'Blazer Công Sở', status: 'paused',
    budget: '600k', cost: '—', orders: 0,
    cpa: null, roas: null,
    signal: { label: 'Dayparting off', variant: 'ai' },
    enabled: false,
  },
]

// ── Sub-components ───────────────────────────────────────────────

function StatusPill({ status }: { status: StatusVariant }) {
  const map = {
    live:   { bg: '#EAF3DE', color: '#3B6D11', label: '● Live' },
    paused: { bg: 'var(--bg-secondary)', color: 'var(--text-3)', label: 'Đã dừng' },
    alert:  { bg: '#FAEEDA', color: '#854F0B', label: '⚠ Live' },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function SignalBadge({ signal }: { signal: { label: string; variant: SignalVariant } }) {
  const map = {
    error:   { bg: '#FCEBEB', color: '#A32D2D' },
    warning: { bg: '#FAEEDA', color: '#854F0B' },
    success: { bg: '#EAF3DE', color: '#3B6D11' },
    ai:      { bg: '#EEEDFE', color: '#3C3489' },
  }
  const s = map[signal.variant]
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 4,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {signal.label}
    </span>
  )
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 28, height: 16, borderRadius: 8,
        background: enabled ? 'var(--text-1)' : 'var(--border-md)',
        position: 'relative', cursor: 'pointer',
        flexShrink: 0, transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: 'white',
        position: 'absolute', top: 2,
        left: enabled ? 14 : 2,
        transition: 'left 0.15s',
      }} />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function CampaignTable() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS)
  const [filter, setFilter] = useState<'all' | 'live' | 'issues'>('all')

  const filtered = campaigns.filter((c) => {
    if (filter === 'live') return c.status !== 'paused'
    if (filter === 'issues') return c.signal?.variant === 'error' || c.signal?.variant === 'warning'
    return true
  })

  const toggleCampaign = (id: string) => {
    setCampaigns(prev => prev.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
          Chiến dịch đang chạy
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'live', 'issues'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                border: '0.5px solid var(--border)',
                background: filter === f ? 'var(--text-1)' : 'transparent',
                color: filter === f ? 'var(--bg-card)' : 'var(--text-3)',
                cursor: 'pointer',
              }}
            >
              {{ all: 'Tất cả', live: 'Đang chạy', issues: 'Có vấn đề' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 12,
        }}>
          <thead>
            <tr>
              {['', 'Chiến dịch', 'Trạng thái', 'Budget', 'Chi phí', 'Đơn CRM', 'CPA thực', 'ROAS', 'Tín hiệu', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 12px', textAlign: 'left',
                  fontSize: 10, fontWeight: 500,
                  color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '0.5px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <TableRow
                key={c.id}
                campaign={c}
                isLast={i === filtered.length - 1}
                onToggle={() => toggleCampaign(c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableRow({
  campaign: c, isLast, onToggle
}: {
  campaign: Campaign
  isLast: boolean
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isPaused = c.status === 'paused'

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'var(--bg-secondary)' : 'transparent' }}
    >
      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)', width: 40 }}>
        <Toggle enabled={c.enabled} onToggle={onToggle} />
      </td>
      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <span style={{
          fontWeight: 500, fontSize: 12,
          color: isPaused ? 'var(--text-3)' : 'var(--text-1)',
          maxWidth: 140, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block',
        }}>
          {c.name}
        </span>
      </td>
      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <StatusPill status={c.status} />
      </td>

      {/* Numeric columns */}
      {[c.budget, c.cost].map((val, i) => (
        <td key={i} style={{
          padding: '9px 12px',
          borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
          color: isPaused ? 'var(--text-3)' : 'var(--text-1)',
        }}>
          {val}
        </td>
      ))}

      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <span style={{
          color: c.orders === 0 && c.cost !== '—'
            ? '#A32D2D'
            : c.orders > 0 ? '#3B6D11' : 'var(--text-3)',
          fontWeight: c.orders > 0 ? 500 : 400,
        }}>
          {c.orders > 0 ? `${c.orders} đơn` : isPaused ? '—' : '0 đơn'}
        </span>
      </td>

      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <span style={{
          color: c.cpa === null
            ? 'var(--text-3)'
            : parseInt(c.cpa) > 70 ? '#A32D2D' : '#3B6D11',
          fontWeight: c.cpa ? 500 : 400,
        }}>
          {c.cpa ?? '—'}
        </span>
      </td>

      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <span style={{
          color: c.roas === null ? 'var(--text-3)'
            : parseFloat(c.roas) >= 3 ? '#3B6D11' : '#A32D2D',
          fontWeight: c.roas ? 500 : 400,
        }}>
          {c.roas ?? '—'}
        </span>
      </td>

      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        {c.signal && <SignalBadge signal={c.signal} />}
      </td>

      {/* Actions */}
      <td style={{ padding: '9px 12px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Budget', 'Chart'].map((label) => (
            <button key={label} style={{
              fontSize: 11, padding: '3px 7px', borderRadius: 5,
              border: '0.5px solid var(--border)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--text-2)',
            }}>
              {label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  )
}
```

---

## 9. RULE ENGINE PANEL & ACTIVITY LOG

### File: `src/components/dashboard/RuleEnginePanel.tsx`

```typescript
const RULES = [
  { name: 'Tắt camp không đơn (CPA cao)', priority: 90, enabled: true },
  { name: '[Dayparting] Tắt 1h–6h sáng', priority: 80, enabled: true },
  { name: 'Tăng budget CPA tốt T6–T7',   priority: 70, enabled: true },
  { name: 'Alert CFLC > 2tr',             priority: 60, enabled: false },
]

export default function RuleEnginePanel() {
  return (
    <Panel title="Rule Engine đang hoạt động">
      {RULES.map((rule, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 0',
          borderBottom: i < RULES.length - 1 ? '0.5px solid var(--border)' : 'none',
        }}>
          {/* Status dot */}
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: rule.enabled ? '#4caf50' : '#bbb',
          }} />
          <span style={{
            flex: 1, fontSize: 12, color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {rule.name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>
            P{rule.priority}
          </span>
          <MiniToggle enabled={rule.enabled} />
        </div>
      ))}
      <PanelFooterLink href="/rules" label="Quản lý tất cả rules" />
    </Panel>
  )
}
```

### File: `src/components/dashboard/ActivityLog.tsx`

```typescript
type LogType = 'pause' | 'increase' | 'alert' | 'ai'

const LOGS = [
  { type: 'pause' as LogType, text: 'Đã tạm dừng "Blazer Công Sở" — CPA 180k vượt ngưỡng', time: '14:32 · Rule: Tắt camp CPA cao' },
  { type: 'increase' as LogType, text: 'Tăng budget "Áo Thu Đông" 1.2tr → 1.5tr (+25%)', time: '12:05 · Rule: Dayparting giờ vàng T6' },
  { type: 'alert' as LogType, text: 'Telegram alert — "Flash Sale" CPA tăng 150%', time: '10:15 · Rule: Alert CPA đột biến' },
  { type: 'ai' as LogType, text: 'AI Analyst đã gửi báo cáo ngày 14/01 qua Telegram', time: '07:00 · Claude Sonnet 4' },
]

const DOT_COLOR: Record<LogType, string> = {
  pause: '#A32D2D', increase: '#3B6D11', alert: '#854F0B', ai: '#3C3489',
}

export default function ActivityLog() {
  return (
    <Panel title="Hoạt động gần đây">
      {LOGS.map((log, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, padding: '6px 0', alignItems: 'flex-start',
          borderBottom: i < LOGS.length - 1 ? '0.5px solid var(--border)' : 'none',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: DOT_COLOR[log.type], marginTop: 5,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-1)', lineHeight: 1.4 }}>
              {log.text}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
              {log.time}
            </div>
          </div>
        </div>
      ))}
      <PanelFooterLink href="/logs" label="Xem tất cả logs" />
    </Panel>
  )
}
```

### File: `src/components/dashboard/Panel.tsx` (shared)

```typescript
import Link from 'next/link'

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export function MiniToggle({ enabled }: { enabled: boolean }) {
  return (
    <div style={{
      width: 24, height: 14, borderRadius: 7, flexShrink: 0,
      background: enabled ? 'var(--text-1)' : 'var(--border-md)',
      position: 'relative',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 2,
        left: enabled ? 12 : 2, transition: 'left 0.15s',
      }} />
    </div>
  )
}

export function PanelFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
      <Link href={href} style={{
        fontSize: 11, color: 'var(--text-3)', textDecoration: 'none',
      }}>
        {label} →
      </Link>
    </div>
  )
}
```

---

## 10. CHECKLIST TRƯỚC KHI SUBMIT CODE

Gemini phải tự check trước khi trả output:

```
Layout:
[ ] Có sidebar 220px ở bên trái, KHÔNG phải centered content
[ ] Topnav 52px nằm trên main content, bên phải sidebar
[ ] Main content có padding 20px và scroll độc lập
[ ] Tổng chiều cao = 100vh, không scroll toàn trang

Fonts:
[ ] Đã import Geist Sans (KHÔNG dùng Arial/system-ui mặc định)
[ ] Font size: 10px caption, 11px meta, 12px table, 13px body, 22px KPI

Colors:
[ ] Background page: #F5F4F0 (xám nhạt, KHÔNG phải trắng)
[ ] Card background: #FFFFFF với border 0.5px
[ ] Borders: 0.5px, KHÔNG phải 1px
[ ] Green = tốt: bg #EAF3DE text #3B6D11
[ ] Red = xấu: bg #FCEBEB text #A32D2D
[ ] Amber = cảnh báo: bg #FAEEDA text #854F0B
[ ] Purple = AI: bg #EEEDFE text #3C3489

Components:
[ ] KPI cards: 4 columns, có sparkline 7 bars
[ ] AI Insight banner: flex row, icon tím + text + action chips
[ ] Campaign table: có toggle switches, status pills, signal badges
[ ] Rule panel + Activity log: 2 columns ở dưới
[ ] Tất cả border-radius cards: 12px
[ ] KHÔNG có shadow (box-shadow: none)
[ ] KHÔNG có gradient
```

---

## 11. PROMPT MẪU ĐỂ CHO GEMINI

Copy đoạn này vào đầu mỗi prompt khi làm việc với Gemini:

```
Tôi đang build admin dashboard Next.js 14 App Router + TypeScript + Tailwind CSS.
Không dùng Bootstrap, MUI, Ant Design.

Design system bắt buộc:
- Font: Geist Sans (import từ @fontsource/geist-sans), KHÔNG dùng Arial/Inter mặc định
- Layout: Sidebar 220px cố định bên trái + main area bên phải, height 100vh
- Background page: #F5F4F0 (xám nhạt), card: #FFFFFF
- Borders: 0.5px solid rgba(0,0,0,0.10) — chú ý 0.5px, KHÔNG phải 1px
- Border-radius cards: 12px
- KHÔNG dùng gradient, KHÔNG dùng box-shadow
- Font weights: chỉ 400 và 500
- Colors semantic:
  Tốt/xanh: bg #EAF3DE, text #3B6D11
  Xấu/đỏ:  bg #FCEBEB, text #A32D2D
  Cảnh báo: bg #FAEEDA, text #854F0B
  AI/tím:   bg #EEEDFE, text #3C3489
- Icons: Lucide React, size 14-16px

Implement component sau theo đúng design system trên: [MÔ TẢ COMPONENT]
```
