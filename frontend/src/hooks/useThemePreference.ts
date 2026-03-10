import { useCallback, useEffect, useState } from 'react'

const DEFAULT_THEME = 'light'

const readInitialTheme = () => {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr) {
      return attr
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('theme')
      if (stored) {
        return stored
      }
    } catch (storageError) {
      console.warn('Nie udało się odczytać motywu z localStorage', storageError)
    }
  }

  return DEFAULT_THEME
}

export function useThemePreference() {
  const [theme, setThemeState] = useState<string>(() => readInitialTheme())

  const applyTheme = useCallback((nextTheme?: string | null) => {
    if (!nextTheme) {
      return
    }

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme)
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('theme', nextTheme)
      } catch (storageError) {
        console.warn('Nie udało się zapisać motywu w localStorage', storageError)
      }
      window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: nextTheme }))
    }

    setThemeState(nextTheme)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (typeof detail === 'string') {
        setThemeState(detail)
      }
    }

    window.addEventListener('wt:theme-changed', handler as EventListener)
    return () => window.removeEventListener('wt:theme-changed', handler as EventListener)
  }, [])

  return { theme, setTheme: applyTheme }
}
