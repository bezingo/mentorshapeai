import { describe, it, expect } from 'vitest'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isRTL, LOCALE_NAMES } from '@/lib/i18n/config'
import { en } from '@/lib/i18n/locales/en'
import { ar } from '@/lib/i18n/locales/ar'

describe('i18n Configuration', () => {
  describe('Supported Locales', () => {
    it('should include English and Arabic', () => {
      expect(SUPPORTED_LOCALES).toContain('en')
      expect(SUPPORTED_LOCALES).toContain('ar')
    })

    it('should have exactly 2 supported locales for school pilot', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(2)
    })

    it('should default to English', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })
  })

  describe('RTL Detection', () => {
    it('should identify Arabic as RTL', () => {
      expect(isRTL('ar')).toBe(true)
    })

    it('should identify English as LTR', () => {
      expect(isRTL('en')).toBe(false)
    })
  })

  describe('Locale Names', () => {
    it('should have display names for all supported locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(LOCALE_NAMES[locale]).toBeDefined()
        expect(typeof LOCALE_NAMES[locale]).toBe('string')
      })
    })

    it('should have correct English name', () => {
      expect(LOCALE_NAMES.en).toBe('English')
    })

    it('should have Arabic name in Arabic script', () => {
      expect(LOCALE_NAMES.ar).toBe('العربية')
    })
  })
})

describe('Translation Files', () => {
  describe('English Translations', () => {
    it('should have all required sections', () => {
      expect(en.common).toBeDefined()
      expect(en.nav).toBeDefined()
      expect(en.goals).toBeDefined()
      expect(en.collaborations).toBeDefined()
      expect(en.focuses).toBeDefined()
      expect(en.counselor).toBeDefined()
      expect(en.consent).toBeDefined()
      expect(en.safeguarding).toBeDefined()
      expect(en.voice).toBeDefined()
    })

    it('should have goal categories matching allowed values', () => {
      const { categories } = en.goals
      expect(categories.finance).toBeDefined()
      expect(categories.career).toBeDefined()
      expect(categories.personal_growth).toBeDefined()
      expect(categories.entrepreneurship).toBeDefined()
      // Should only have 4 categories (M0 restriction)
      expect(Object.keys(categories)).toHaveLength(4)
    })

    it('should have voice strings for push-to-talk', () => {
      expect(en.voice.holdToTalk).toBeDefined()
      expect(en.voice.listening).toBeDefined()
      expect(en.voice.processing).toBeDefined()
      expect(en.voice.release).toBeDefined()
    })
  })

  describe('Arabic Translations', () => {
    it('should have all required sections matching English', () => {
      const enKeys = Object.keys(en)
      const arKeys = Object.keys(ar)
      expect(arKeys.sort()).toEqual(enKeys.sort())
    })

    it('should have all goal categories translated', () => {
      const { categories } = ar.goals
      expect(categories.finance).toBeDefined()
      expect(categories.career).toBeDefined()
      expect(categories.personal_growth).toBeDefined()
      expect(categories.entrepreneurship).toBeDefined()
    })

    it('should have Arabic text (not English placeholders)', () => {
      // Arabic text should contain Arabic Unicode characters
      expect(/[\u0600-\u06FF]/.test(ar.common.loading)).toBe(true)
      expect(/[\u0600-\u06FF]/.test(ar.voice.holdToTalk)).toBe(true)
      expect(/[\u0600-\u06FF]/.test(ar.goals.categories.finance)).toBe(true)
    })

    it('should have consent strings translated', () => {
      expect(/[\u0600-\u06FF]/.test(ar.consent.consentRequired)).toBe(true)
      expect(/[\u0600-\u06FF]/.test(ar.consent.iAgree)).toBe(true)
    })
  })

  describe('Translation Completeness', () => {
    function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      return Object.entries(obj).flatMap(([key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'object' && value !== null) {
          return getAllKeys(value as Record<string, unknown>, newKey)
        }
        return [newKey]
      })
    }

    it('should have the same keys in EN and AR', () => {
      const enKeys = getAllKeys(en)
      const arKeys = getAllKeys(ar)
      expect(arKeys.sort()).toEqual(enKeys.sort())
    })

    it('should not have any empty string values', () => {
      const checkEmpty = (obj: Record<string, unknown>, path = ''): string[] => {
        return Object.entries(obj).flatMap(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key
          if (typeof value === 'object' && value !== null) {
            return checkEmpty(value as Record<string, unknown>, currentPath)
          }
          if (value === '') {
            return [currentPath]
          }
          return []
        })
      }

      expect(checkEmpty(en)).toHaveLength(0)
      expect(checkEmpty(ar)).toHaveLength(0)
    })
  })
})
