'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { useThemeCustomizer } from '@/components/providers/ThemeProviderCustomizer'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { contentWidth } = useThemeCustomizer()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Sidebar cố định bên trái trên desktop */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer Content */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] transform transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar className="w-full h-full border-r border-border" onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main area chiếm phần còn lại */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topnav onMenuClick={() => setIsMobileMenuOpen(true)} />
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
