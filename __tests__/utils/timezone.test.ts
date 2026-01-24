/**
 * Unit tests for timezone utility functions
 * 
 * Tests cover:
 * - Timezone validation (isValidTimezone)
 * - Timezone detection (getDetectedTimezone)
 * - Offset calculations (getTimezoneOffset, getTimezoneOffsetMinutes)
 * - Time conversions (convertTime, timeToUTC, utcToTime)
 * - Timezone label formatting (getTimezoneLabel)
 * - Availability expansion (expandAvailabilityToDateRange)
 * - Date range overlap detection (doDateRangesOverlap)
 * - Busy block subtraction (subtractBusyBlocks)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  COMMON_TIMEZONES,
  ALL_TIMEZONES,
  isValidTimezone,
  getDetectedTimezone,
  getTimezoneOffset,
  getTimezoneOffsetMinutes,
  convertTime,
  timeToUTC,
  utcToTime,
  getTimezoneLabel,
  expandAvailabilityToDateRange,
  doDateRangesOverlap,
  subtractBusyBlocks,
} from '@/lib/utils/timezone'

describe('Timezone Utilities', () => {
  // ============================================================
  // Constants Tests
  // ============================================================
  describe('Constants', () => {
    it('should have common timezones organized by region', () => {
      expect(COMMON_TIMEZONES['North America']).toContain('America/New_York')
      expect(COMMON_TIMEZONES['Europe']).toContain('Europe/London')
      expect(COMMON_TIMEZONES['Asia']).toContain('Asia/Tokyo')
      expect(COMMON_TIMEZONES['Pacific']).toContain('Australia/Sydney')
      expect(COMMON_TIMEZONES['Other']).toContain('UTC')
    })

    it('should have ALL_TIMEZONES as a flat array of all regions', () => {
      expect(ALL_TIMEZONES).toContain('America/New_York')
      expect(ALL_TIMEZONES).toContain('Europe/London')
      expect(ALL_TIMEZONES).toContain('Asia/Tokyo')
      expect(ALL_TIMEZONES).toContain('UTC')
      expect(ALL_TIMEZONES.length).toBeGreaterThan(30)
    })
  })

  // ============================================================
  // Timezone Validation Tests
  // ============================================================
  describe('isValidTimezone', () => {
    it('should accept valid IANA timezone identifiers', () => {
      expect(isValidTimezone('America/New_York')).toBe(true)
      expect(isValidTimezone('Europe/London')).toBe(true)
      expect(isValidTimezone('Asia/Tokyo')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
      expect(isValidTimezone('Pacific/Auckland')).toBe(true)
    })

    it('should reject invalid timezone strings', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false)
      expect(isValidTimezone('Not_A_Timezone')).toBe(false)
      expect(isValidTimezone('')).toBe(false)
      expect(isValidTimezone('EST')).toBe(false) // Abbreviations not valid IANA
      expect(isValidTimezone('GMT+5')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidTimezone('America/Los_Angeles')).toBe(true)
      expect(isValidTimezone('Asia/Kolkata')).toBe(true) // Half-hour offset
      expect(isValidTimezone('Australia/Brisbane')).toBe(true) // No DST
    })
  })

  // ============================================================
  // Timezone Detection Tests
  // ============================================================
  describe('getDetectedTimezone', () => {
    it('should return a valid timezone string', () => {
      const detected = getDetectedTimezone()
      expect(typeof detected).toBe('string')
      expect(detected.length).toBeGreaterThan(0)
      expect(isValidTimezone(detected)).toBe(true)
    })

    it('should fall back to UTC when detection fails', () => {
      // Mock Intl.DateTimeFormat to throw
      const originalIntl = global.Intl
      const mockIntl = {
        ...originalIntl,
        DateTimeFormat: vi.fn(() => {
          throw new Error('Detection failed')
        }),
      }
      global.Intl = mockIntl as unknown as typeof Intl
      
      const detected = getDetectedTimezone()
      expect(detected).toBe('UTC')
      
      global.Intl = originalIntl
    })
  })

  // ============================================================
  // Offset Calculation Tests
  // ============================================================
  describe('getTimezoneOffset', () => {
    it('should return offset in +HH:MM format', () => {
      // Note: Results depend on the date due to DST
      const offset = getTimezoneOffset('UTC')
      expect(offset).toBe('+00:00')
    })

    it('should handle positive offsets', () => {
      const offset = getTimezoneOffset('Asia/Kolkata')
      // India is UTC+5:30, doesn't have DST
      expect(offset).toBe('+05:30')
    })

    it('should handle negative offsets (without DST dependency)', () => {
      // Use a timezone without DST for predictable test
      const offset = getTimezoneOffset('America/Phoenix')
      // Arizona is UTC-7 year-round (no DST)
      expect(offset).toBe('-07:00')
    })

    it('should return +00:00 for invalid timezone', () => {
      const offset = getTimezoneOffset('Invalid/Timezone')
      expect(offset).toBe('+00:00')
    })
  })

  describe('getTimezoneOffsetMinutes', () => {
    it('should return 0 for UTC', () => {
      const offsetMinutes = getTimezoneOffsetMinutes('UTC')
      expect(offsetMinutes).toBe(0)
    })

    it('should return positive minutes for timezones ahead of UTC', () => {
      // Asia/Kolkata is UTC+5:30 = 330 minutes
      const offsetMinutes = getTimezoneOffsetMinutes('Asia/Kolkata')
      expect(offsetMinutes).toBe(330)
    })

    it('should return 0 for invalid timezone', () => {
      const offsetMinutes = getTimezoneOffsetMinutes('Invalid/Timezone')
      expect(offsetMinutes).toBe(0)
    })
  })

  // ============================================================
  // Time Conversion Tests
  // ============================================================
  describe('convertTime', () => {
    // Use a fixed date to avoid DST complications
    const fixedDate = new Date('2026-01-15T12:00:00Z')

    it('should convert time from one timezone to another', () => {
      // 09:00 in New York (UTC-5 in winter) should be 14:00 in London (UTC+0)
      // Note: This depends on DST which varies by date
      const result = convertTime('09:00', 'America/New_York', 'Europe/London', fixedDate)
      // In January, NY is UTC-5, London is UTC+0, so 5 hour difference
      expect(result).toBe('14:00')
    })

    it('should handle same timezone conversion', () => {
      const result = convertTime('09:00', 'America/New_York', 'America/New_York', fixedDate)
      expect(result).toBe('09:00')
    })

    it('should handle UTC conversion', () => {
      // 09:00 UTC to Asia/Kolkata (UTC+5:30)
      const result = convertTime('09:00', 'UTC', 'Asia/Kolkata', fixedDate)
      expect(result).toBe('14:30')
    })

    it('should pad hours and minutes correctly', () => {
      const result = convertTime('00:30', 'UTC', 'Asia/Kolkata', fixedDate)
      expect(result).toBe('06:00')
    })
  })

  describe('timeToUTC', () => {
    const fixedDate = new Date('2026-01-15T00:00:00Z')

    it('should convert local time to UTC Date', () => {
      // 09:00 in Asia/Kolkata (UTC+5:30) = 03:30 UTC
      const utcDate = timeToUTC('09:00', 'Asia/Kolkata', fixedDate)
      expect(utcDate.getUTCHours()).toBe(3)
      expect(utcDate.getUTCMinutes()).toBe(30)
    })

    it('should handle UTC timezone', () => {
      const utcDate = timeToUTC('09:00', 'UTC', fixedDate)
      expect(utcDate.getUTCHours()).toBe(9)
      expect(utcDate.getUTCMinutes()).toBe(0)
    })
  })

  describe('utcToTime', () => {
    it('should convert UTC Date to local time string', () => {
      const utcDate = new Date('2026-01-15T09:00:00Z')
      
      // UTC to UTC should be same
      expect(utcToTime(utcDate, 'UTC')).toBe('09:00')
      
      // UTC to Asia/Kolkata (UTC+5:30) should be 14:30
      expect(utcToTime(utcDate, 'Asia/Kolkata')).toBe('14:30')
    })

    it('should format with leading zeros', () => {
      const utcDate = new Date('2026-01-15T01:05:00Z')
      expect(utcToTime(utcDate, 'UTC')).toBe('01:05')
    })
  })

  // ============================================================
  // Timezone Label Tests
  // ============================================================
  describe('getTimezoneLabel', () => {
    it('should format timezone with GMT offset', () => {
      const label = getTimezoneLabel('UTC')
      expect(label).toBe('(GMT) UTC')
    })

    it('should include offset for non-UTC timezones', () => {
      const label = getTimezoneLabel('Asia/Kolkata')
      expect(label).toBe('(GMT+05:30) Asia/Kolkata')
    })

    it('should replace underscores with spaces in timezone name', () => {
      const label = getTimezoneLabel('America/New_York')
      expect(label).toContain('America/New York')
    })
  })

  // ============================================================
  // Availability Expansion Tests
  // ============================================================
  describe('expandAvailabilityToDateRange', () => {
    it('should expand weekly slot to specific dates', () => {
      // Monday (day_of_week = 1) from 2026-01-13 to 2026-01-27
      const fromDate = new Date('2026-01-13')
      const toDate = new Date('2026-01-27')
      
      const slots = expandAvailabilityToDateRange(
        1, // Monday
        '09:00',
        '11:00',
        'UTC',
        fromDate,
        toDate
      )
      
      // Should have 3 Mondays: 13th, 20th, 27th - but 13th is Monday, so Jan 13, 20, 27
      expect(slots.length).toBeGreaterThanOrEqual(2)
      
      // Each slot should have required properties
      slots.forEach(slot => {
        expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(slot.start_time).toBe('09:00')
        expect(slot.end_time).toBe('11:00')
        expect(slot.start_utc).toBeInstanceOf(Date)
        expect(slot.end_utc).toBeInstanceOf(Date)
      })
    })

    it('should return empty array when no matching days in range', () => {
      // Looking for Monday in a range that only has Tue-Thu
      const fromDate = new Date('2026-01-14') // Tuesday
      const toDate = new Date('2026-01-16') // Thursday
      
      const slots = expandAvailabilityToDateRange(
        1, // Monday
        '09:00',
        '11:00',
        'UTC',
        fromDate,
        toDate
      )
      
      expect(slots.length).toBe(0)
    })

    it('should include UTC times in slots', () => {
      const fromDate = new Date('2026-01-19') // Sunday
      const toDate = new Date('2026-01-19')
      
      const slots = expandAvailabilityToDateRange(
        0, // Sunday
        '09:00',
        '11:00',
        'America/New_York', // UTC-5 in winter
        fromDate,
        toDate
      )
      
      expect(slots.length).toBe(1)
      // 09:00 EST should be 14:00 UTC
      expect(slots[0].start_utc.getUTCHours()).toBe(14)
    })
  })

  // ============================================================
  // Date Range Overlap Tests
  // ============================================================
  describe('doDateRangesOverlap', () => {
    it('should detect overlapping date ranges', () => {
      const start1 = new Date('2026-01-15T09:00:00Z')
      const end1 = new Date('2026-01-15T11:00:00Z')
      const start2 = new Date('2026-01-15T10:00:00Z')
      const end2 = new Date('2026-01-15T12:00:00Z')
      
      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should NOT detect overlap for adjacent ranges', () => {
      const start1 = new Date('2026-01-15T09:00:00Z')
      const end1 = new Date('2026-01-15T10:00:00Z')
      const start2 = new Date('2026-01-15T10:00:00Z')
      const end2 = new Date('2026-01-15T11:00:00Z')
      
      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(false)
    })

    it('should NOT detect overlap for separate ranges', () => {
      const start1 = new Date('2026-01-15T09:00:00Z')
      const end1 = new Date('2026-01-15T10:00:00Z')
      const start2 = new Date('2026-01-15T11:00:00Z')
      const end2 = new Date('2026-01-15T12:00:00Z')
      
      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(false)
    })

    it('should detect overlap when one range contains another', () => {
      const start1 = new Date('2026-01-15T08:00:00Z')
      const end1 = new Date('2026-01-15T13:00:00Z')
      const start2 = new Date('2026-01-15T10:00:00Z')
      const end2 = new Date('2026-01-15T11:00:00Z')
      
      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(true)
    })
  })

  // ============================================================
  // Busy Block Subtraction Tests
  // ============================================================
  describe('subtractBusyBlocks', () => {
    it('should filter out slots that overlap with busy blocks', () => {
      const slots = [
        {
          id: '1',
          start_utc: new Date('2026-01-15T09:00:00Z'),
          end_utc: new Date('2026-01-15T10:00:00Z'),
        },
        {
          id: '2',
          start_utc: new Date('2026-01-15T11:00:00Z'),
          end_utc: new Date('2026-01-15T12:00:00Z'),
        },
        {
          id: '3',
          start_utc: new Date('2026-01-15T14:00:00Z'),
          end_utc: new Date('2026-01-15T15:00:00Z'),
        },
      ]

      const busyBlocks = [
        {
          start_time: new Date('2026-01-15T09:30:00Z'),
          end_time: new Date('2026-01-15T10:30:00Z'),
        },
      ]

      const availableSlots = subtractBusyBlocks(slots, busyBlocks)
      
      // Slot 1 (09:00-10:00) overlaps with busy block (09:30-10:30)
      // Slots 2 and 3 should remain
      expect(availableSlots.length).toBe(2)
      expect(availableSlots.map(s => s.id)).toEqual(['2', '3'])
    })

    it('should return all slots when no busy blocks', () => {
      const slots = [
        {
          id: '1',
          start_utc: new Date('2026-01-15T09:00:00Z'),
          end_utc: new Date('2026-01-15T10:00:00Z'),
        },
      ]

      const availableSlots = subtractBusyBlocks(slots, [])
      expect(availableSlots.length).toBe(1)
    })

    it('should handle multiple busy blocks', () => {
      const slots = [
        {
          id: '1',
          start_utc: new Date('2026-01-15T09:00:00Z'),
          end_utc: new Date('2026-01-15T10:00:00Z'),
        },
        {
          id: '2',
          start_utc: new Date('2026-01-15T11:00:00Z'),
          end_utc: new Date('2026-01-15T12:00:00Z'),
        },
        {
          id: '3',
          start_utc: new Date('2026-01-15T14:00:00Z'),
          end_utc: new Date('2026-01-15T15:00:00Z'),
        },
      ]

      const busyBlocks = [
        {
          start_time: new Date('2026-01-15T09:00:00Z'),
          end_time: new Date('2026-01-15T10:00:00Z'),
        },
        {
          start_time: new Date('2026-01-15T14:00:00Z'),
          end_time: new Date('2026-01-15T15:00:00Z'),
        },
      ]

      const availableSlots = subtractBusyBlocks(slots, busyBlocks)
      
      // Only slot 2 should remain
      expect(availableSlots.length).toBe(1)
      expect(availableSlots[0].id).toBe('2')
    })

    it('should preserve slot properties in result', () => {
      const slots = [
        {
          id: '1',
          date: '2026-01-15',
          customField: 'test',
          start_utc: new Date('2026-01-15T09:00:00Z'),
          end_utc: new Date('2026-01-15T10:00:00Z'),
        },
      ]

      const availableSlots = subtractBusyBlocks(slots, [])
      expect(availableSlots[0]).toHaveProperty('customField', 'test')
    })
  })
})
