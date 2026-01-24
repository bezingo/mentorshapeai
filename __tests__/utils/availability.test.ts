/**
 * Unit tests for availability utility functions
 * 
 * Tests cover:
 * - Time format conversion (timeToMinutes, minutesToTime)
 * - Time range overlap detection (doTimesOverlap)
 * - Slot overlap checking with existing slots (checkSlotOverlap)
 * - Time range validation (isValidTimeRange, isValidTimeFormat)
 * - Slot counting per day (countSlotsOnDay)
 * - Complete slot validation (validateSlot)
 */

import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  minutesToTime,
  doTimesOverlap,
  checkSlotOverlap,
  isValidTimeRange,
  isValidTimeFormat,
  countSlotsOnDay,
  validateSlot,
  MAX_SLOTS_PER_DAY,
  DAY_NAMES,
  getDayName,
  type TimeSlot,
} from '@/lib/utils/availability'

describe('Availability Utilities', () => {
  // ============================================================
  // Time Conversion Tests
  // ============================================================
  describe('timeToMinutes', () => {
    it('should convert midnight (00:00) to 0 minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0)
    })

    it('should convert noon (12:00) to 720 minutes', () => {
      expect(timeToMinutes('12:00')).toBe(720)
    })

    it('should convert 23:59 to 1439 minutes', () => {
      expect(timeToMinutes('23:59')).toBe(1439)
    })

    it('should handle arbitrary times correctly', () => {
      expect(timeToMinutes('09:30')).toBe(570)
      expect(timeToMinutes('14:45')).toBe(885)
      expect(timeToMinutes('08:15')).toBe(495)
    })

    it('should handle single-digit hours', () => {
      expect(timeToMinutes('09:00')).toBe(540)
      expect(timeToMinutes('01:30')).toBe(90)
    })
  })

  describe('minutesToTime', () => {
    it('should convert 0 minutes to 00:00', () => {
      expect(minutesToTime(0)).toBe('00:00')
    })

    it('should convert 720 minutes to 12:00', () => {
      expect(minutesToTime(720)).toBe('12:00')
    })

    it('should convert 1439 minutes to 23:59', () => {
      expect(minutesToTime(1439)).toBe('23:59')
    })

    it('should pad hours and minutes with zeros', () => {
      expect(minutesToTime(90)).toBe('01:30')
      expect(minutesToTime(65)).toBe('01:05')
      expect(minutesToTime(5)).toBe('00:05')
    })
  })

  describe('timeToMinutes and minutesToTime roundtrip', () => {
    it('should maintain consistency in roundtrip conversion', () => {
      const times = ['00:00', '06:30', '09:15', '12:00', '18:45', '23:59']
      
      for (const time of times) {
        const minutes = timeToMinutes(time)
        const result = minutesToTime(minutes)
        expect(result).toBe(time)
      }
    })
  })

  // ============================================================
  // Overlap Detection Tests
  // ============================================================
  describe('doTimesOverlap', () => {
    it('should detect overlap when ranges fully overlap', () => {
      // 9:00-11:00 overlaps with 10:00-12:00
      expect(doTimesOverlap('09:00', '11:00', '10:00', '12:00')).toBe(true)
    })

    it('should detect overlap when one range contains another', () => {
      // 09:00-17:00 contains 10:00-12:00
      expect(doTimesOverlap('09:00', '17:00', '10:00', '12:00')).toBe(true)
      // 10:00-12:00 is contained in 09:00-17:00
      expect(doTimesOverlap('10:00', '12:00', '09:00', '17:00')).toBe(true)
    })

    it('should detect overlap when ranges partially overlap', () => {
      // 09:00-11:00 overlaps with 10:30-12:00
      expect(doTimesOverlap('09:00', '11:00', '10:30', '12:00')).toBe(true)
    })

    it('should NOT detect overlap for adjacent slots (end touches start)', () => {
      // 09:00-10:00 and 10:00-11:00 should NOT overlap (adjacent is OK)
      expect(doTimesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false)
    })

    it('should NOT detect overlap for completely separate ranges', () => {
      // 09:00-10:00 and 11:00-12:00 should NOT overlap
      expect(doTimesOverlap('09:00', '10:00', '11:00', '12:00')).toBe(false)
      // 14:00-15:00 and 09:00-10:00 should NOT overlap
      expect(doTimesOverlap('14:00', '15:00', '09:00', '10:00')).toBe(false)
    })

    it('should detect overlap for identical ranges', () => {
      expect(doTimesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true)
    })

    it('should handle edge case: 1-minute overlap', () => {
      // 09:00-10:01 overlaps with 10:00-11:00
      expect(doTimesOverlap('09:00', '10:01', '10:00', '11:00')).toBe(true)
    })
  })

  // ============================================================
  // Slot Overlap Checking Tests
  // ============================================================
  describe('checkSlotOverlap', () => {
    const existingSlots: TimeSlot[] = [
      { id: '1', day_of_week: 1, start_time: '09:00', end_time: '11:00', is_active: true },
      { id: '2', day_of_week: 1, start_time: '14:00', end_time: '16:00', is_active: true },
      { id: '3', day_of_week: 2, start_time: '10:00', end_time: '12:00', is_active: true },
      { id: '4', day_of_week: 1, start_time: '18:00', end_time: '19:00', is_active: false }, // Inactive
    ]

    it('should detect overlap with existing slot on same day', () => {
      const newSlot: TimeSlot = { day_of_week: 1, start_time: '10:00', end_time: '12:00' }
      const result = checkSlotOverlap(newSlot, existingSlots)
      
      expect(result.isOverlapping).toBe(true)
      expect(result.overlappingSlot?.id).toBe('1')
    })

    it('should NOT detect overlap with slots on different days', () => {
      const newSlot: TimeSlot = { day_of_week: 3, start_time: '09:00', end_time: '11:00' }
      const result = checkSlotOverlap(newSlot, existingSlots)
      
      expect(result.isOverlapping).toBe(false)
    })

    it('should NOT detect overlap with inactive slots', () => {
      const newSlot: TimeSlot = { day_of_week: 1, start_time: '17:30', end_time: '19:30' }
      const result = checkSlotOverlap(newSlot, existingSlots)
      
      // Should only overlap with active slots - slot 4 (18:00-19:00) is inactive
      expect(result.isOverlapping).toBe(false)
    })

    it('should allow adjacent slots', () => {
      const newSlot: TimeSlot = { day_of_week: 1, start_time: '11:00', end_time: '13:00' }
      const result = checkSlotOverlap(newSlot, existingSlots)
      
      // 11:00-13:00 is adjacent to 09:00-11:00 (slot 1)
      expect(result.isOverlapping).toBe(false)
    })

    it('should exclude specific slot ID from comparison', () => {
      // Simulating update: checking if updated slot overlaps (excluding itself)
      const newSlot: TimeSlot = { day_of_week: 1, start_time: '09:30', end_time: '10:30' }
      
      // Without exclusion - should overlap with slot 1
      const resultWithoutExclusion = checkSlotOverlap(newSlot, existingSlots)
      expect(resultWithoutExclusion.isOverlapping).toBe(true)
      
      // With exclusion - should NOT overlap (we're updating slot 1)
      const resultWithExclusion = checkSlotOverlap(newSlot, existingSlots, '1')
      expect(resultWithExclusion.isOverlapping).toBe(false)
    })

    it('should handle empty existing slots', () => {
      const newSlot: TimeSlot = { day_of_week: 1, start_time: '09:00', end_time: '11:00' }
      const result = checkSlotOverlap(newSlot, [])
      
      expect(result.isOverlapping).toBe(false)
    })

    it('should return the overlapping slot details', () => {
      const newSlot: TimeSlot = { day_of_week: 1, start_time: '15:00', end_time: '17:00' }
      const result = checkSlotOverlap(newSlot, existingSlots)
      
      expect(result.isOverlapping).toBe(true)
      expect(result.overlappingSlot).toEqual({
        id: '2',
        day_of_week: 1,
        start_time: '14:00',
        end_time: '16:00',
        is_active: true,
      })
    })
  })

  // ============================================================
  // Time Validation Tests
  // ============================================================
  describe('isValidTimeFormat', () => {
    it('should accept valid 24-hour format times', () => {
      expect(isValidTimeFormat('00:00')).toBe(true)
      expect(isValidTimeFormat('09:30')).toBe(true)
      expect(isValidTimeFormat('12:00')).toBe(true)
      expect(isValidTimeFormat('23:59')).toBe(true)
    })

    it('should reject invalid hour values', () => {
      expect(isValidTimeFormat('24:00')).toBe(false)
      expect(isValidTimeFormat('25:00')).toBe(false)
      expect(isValidTimeFormat('99:00')).toBe(false)
    })

    it('should reject invalid minute values', () => {
      expect(isValidTimeFormat('12:60')).toBe(false)
      expect(isValidTimeFormat('12:99')).toBe(false)
    })

    it('should reject invalid formats', () => {
      expect(isValidTimeFormat('9:00')).toBe(false) // Missing leading zero
      expect(isValidTimeFormat('9:0')).toBe(false)
      expect(isValidTimeFormat('900')).toBe(false)
      expect(isValidTimeFormat('09-00')).toBe(false)
      expect(isValidTimeFormat('')).toBe(false)
      expect(isValidTimeFormat('abc')).toBe(false)
      expect(isValidTimeFormat('12:00:00')).toBe(false) // With seconds
    })
  })

  describe('isValidTimeRange', () => {
    it('should accept valid ranges where end > start', () => {
      expect(isValidTimeRange('09:00', '10:00')).toBe(true)
      expect(isValidTimeRange('09:00', '17:00')).toBe(true)
      expect(isValidTimeRange('00:00', '23:59')).toBe(true)
    })

    it('should reject ranges where end <= start', () => {
      expect(isValidTimeRange('10:00', '09:00')).toBe(false)
      expect(isValidTimeRange('10:00', '10:00')).toBe(false)
    })

    it('should reject overnight ranges (midnight crossing)', () => {
      // 23:00 to 01:00 - this would require special handling
      expect(isValidTimeRange('23:00', '01:00')).toBe(false)
    })
  })

  // ============================================================
  // Slot Counting Tests
  // ============================================================
  describe('countSlotsOnDay', () => {
    const slots: TimeSlot[] = [
      { id: '1', day_of_week: 1, start_time: '09:00', end_time: '10:00', is_active: true },
      { id: '2', day_of_week: 1, start_time: '11:00', end_time: '12:00', is_active: true },
      { id: '3', day_of_week: 1, start_time: '14:00', end_time: '15:00', is_active: false },
      { id: '4', day_of_week: 2, start_time: '09:00', end_time: '10:00', is_active: true },
    ]

    it('should count active slots on a specific day', () => {
      expect(countSlotsOnDay(slots, 1)).toBe(2) // Only active slots on Monday
      expect(countSlotsOnDay(slots, 2)).toBe(1) // Tuesday
      expect(countSlotsOnDay(slots, 3)).toBe(0) // Wednesday (no slots)
    })

    it('should exclude inactive slots from count', () => {
      // Slot 3 on Monday is inactive, so only 2 active slots
      expect(countSlotsOnDay(slots, 1)).toBe(2)
    })

    it('should exclude specific ID from count', () => {
      expect(countSlotsOnDay(slots, 1, '1')).toBe(1)
      expect(countSlotsOnDay(slots, 1, '2')).toBe(1)
    })

    it('should return 0 for empty slots array', () => {
      expect(countSlotsOnDay([], 1)).toBe(0)
    })
  })

  // ============================================================
  // Complete Slot Validation Tests
  // ============================================================
  describe('validateSlot', () => {
    it('should validate a complete valid slot', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject slot without day_of_week', () => {
      const slot: Partial<TimeSlot> = {
        start_time: '09:00',
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('day_of_week')
    })

    it('should reject slot without start_time', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 1,
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('start_time')
    })

    it('should reject slot without end_time', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 1,
        start_time: '09:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('end_time')
    })

    it('should reject slot with invalid day_of_week (< 0)', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: -1,
        start_time: '09:00',
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('day_of_week')
    })

    it('should reject slot with invalid day_of_week (> 6)', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 7,
        start_time: '09:00',
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('day_of_week')
    })

    it('should reject slot with invalid time format', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 1,
        start_time: '9:00', // Invalid format
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('HH:mm')
    })

    it('should reject slot where end_time is before start_time', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 1,
        start_time: '11:00',
        end_time: '09:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('end_time must be after start_time')
    })

    it('should accept day_of_week = 0 (Sunday)', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 0,
        start_time: '09:00',
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(true)
    })

    it('should accept day_of_week = 6 (Saturday)', () => {
      const slot: Partial<TimeSlot> = {
        day_of_week: 6,
        start_time: '09:00',
        end_time: '11:00',
      }
      const result = validateSlot(slot)
      expect(result.isValid).toBe(true)
    })
  })

  // ============================================================
  // Constants Tests
  // ============================================================
  describe('Constants', () => {
    it('should have MAX_SLOTS_PER_DAY set to 5', () => {
      expect(MAX_SLOTS_PER_DAY).toBe(5)
    })

    it('should have correct DAY_NAMES', () => {
      expect(DAY_NAMES).toEqual([
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ])
    })

    it('should getDayName return correct day names', () => {
      expect(getDayName(0)).toBe('Sunday')
      expect(getDayName(1)).toBe('Monday')
      expect(getDayName(2)).toBe('Tuesday')
      expect(getDayName(3)).toBe('Wednesday')
      expect(getDayName(4)).toBe('Thursday')
      expect(getDayName(5)).toBe('Friday')
      expect(getDayName(6)).toBe('Saturday')
    })

    it('should getDayName return "Unknown" for invalid day numbers', () => {
      expect(getDayName(7)).toBe('Unknown')
      expect(getDayName(-1)).toBe('Unknown')
    })
  })
})
