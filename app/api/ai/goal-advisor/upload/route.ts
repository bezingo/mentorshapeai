import { NextRequest } from 'next/server'
import { getCurrentProfile, requireMentee } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { addMemoryResource } from '@/lib/ai/goal-context-builder'
import { extractTextFromPDF } from '@/lib/pdf-parser'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * File Upload Handler for Goal Advisor
 * 
 * Handles file uploads to Supabase Storage and extracts text content
 * for conversation memory/context.
 */
export async function POST(req: NextRequest) {
  try {
    await requireMentee()
    const profile = await getCurrentProfile()
    
    if (!profile) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    const formData = await req.formData()
    const file = formData.get('file') as File
    const conversationId = formData.get('conversationId') as string
    
    if (!file) {
      return new Response('No file provided', { status: 400 })
    }
    
    if (!conversationId) {
      return new Response('Conversation ID required', { status: 400 })
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return new Response('File too large (max 10MB)', { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return new Response('File type not supported', { status: 400 })
    }
    
    const supabase = createServiceClient()
    
    // Upload to Supabase Storage
    const fileName = `${conversationId}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('goal-advisor-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response('Failed to upload file', { status: 500 })
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('goal-advisor-attachments')
      .getPublicUrl(fileName)
    
    const publicUrl = urlData.publicUrl
    
    // Extract text content based on file type
    let extractedText = ''
    
    if (file.type === 'application/pdf') {
      try {
        const pdfText = await extractTextFromPDF(file)
        extractedText = pdfText
      } catch (error) {
        console.error('PDF parsing error:', error)
        extractedText = `[PDF file: ${file.name} - text extraction failed]`
      }
    } else if (file.type.startsWith('text/')) {
      extractedText = await file.text()
    } else if (file.type.startsWith('image/')) {
      extractedText = `[Image file: ${file.name}]`
    }
    
    // Add to conversation memory
    const memoryId = await addMemoryResource(
      conversationId,
      'file',
      extractedText || `[File: ${file.name}]`,
      {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        publicUrl,
        storagePath: fileName,
        uploadedAt: new Date().toISOString()
      }
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: memoryId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          publicUrl,
          extractedText: extractedText.substring(0, 500) // Preview only
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('File upload error:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Failed to upload file'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Get list of attachments for a conversation
 */
export async function GET(req: NextRequest) {
  try {
    await requireMentee()
    const profile = await getCurrentProfile()
    
    if (!profile) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return new Response('Conversation ID required', { status: 400 })
    }
    
    const supabase = createServiceClient()
    
    // Get attachments from memory
    const { data: memory, error } = await supabase
      .from('goal_conversation_memory')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('type', 'file')
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: (memory || []).map(m => ({
          id: m.id,
          fileName: m.metadata?.fileName,
          fileType: m.metadata?.fileType,
          fileSize: m.metadata?.fileSize,
          publicUrl: m.metadata?.publicUrl,
          uploadedAt: m.created_at
        }))
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Get attachments error:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Failed to get attachments'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
