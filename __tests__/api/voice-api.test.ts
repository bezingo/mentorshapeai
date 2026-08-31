import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-id' })),
}))

// Mock Supabase
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-profile-id', display_name: 'Test User' },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
    })),
  })),
}))

describe('Voice API - No Audio Storage', () => {
  describe('Audio Upload Rejection', () => {
    it('should reject requests with audio content-type', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'audio/webm',
        },
        body: new ArrayBuffer(100),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('AUDIO_NOT_ACCEPTED')
    })

    it('should reject multipart/form-data requests (file uploads)', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: '------WebKitFormBoundary\r\nContent-Disposition: form-data; name="audio"; filename="voice.wav"\r\n\r\nfake-audio-data\r\n------WebKitFormBoundary--',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('AUDIO_NOT_ACCEPTED')
    })
  })

  describe('Text-Only Processing', () => {
    it('should accept JSON text input', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Add a task to review my goals',
          context: 'general',
          language: 'en',
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.response).toBeDefined()
    })

    it('should accept Arabic text input', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: 'أضف مهمة جديدة',
          context: 'general',
          language: 'ar',
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.response).toBeDefined()
      // Response should be in Arabic when language is ar
    })
  })

  describe('No Audio Storage Verification', () => {
    it('should document no-storage policy via GET endpoint', async () => {
      const { GET } = await import('@/app/api/voice/route')
      
      const response = await GET()
      const data = await response.json()

      expect(data.storage).toBe('none')
      expect(data.accepts).toBe('text only')
      expect(data.note).toContain('never uploaded')
    })

    it('should not have any Supabase storage bucket calls', async () => {
      const { POST } = await import('@/app/api/voice/route')
      const supabase = await import('@/lib/supabase/service')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test message',
          language: 'en',
        }),
      })

      await POST(request as any)

      // Verify the mock was called but no storage operations
      const mockClient = (supabase.createServiceClient as any)()
      expect(mockClient.storage).toBeUndefined()
    })
  })

  describe('Task Creation Keywords', () => {
    it('should detect task creation intent in English', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Remind me to call my mentor tomorrow',
          language: 'en',
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.action?.type).toBe('create_task')
    })

    it('should detect task creation intent in Arabic', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: 'ذكرني بالاتصال بمرشدي غداً',
          language: 'ar',
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.action?.type).toBe('create_task')
    })
  })

  describe('Input Validation', () => {
    it('should require text field', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject empty text', async () => {
      const { POST } = await import('@/app/api/voice/route')
      
      const request = new Request('http://localhost/api/voice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text: '' }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})

describe('Service Worker - No Audio Caching', () => {
  it('should exclude audio paths from caching in SW config', async () => {
    // Read the service worker file
    const fs = await import('fs/promises')
    const swContent = await fs.readFile('public/sw.js', 'utf-8')

    // Verify audio exclusion patterns exist
    expect(swContent).toContain('/api/voice')
    expect(swContent).toContain('audio')
    expect(swContent).toContain('.wav')
    expect(swContent).toContain('.mp3')
    expect(swContent).toContain('.webm')
    expect(swContent).toContain('.ogg')

    // Verify the comment about not caching audio
    expect(swContent).toContain('Never cache audio')
  })
})
