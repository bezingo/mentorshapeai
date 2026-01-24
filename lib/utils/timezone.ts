/**
 * Timezone conversion utilities for availability management.
 * Handles timezone conversions, DST transitions, and IANA timezone validation.
 */

/**
 * Common IANA timezone identifiers organized by region
 */
export const COMMON_TIMEZONES = {
  'North America': [
    'America/New_York',      // Eastern
    'America/Chicago',       // Central
    'America/Denver',        // Mountain
    'America/Los_Angeles',   // Pacific
    'America/Phoenix',       // Arizona (no DST)
    'America/Anchorage',     // Alaska
    'Pacific/Honolulu',      // Hawaii
    'America/Toronto',       // Canada Eastern
    'America/Vancouver',     // Canada Pacific
  ],
  'Europe': [
    'Europe/London',         // GMT/BST
    'Europe/Paris',          // CET
    'Europe/Berlin',         // CET
    'Europe/Amsterdam',      // CET
    'Europe/Madrid',         // CET
    'Europe/Rome',           // CET
    'Europe/Zurich',         // CET
    'Europe/Stockholm',      // CET
    'Europe/Vienna',         // CET
    'Europe/Warsaw',         // CET
    'Europe/Athens',         // EET
    'Europe/Moscow',         // MSK
  ],
  'Asia': [
    'Asia/Dubai',            // GST
    'Asia/Kolkata',          // IST
    'Asia/Singapore',        // SGT
    'Asia/Hong_Kong',        // HKT
    'Asia/Tokyo',            // JST
    'Asia/Seoul',            // KST
    'Asia/Shanghai',         // CST China
    'Asia/Bangkok',          // ICT
    'Asia/Jakarta',          // WIB
  ],
  'Pacific': [
    'Australia/Sydney',      // AEST/AEDT
    'Australia/Melbourne',   // AEST/AEDT
    'Australia/Brisbane',    // AEST (no DST)
    'Australia/Perth',       // AWST
    'Pacific/Auckland',      // NZST/NZDT
    'Pacific/Fiji',          // FJT
  ],
  'Other': [
    'UTC',
    'Africa/Johannesburg',   // SAST
    'Africa/Cairo',          // EET
    'America/Sao_Paulo',     // BRT
    'America/Mexico_City',   // CST Mexico
  ],
} as const

/**
 * Flat list of all common timezones
 */
export const ALL_TIMEZONES = Object.values(COMMON_TIMEZONES).flat()

/**
 * Check if a timezone string is a valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Get the user's detected timezone from browser
 * Falls back to UTC if detection fails
 */
export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Get the current UTC offset string for a timezone (e.g., "+05:30", "-08:00")
 * 
 * @param timezone - IANA timezone identifier
 * @param date - Optional date to check offset for (defaults to now)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(date)
    const offsetPart = parts.find(p => p.type === 'timeZoneName')
    if (offsetPart) {
      // Convert "GMT+5:30" to "+05:30" format
      const match = offsetPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
      if (match) {
        const [, sign, hours, minutes = '00'] = match
        return `${sign}${hours.padStart(2, '0')}:${minutes}`
      }
      if (offsetPart.value === 'GMT') {
        return '+00:00'
      }
    }
    return '+00:00'
  } catch {
    return '+00:00'
  }
}

/**
 * Get timezone offset in minutes for a specific date
 * 
 * @param timezone - IANA timezone identifier
 * @param date - Date to check offset for
 * @returns Offset in minutes (positive = ahead of UTC)
 */
export function getTimezoneOffsetMinutes(timezone: string, date: Date = new Date()): number {
  try {
    // Create a formatter that outputs in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    
    // Format the date in the target timezone
    const parts = formatter.formatToParts(date)
    const getPart = (type: string) => {
      const part = parts.find(p => p.type === type)
      return part ? parseInt(part.value, 10) : 0
    }
    
    // Create a UTC date with the same calendar values
    const tzDate = new Date(Date.UTC(
      getPart('year'),
      getPart('month') - 1,
      getPart('day'),
      getPart('hour'),
      getPart('minute')
    ))
    
    // The difference is the offset
    return Math.round((date.getTime() - tzDate.getTime()) / 60000) * -1
  } catch {
    return 0
  }
}

/**
 * Convert a time slot from one timezone to another for a specific date
 * 
 * @param time - Time in HH:mm format
 * @param sourceTimezone - Source IANA timezone
 * @param targetTimezone - Target IANA timezone
 * @param date - The specific date (to handle DST correctly)
 * @returns Converted time in HH:mm format
 */
