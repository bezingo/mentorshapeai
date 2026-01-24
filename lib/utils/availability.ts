/**
 * Availability utility functions for detecting overlapping time slots
 * and managing weekly availability patterns.
 */

export interface TimeSlot {
  id?: string
  day_of_week: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:mm format
  end_time: string // HH:mm format
  timezone?: string
  is_active?: boolean
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Check if two time ranges overlap
 * Adjacent slots (one ends when another starts) are NOT considered overlapping
 * 
 * @param start1 - Start time of first slot (HH:mm)
 * @param end1 - End time of first slot (HH:mm)
 * @param start2 - Start time of second slot (HH:mm)
 * @param end2 - End time of second slot (HH:mm)
 * @returns True if slots overlap, false otherwise
 */
export function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1)
  const end1Min = timeToMinutes(end1)
  const start2Min = timeToMinutes(start2)
  const end2Min = timeToMinutes(end2)

  // Two ranges overlap if one starts before the other ends and vice versa
  // Using < instead of <= to allow adjacent slots (e.g., 9:00-10:00 and 10:00-11:00)
  return start1Min < end2Min && start2Min < end1Min
}

/**
 * Check if a new slot would overlap with any existing slots on the same day
 * 
 * @param newSlot - The new slot to check
 * @param existingSlots - Array of existing slots to check against
 * @param excludeId - Optional ID to exclude from comparison (for updates)
 * @returns Object with isOverlapping boolean and overlappingSlot if found
 */
export function checkSlotOverlap(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[],
  excludeId?: string
): { isOverlapping: boolean; overlappingSlot?: TimeSlot } {
  // Filter to slots on the same day (excluding the slot being updated)
  const sameDaySlots = existingSlots.filter(
    slot => 
      slot.day_of_week === newSlot.day_of_week && 
      slot.id !== excludeId &&
      slot.is_active !== false // Only check active slots
  )

  for (const existingSlot of sameDaySlots) {
    if (doTimesOverlap(
      newSlot.start_time,
      newSlot.end_time,
      existingSlot.start_time,
      existingSlot.end_time
    )) {
      return { isOverlapping: true, overlappingSlot: existingSlot }
    }
  }

  return { isOverlapping: false }
}

/**
 * Validate that end_time is after start_time
 * 
 * @param start_time - Start time (HH:mm)
 * @param end_time - End time (HH:mm)
 * @returns True if valid, false otherwise
 */
export function isValidTimeRange(start_time: string, end_time: string): boolean {
  return timeToMinutes(end_time) > timeToMinutes(start_time)
}

/**
 * Validate time format (HH:mm)
 * 
 * @param time - Time string to validate
 * @returns True if valid format, false otherwise
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}

/**
 * Count slots per day for a given profile
 * 
 * @param slots - Array of slots
 * @param dayOfWeek - Day to count (0-6)
 * @param excludeId - Optional ID to exclude from count
 * @returns Number of active slots on that day
 */
export function countSlotsOnDay(
  slots: TimeSlot[],
  dayOfWeek: number,
  excludeId?: string
): number {
  return slots.filter(
    slot => 
      slot.day_of_week === dayOfWeek && 
      slot.id !== excludeId &&
      slot.is_active !== false
  ).length
}

/**
 * Maximum slots allowed per day
 */
export const MAX_SLOTS_PER_DAY = 5

/**
 * Day names for display
 */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

/**
 * Get day name from day_of_week number
 */
export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || 'Unknown'
}

/**
 * Validate a complete availability slot
 * 
 * @param slot - Slot to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSlot(slot: Partial<TimeSlot>): { 
  isValid: boolean
  error?: string 
} {
  // Check required fields
  if (slot.day_of_week === undefined || slot.day_of_week === null) {
    return { isValid: false, error: 'day_of_week is required' }
  }

  if (!slot.start_time) {
    return { isValid: false, error: 'start_time is required' }
  }

  if (!slot.end_time) {
    return { isValid: false, error: 'end_time is required' }
  }

  // Validate day_of_week range
  if (slot.day_of_week < 0 || slot.day_of_week > 6) {
    return { isValid: false, error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' }
  }

  // Validate time formats
  if (!isValidTimeFormat(slot.start_time)) {
    return { isValid: false, error: 'start_time must be in HH:mm format (00:00-23:59)' }
  }

  if (!isValidTimeFormat(slot.end_time)) {
    return { isValid: false, error: 'end_time must be in HH:mm format (00:00-23:59)' }
  }

  // Validate time range
  if (!isValidTimeRange(slot.start_time, slot.end_time)) {
    return { isValid: false, error: 'end_time must be after start_time' }
  }

  return { isValid: true }
}
