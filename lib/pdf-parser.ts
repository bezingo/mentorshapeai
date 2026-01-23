/**
 * PDF and Document parsing utilities
 * Supports PDF and DOCX text extraction for CV/resume parsing
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth')

// PDF parsing is done dynamically to avoid type issues with pdf-parse v2

/**
 * Maximum file size allowed (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Allowed MIME types for CV upload
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt']

/**
 * Clean extracted text for better parsing
 * - Normalizes whitespace
 * - Removes excessive blank lines
 * - Trims content
 */
function cleanExtractedText(text: string): string {
  return text
    // Normalize whitespace (convert multiple spaces/tabs to single space)
    .replace(/[ \t]+/g, ' ')
    // Normalize newlines (convert multiple newlines to double newline for paragraph separation)
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace from each line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Final trim
    .trim()
}

/**
 * Extract text from a PDF file using pdf-parse v2
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Dynamic import to avoid type issues with pdf-parse v2
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()

    const text = result.text

    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images. Please upload a PDF with selectable text.')
    }

    return cleanExtractedText(text)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown PDF parsing error'

    // Handle common PDF parsing errors with user-friendly messages
    if (message.includes('encrypted') || message.includes('password')) {
      throw new Error('PDF is password protected. Please upload an unprotected PDF.')
    }

    if (message.includes('Invalid PDF')) {
      throw new Error('Invalid PDF file. Please ensure the file is not corrupted.')
    }

    // Re-throw if it's already a user-friendly message
    if (message.includes('PDF appears to be empty')) {
      throw error
    }

    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF. Please try uploading a different file.')
  }
}

/**
 * Extract text from a DOCX file
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await mammoth.extractRawText({ buffer })
    const text = result.value

    if (!text || text.trim().length === 0) {
      throw new Error('DOCX appears to be empty. Please upload a document with content.')
    }

    // Log any warnings for debugging
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages)
    }

    return cleanExtractedText(text)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown DOCX parsing error'

    // Re-throw if it's already a user-friendly message
    if (message.includes('DOCX appears to be empty')) {
      throw error
    }

    console.error('DOCX extraction error:', error)
    throw new Error('Failed to extract text from DOCX. Please try uploading a different file.')
  }
}

/**
 * Extract text from a plain text file
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  try {
    const text = await file.text()

    if (!text || text.trim().length === 0) {
      throw new Error('Text file appears to be empty.')
    }

    return cleanExtractedText(text)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('empty')) {
      throw error
    }

    console.error('TXT extraction error:', error)
    throw new Error('Failed to read text file.')
  }
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    }
  }

  // Check MIME type
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.type)

  // Check extension as fallback
  const fileName = file.name.toLowerCase()
  const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))

  if (!isValidMime && !isValidExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, DOCX, or TXT file.',
    }
  }

  return { valid: true }
}

/**
 * Extract text from any supported file type
 * Automatically detects file type and uses appropriate parser
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const fileType = file.type
  const fileName = file.name.toLowerCase()

  // Determine file type from MIME or extension
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await extractTextFromTXT(file)
  }

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await extractTextFromPDF(file)
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return await extractTextFromDOCX(file)
  }

  throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT file.')
}

