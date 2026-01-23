import { useState, useCallback, useRef } from 'react'
import { parseLink, isUrl, extractUrls } from '@/lib/ai/link-parser'
import { addMemoryResource } from '@/lib/ai/goal-context-builder'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Custom hook for Goal Advisor chat
 * 
 * Simple implementation that calls our API directly.
 * Handles streaming responses and message state.
 */
export function useGoalAdvisor(goalId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Array<{
    id: string
    type: 'file' | 'link'
    name: string
    url?: string
    preview?: string
  }>>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [isParsingLink, setIsParsingLink] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  /**
   * Send a message to the Goal Advisor
   */
  const sendMessage = useCallback(async (message: { role: 'user'; content: string }) => {
    console.log('📤 sendMessage called:', message.content)
    
    // Add user message to state immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.content
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)
    
    // Create abort controller for this request
    abortControllerRef.current = new AbortController()
    
    try {
      const response = await fetch('/api/ai/goal-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          goalId,
          conversationId
        }),
        signal: abortControllerRef.current.signal
      })
      
      console.log('📨 API Response status:', response.status)
      
      // Get conversation ID from headers
      const newConversationId = response.headers.get('X-Conversation-Id')
      if (newConversationId && !conversationId) {
        console.log('💬 Got conversation ID:', newConversationId)
        setConversationId(newConversationId)
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API error: ${response.status}`)
      }
      
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }
      
      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantMessageId = `assistant-${Date.now()}`
      
      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      }])
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        console.log('📝 Received chunk:', chunk.slice(0, 50))
        
        // toTextStreamResponse sends raw text chunks
        assistantContent += chunk
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: assistantContent }
            : m
        ))
      }
      
      console.log('✅ Message complete:', assistantContent.slice(0, 100) + '...')
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🛑 Request aborted')
      } else {
        console.error('❌ Chat error:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, goalId, conversationId])
  
  /**
   * Stop the current streaming response
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])
  
  /**
   * Upload file to conversation memory
   */
  const uploadFile = useCallback(async (file: File) => {
    if (!conversationId) {
      throw new Error('Conversation not initialized')
    }
    
    setIsUploadingFile(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('conversationId', conversationId)
      
      const response = await fetch('/api/ai/goal-advisor/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Upload failed')
      }
      
      const result = await response.json()
      
      // Add to attachments list
      setAttachments(prev => [
        ...prev,
        {
          id: result.data.id,
          type: 'file',
          name: result.data.fileName,
          url: result.data.publicUrl,
          preview: result.data.extractedText
        }
      ])
      
      return result.data
      
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    } finally {
      setIsUploadingFile(false)
    }
  }, [conversationId])
  
  /**
   * Parse and add link to conversation memory
   */
  const addLink = useCallback(async (url: string) => {
    if (!conversationId) {
      throw new Error('Conversation not initialized')
    }
    
    setIsParsingLink(true)
    
    try {
      // Parse link content
      const parsed = await parseLink(url)
      
      // Add to memory (using context builder function)
      const memoryId = await addMemoryResource(
        conversationId,
        'link',
        parsed.content,
        {
          title: parsed.title,
          url: parsed.url,
          excerpt: parsed.excerpt,
          metadata: parsed.metadata
        }
      )
      
      // Add to attachments list
      setAttachments(prev => [
        ...prev,
        {
          id: memoryId,
          type: 'link',
          name: parsed.title,
          url: parsed.url,
          preview: parsed.excerpt
        }
      ])
      
      return parsed
      
    } catch (error) {
      console.error('Link parsing error:', error)
      throw error
    } finally {
      setIsParsingLink(false)
    }
  }, [conversationId])
  
  /**
   * Auto-detect and parse URLs in message before sending
   */
  const handleSubmitWithUrlDetection = useCallback(async (content: string) => {
    if (!content.trim()) return
    
    // Check for URLs in the message
    const urls = extractUrls(content)
    
    if (urls.length > 0 && conversationId) {
      // Parse URLs in parallel
      await Promise.allSettled(
        urls.map(url => addLink(url))
      )
    }
    
    // Submit the message
    await sendMessage({ role: 'user', content })
  }, [conversationId, addLink, sendMessage])
  
  /**
   * Remove attachment
   */
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])
  
  return {
    messages,
    sendMessage,
    isLoading,
    error,
    stop,
    conversationId,
    attachments,
    isUploadingFile,
    isParsingLink,
    uploadFile,
    addLink,
    removeAttachment,
    handleSubmitWithUrlDetection
  }
}
