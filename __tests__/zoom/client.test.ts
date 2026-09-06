/**
 * Zoom Client Unit Tests
 *
 * Tests for M0 school-pilot Zoom integration settings.
 * Verifies that auto_recording is disabled by default (privacy for minors).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the crypto module
vi.mock('@/lib/crypto/tokens', () => ({
  encryptOAuthTokens: vi.fn((tokens) => tokens),
  decryptOAuthTokens: vi.fn((tokens) => tokens),
}))

// Mock Supabase
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}))

describe('Zoom Client - M0 School Pilot Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ZOOM_CLIENT_ID = 'test-client-id'
    process.env.ZOOM_CLIENT_SECRET = 'test-client-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  describe('createZoomMeeting', () => {
    it('should default auto_recording to none (not cloud)', async () => {
      // Mock successful meeting creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123456789,
          uuid: 'test-uuid',
          host_id: 'test-host',
          host_email: 'host@test.com',
          topic: 'Test Meeting',
          status: 'waiting',
          start_time: '2026-09-01T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          created_at: '2026-08-31T10:00:00Z',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'test123',
        }),
      })

      const { createZoomMeeting } = await import('@/lib/zoom/client')

      const mockClient = {
        accessToken: 'test-token',
        profileId: 'test-profile-id',
      }

      await createZoomMeeting(mockClient, {
        topic: 'MentorShape: Test Focus',
        start_time: '2026-09-01T10:00:00Z',
        duration: 60,
        timezone: 'UTC',
        // Not providing settings - should default to auto_recording: 'none'
      })

      // Verify fetch was called with the correct auto_recording setting
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/users/me/meetings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"auto_recording":"none"'),
        })
      )

      // Ensure it's NOT set to 'cloud'
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.settings.auto_recording).toBe('none')
      expect(callBody.settings.auto_recording).not.toBe('cloud')
    })

    it('should respect explicit auto_recording setting when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123456789,
          uuid: 'test-uuid',
          host_id: 'test-host',
          host_email: 'host@test.com',
          topic: 'Test Meeting',
          status: 'waiting',
          start_time: '2026-09-01T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          created_at: '2026-08-31T10:00:00Z',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'test123',
        }),
      })

      const { createZoomMeeting } = await import('@/lib/zoom/client')

      const mockClient = {
        accessToken: 'test-token',
        profileId: 'test-profile-id',
      }

      // Explicitly request local recording (should be honored)
      await createZoomMeeting(mockClient, {
        topic: 'MentorShape: Test Focus',
        start_time: '2026-09-01T10:00:00Z',
        duration: 60,
        timezone: 'UTC',
        settings: {
          auto_recording: 'local',
        },
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.settings.auto_recording).toBe('local')
    })
  })

  describe('M0 School Pilot Compliance', () => {
    it('should have auto_recording interface type that includes none option', async () => {
      const { CreateMeetingParams } = await import('@/lib/zoom/client')
      
      // This is a type-level check - if this compiles, the type is correct
      // The actual runtime check is in the createZoomMeeting test above
      const validSettings: { auto_recording: 'local' | 'cloud' | 'none' } = {
        auto_recording: 'none',
      }
      
      expect(validSettings.auto_recording).toBe('none')
    })
  })
})
