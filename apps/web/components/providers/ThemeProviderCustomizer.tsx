'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type ThemePreset = 'zinc' | 'slate' | 'stone' | 'neutral'
export type AccentColor = 'default' | 'blue' | 'green' | 'orange' | 'red'
export type ContentWidth = 'compact' | 'wide'

interface ThemeCustomizerContextType {
  themePreset: ThemePreset
  setThemePreset: (preset: ThemePreset) => void
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void
  radius: string
  setRadius: (radius: string) => void
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  contentWidth: ContentWidth
  setContentWidth: (width: ContentWidth) => void
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined)

export function ThemeProviderCustomizer({ children }: { children: React.ReactNode }) {
  const [themePreset, setThemePresetState] = useState<ThemePreset>('zinc')
  const [accentColor, setAccentColorState] = useState<AccentColor>('default')
  const [radius, setRadiusState] = useState<string>('8px')
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(false)
  const [contentWidth, setContentWidthState] = useState<ContentWidth>('wide')

  // Load from localStorage on mount
  useEffect(() => {
    const savedPreset = localStorage.getItem('theme-preset') as ThemePreset || 'zinc'
    const savedAccent = localStorage.getItem('theme-accent') as AccentColor || 'default'
    const savedRadius = localStorage.getItem('theme-radius') || '8px'
    const savedCollapsed = localStorage.getItem('theme-sidebar-collapsed') === 'true'
    const savedWidth = localStorage.getItem('theme-content-width') as ContentWidth || 'wide'

    setThemePresetState(savedPreset)
    setAccentColorState(savedAccent)
    setRadiusState(savedRadius)
    setIsSidebarCollapsedState(savedCollapsed)
    setContentWidthState(savedWidth)

    // Set initial custom properties on documentElement
    updateThemeClasses(savedPreset, savedAccent)
    document.documentElement.style.setProperty('--radius', savedRadius)
    document.documentElement.style.setProperty('--sidebar-width', savedCollapsed ? '70px' : '240px')
  }, [])

  const updateThemeClasses = (preset: ThemePreset, accent: AccentColor) => {
    const html = document.documentElement
    
    // Clean up old classes
    html.classList.remove(
      'theme-zinc', 'theme-slate', 'theme-stone', 'theme-neutral',
      'accent-blue', 'accent-green', 'accent-orange', 'accent-red'
    )
    
    // Add base theme class (zinc is default, but we can still add classes for others)
    if (preset !== 'zinc') {
      html.classList.add(`theme-${preset}`)
    }
    
    // Add accent color class
    if (accent !== 'default') {
      html.classList.add(`accent-${accent}`)
    }
  }

  const setThemePreset = (preset: ThemePreset) => {
    setThemePresetState(preset)
    localStorage.setItem('theme-preset', preset)
    updateThemeClasses(preset, accentColor)
  }

  const setAccentColor = (accent: AccentColor) => {
    setAccentColorState(accent)
    localStorage.setItem('theme-accent', accent)
    updateThemeClasses(themePreset, accent)
  }

  const setRadius = (newRadius: string) => {
    setRadiusState(newRadius)
    localStorage.setItem('theme-radius', newRadius)
    document.documentElement.style.setProperty('--radius', newRadius)
  }

  const setIsSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed)
    localStorage.setItem('theme-sidebar-collapsed', String(collapsed))
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '70px' : '240px')
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
        accentColor,
        setAccentColor,
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
