'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { useThemeCustomizer } from '@/components/providers/ThemeProviderCustomizer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { contentWidth } = useThemeCustomizer()

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Sidebar cố định bên trái */}
      <Sidebar />

      {/* Main area chiếm phần còn lại */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topnav />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-background transition-colors duration-200">
          <div 
            className={`transition-all duration-300 w-full h-full ${
              contentWidth === 'compact' ? 'max-w-6xl mx-auto' : 'max-w-none'
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