export function convertTime(
  time: string,
  sourceTimezone: string,
  targetTimezone: string,
  date: Date = new Date()
): string {
  const [hours, minutes] = time.split(':').map(Number)
  
  // Create a date object in the source timezone
  // We need to construct a date string that JavaScript will interpret correctly
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  
  // Create a UTC date then adjust for source timezone
  const sourceDate = new Date(Date.UTC(year, month, day, hours, minutes, 0))
  
  // Get the offset differences
  const sourceOffset = getTimezoneOffsetMinutes(sourceTimezone, sourceDate)
  const targetOffset = getTimezoneOffsetMinutes(targetTimezone, sourceDate)
  
  // Calculate the time in the target timezone
  const diffMinutes = targetOffset - sourceOffset
  const targetDate = new Date(sourceDate.getTime() + diffMinutes * 60000)
  
  // Format as HH:mm
  const targetHours = targetDate.getUTCHours()
  const targetMinutes = targetDate.getUTCMinutes()
  
  return `${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`
}

/**
 * Convert a time slot from a timezone to UTC for a specific date
 * 
 * @param time - Time in HH:mm format in the source timezone
 * @param timezone - Source IANA timezone
 * @param date - The specific date (for DST calculation)
 * @returns Date object in UTC
 */
export function timeToUTC(
  time: string,
  timezone: string,
  date: Date = new Date()
): Date {
  const [hours, minutes] = time.split(':').map(Number)
  
  // Create a date string in ISO format with the timezone
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  
  // Format: "2024-01-15T09:00:00" in the source timezone
  const dateStr = `${year}-${month}-${day}T${time}:00`
  
  // Get timezone offset for this specific date/time
  const tempDate = new Date(dateStr + 'Z')
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, tempDate)
  
  // Create the UTC date by subtracting the offset
  const utcDate = new Date(tempDate.getTime() - offsetMinutes * 60000)
  
  return utcDate
}

/**
 * Convert a UTC date to a time string in a specific timezone
 * 
 * @param utcDate - Date object in UTC
 * @param timezone - Target IANA timezone
 * @returns Time in HH:mm format in the target timezone
 */
export function utcToTime(utcDate: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  return formatter.format(utcDate)
}

/**
 * Get a formatted timezone label for display
 * 
 * @param timezone - IANA timezone identifier
 * @returns Formatted label like "(GMT+05:30) Asia/Kolkata"
 */
export function getTimezoneLabel(timezone: string): string {
  const offset = getTimezoneOffset(timezone)
  const offsetStr = offset === '+00:00' ? 'GMT' : `GMT${offset}`
  return `(${offsetStr}) ${timezone.replace(/_/g, ' ')}`
}

/**
 * Expand a weekly availability pattern to specific dates within a range
 * 
 * @param dayOfWeek - Day of week (0-6)
 * @param startTime - Start time (HH:mm)
 * @param endTime - End time (HH:mm)
 * @param timezone - Slot timezone
 * @param fromDate - Start of date range
 * @param toDate - End of date range
 * @returns Array of expanded slots with specific dates
 */
export function expandAvailabilityToDateRange(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  timezone: string,
  fromDate: Date,
  toDate: Date
): Array<{
  date: string // YYYY-MM-DD
  start_time: string // HH:mm
  end_time: string // HH:mm
  start_utc: Date
  end_utc: Date
}> {
  const slots: Array<{
    date: string
    start_time: string
    end_time: string
    start_utc: Date
    end_utc: Date
  }> = []
  
  // Normalize dates to start of day
  const from = new Date(fromDate)
  from.setHours(0, 0, 0, 0)
  
  const to = new Date(toDate)
  to.setHours(23, 59, 59, 999)
  
  // Iterate through each day in the range
  const currentDate = new Date(from)
  
  while (currentDate <= to) {
    if (currentDate.getDay() === dayOfWeek) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Convert times to UTC for this specific date
      const startUtc = timeToUTC(startTime, timezone, currentDate)
      const endUtc = timeToUTC(endTime, timezone, currentDate)
      
      slots.push({
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        start_utc: startUtc,
        end_utc: endUtc,
      })
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return slots
}

/**
 * Check if two time ranges (in UTC) overlap
 * 
 * @param start1 - Start of first range (Date)
 * @param end1 - End of first range (Date)
 * @param start2 - Start of second range (Date)
 * @param end2 - End of second range (Date)
 * @returns True if ranges overlap
 */
export function doDateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Subtract busy blocks from available slots
 * 
 * @param slots - Array of available slots (with start_utc, end_utc)
 * @param busyBlocks - Array of busy blocks (with start_time, end_time as Date)
 * @returns Array of available slots with busy blocks removed
 */
export function subtractBusyBlocks<T extends { start_utc: Date; end_utc: Date }>(
  slots: T[],
  busyBlocks: Array<{ start_time: Date; end_time: Date }>
): T[] {
  return slots.filter(slot => {
    // Check if any busy block overlaps with this slot
    for (const busy of busyBlocks) {
      if (doDateRangesOverlap(
        slot.start_utc,
        slot.end_utc,
        busy.start_time,
        busy.end_time
      )) {
        return false // This slot is blocked
      }
    }
    return true // Slot is available
  })
}
