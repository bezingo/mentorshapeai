/**
 * CSV Parser for participant imports
 * 
 * Expected format:
 * email,name,role,year_grade (optional)
 * 
 * Roles: mentee | mentor
 */

import { z } from 'zod'

/**
 * Schema for a single participant row
 */
export const ParticipantRowSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['mentee', 'mentor'], {
    errorMap: () => ({ message: 'Role must be either "mentee" or "mentor"' }),
  }),
  year_grade: z.string().max(50).optional().nullable(),
})

export type ParticipantRow = z.infer<typeof ParticipantRowSchema>

/**
 * Result of parsing a CSV
 */
export interface ParseResult {
  success: boolean
  participants: ParticipantRow[]
  errors: Array<{
    row: number
    field: string
    message: string
    rawValue?: string
  }>
  warnings: Array<{
    row: number
    message: string
  }>
  stats: {
    totalRows: number
    validRows: number
    menteeCount: number
    mentorCount: number
    duplicateEmails: string[]
  }
}

/**
 * Parse CSV content into participant rows
 */
export function parseParticipantCSV(csvContent: string): ParseResult {
  const lines = csvContent.trim().split('\n')
  const participants: ParticipantRow[] = []
  const errors: ParseResult['errors'] = []
  const warnings: ParseResult['warnings'] = []
  const seenEmails = new Set<string>()
  const duplicateEmails: string[] = []

  if (lines.length === 0) {
    return {
      success: false,
      participants: [],
      errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }],
      warnings: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        menteeCount: 0,
        mentorCount: 0,
        duplicateEmails: [],
      },
    }
  }

  // Parse header row
  const headerLine = lines[0].toLowerCase().trim()
  const headers = parseCSVLine(headerLine)
  
  // Find column indices
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'e-mail' || h === 'email address')
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'full name' || h === 'fullname')
  const roleIdx = headers.findIndex(h => h === 'role' || h === 'type')
  const yearIdx = headers.findIndex(h => h === 'year' || h === 'grade' || h === 'year_grade' || h === 'year/grade')

  if (emailIdx === -1) {
    errors.push({ row: 1, field: 'header', message: 'Missing "email" column in header' })
  }
  if (nameIdx === -1) {
    errors.push({ row: 1, field: 'header', message: 'Missing "name" column in header' })
  }
  if (roleIdx === -1) {
    errors.push({ row: 1, field: 'header', message: 'Missing "role" column in header' })
  }

  if (errors.length > 0) {
    return {
      success: false,
      participants: [],
      errors,
      warnings: [],
      stats: {
        totalRows: lines.length - 1,
        validRows: 0,
        menteeCount: 0,
        mentorCount: 0,
        duplicateEmails: [],
      },
    }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const rowNum = i + 1 // 1-indexed for user display
    const values = parseCSVLine(line)

    const email = values[emailIdx]?.trim().toLowerCase()
    const name = values[nameIdx]?.trim()
    const roleRaw = values[roleIdx]?.trim().toLowerCase()
    const yearGrade = yearIdx >= 0 ? values[yearIdx]?.trim() || null : null

    // Check for duplicates
    if (email && seenEmails.has(email)) {
      duplicateEmails.push(email)
      warnings.push({ row: rowNum, message: `Duplicate email: ${email}` })
      continue
    }
    if (email) seenEmails.add(email)

    // Normalize role
    let role: 'mentee' | 'mentor' | undefined
    if (roleRaw === 'mentee' || roleRaw === 'student') {
      role = 'mentee'
    } else if (roleRaw === 'mentor' || roleRaw === 'teacher' || roleRaw === 'staff') {
      role = 'mentor'
    }

    // Validate the row
    const result = ParticipantRowSchema.safeParse({
      email,
      name,
      role,
      year_grade: yearGrade,
    })

    if (result.success) {
      participants.push(result.data)
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path.join('.'),
          message: issue.message,
          rawValue: String(values[issue.path[0] === 'email' ? emailIdx : issue.path[0] === 'name' ? nameIdx : roleIdx] || ''),
        })
      }
    }
  }

  const menteeCount = participants.filter(p => p.role === 'mentee').length
  const mentorCount = participants.filter(p => p.role === 'mentor').length

  return {
    success: errors.length === 0,
    participants,
    errors,
    warnings,
    stats: {
      totalRows: lines.length - 1,
      validRows: participants.length,
      menteeCount,
      mentorCount,
      duplicateEmails,
    },
  }
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Generate a sample CSV template
 */
export function generateCSVTemplate(): string {
  return `email,name,role,year_grade
student1@school.edu,John Smith,mentee,Grade 11
student2@school.edu,Jane Doe,mentee,Grade 12
mentor1@school.edu,Dr. Alice Brown,mentor,
mentor2@company.com,Bob Wilson,mentor,`
}
