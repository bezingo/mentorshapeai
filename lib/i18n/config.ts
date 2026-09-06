export const SUPPORTED_LOCALES = ['en', 'ar'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const RTL_LOCALES: Locale[] = ['ar']

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
}
