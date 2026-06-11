'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type ThemePreset = 'neutral' | 'tangerine' | 'brutalist' | 'softpop'
type ContentWidth = 'compact' | 'wide'

interface ThemeCustomizerContextType {
  themePreset: ThemePreset
  setThemePreset: (preset: ThemePreset) => void
  radius: string
  setRadius: (radius: string) => void
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  contentWidth: ContentWidth
  setContentWidth: (width: ContentWidth) => void
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined)

export function ThemeProviderCustomizer({ children }: { children: React.ReactNode }) {
  const [themePreset, setThemePresetState] = useState<ThemePreset>('neutral')
  const [radius, setRadiusState] = useState<string>('12px')
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(false)
  const [contentWidth, setContentWidthState] = useState<ContentWidth>('wide')

  // Load from localStorage on mount
  useEffect(() => {
    const savedPreset = localStorage.getItem('theme-preset') as ThemePreset || 'neutral'
    const savedRadius = localStorage.getItem('theme-radius') || '12px'
    const savedCollapsed = localStorage.getItem('theme-sidebar-collapsed') === 'true'
    const savedWidth = localStorage.getItem('theme-content-width') as ContentWidth || 'wide'

    setThemePresetState(savedPreset)
    setRadiusState(savedRadius)
    setIsSidebarCollapsedState(savedCollapsed)
    setContentWidthState(savedWidth)

    // Set initial custom properties on documentElement
    updatePresetClass(savedPreset)
    document.documentElement.style.setProperty('--radius', savedRadius)
    document.documentElement.style.setProperty('--sidebar-width', savedCollapsed ? '64px' : '230px')
  }, [])

  const updatePresetClass = (preset: ThemePreset) => {
    const html = document.documentElement
    html.classList.remove('theme-tangerine', 'theme-brutalist', 'theme-softpop')
    if (preset !== 'neutral') {
      html.classList.add(`theme-${preset}`)
    }
  }

  const setThemePreset = (preset: ThemePreset) => {
    setThemePresetState(preset)
    localStorage.setItem('theme-preset', preset)
    updatePresetClass(preset)
  }

  const setRadius = (newRadius: string) => {
    setRadiusState(newRadius)
    localStorage.setItem('theme-radius', newRadius)
    document.documentElement.style.setProperty('--radius', newRadius)
  }

  const setIsSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed)
    localStorage.setItem('theme-sidebar-collapsed', String(collapsed))
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '64px' : '230px')
  }

  const setContentWidth = (width: ContentWidth) => {
    setContentWidthState(width)
    localStorage.setItem('theme-content-width', width)
  }

  return (
    <ThemeCustomizerContext.Provider
      value={{
        themePreset,
        setThemePreset,
        radius,
        setRadius,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        contentWidth,
        setContentWidth
      }}
    >
      {children}
    </ThemeCustomizerContext.Provider>
  )
}

export function useThemeCustomizer() {
  const context = useContext(ThemeCustomizerContext)
  if (!context) {
    throw new Error('useThemeCustomizer must be used within a ThemeProviderCustomizer')
  }
  return context
}
