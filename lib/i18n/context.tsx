'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Locale, DEFAULT_LOCALE, isRTL, SUPPORTED_LOCALES } from './config'
import { en, Translations } from './locales/en'
import { ar } from './locales/ar'

const translations: Record<Locale, Translations> = { en, ar }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
  dir: 'ltr' | 'rtl'
  isRTL: boolean
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('locale') as Locale | null
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setLocaleState(stored)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale
      document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr'
    }
  }, [locale, mounted])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }, [])

  const value: I18nContextType = {
    locale,
    setLocale,
    t: translations[locale],
    dir: isRTL(locale) ? 'rtl' : 'ltr',
    isRTL: isRTL(locale),
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useTranslation() {
  const { t, locale, dir, isRTL } = useI18n()
  return { t, locale, dir, isRTL }
}
