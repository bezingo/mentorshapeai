/**
 * Integration tests for Organization & Program APIs
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/organizations/route'
import { POST as POST_JOIN } from '@/app/api/organizations/join/route'
import { GET as GET_PROGRAMS, POST as POST_PROGRAM } from '@/app/api/organizations/[orgId]/programs/route'
import { POST as POST_MATCH } from '@/app/api/programs/[programId]/match/route'
import * as clerkLib from '@/lib/clerk'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'clerk_test_org' }),
  currentUser: vi.fn().mockResolvedValue({
    primaryEmailAddressId: 'email_1',
    emailAddresses: [{ id: 'email_1', emailAddress: 'admin@test.edu' }],
  }),
}))

vi.mock('@/lib/clerk', async () => {
  const actual = await vi.importActual<typeof clerkLib>('@/lib/clerk')
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue('clerk_test_org'),
    ensureUserAndProfile: vi.fn(),
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const shouldRun = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRun)('Organization API Integration Tests', () => {
  let supabase: SupabaseClient
  let adminProfileId: string
  let mentorProfileId: string
  let menteeProfileId: string
  let orgId: string
  let programId: string
  let inviteCode: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const ts = Date.now()

    const { data: adminUser } = await supabase
      .from('users')
      .insert({ clerk_user_id: `org_admin_${ts}`, email: `org_admin_${ts}@test.edu` })
      .select()
      .single()

    const { data: adminProfile } = await supabase
      .from('profiles')
      .insert({
        user_id: adminUser!.id,
        display_name: 'Org Admin',
        is_mentor: true,
        is_mentee: true,
        can_mentor_for: ['Career'],
        want_to_learn: ['Leadership'],
      })
      .select()
      .single()
    adminProfileId = adminProfile!.id

    const { data: mentorUser } = await supabase
      .from('users')
      .insert({ clerk_user_id: `org_mentor_${ts}`, email: `org_mentor_${ts}@test.edu` })
      .select()
      .single()

    const { data: mentorProfile } = await supabase
      .from('profiles')
      .insert({
        user_id: mentorUser!.id,
        display_name: 'Org Mentor',
        is_mentor: true,
        can_mentor_for: ['Career', 'Leadership'],
      })
      .select()
      .single()
    mentorProfileId = mentorProfile!.id

    const { data: menteeUser } = await supabase
      .from('users')
      .insert({ clerk_user_id: `org_mentee_${ts}`, email: `org_mentee_${ts}@test.edu` })
      .select()
      .single()

    const { data: menteeProfile } = await supabase
      .from('profiles')
      .insert({
        user_id: menteeUser!.id,
        display_name: 'Org Mentee',
        is_mentee: true,
        want_to_learn: ['Career', 'Leadership'],
      })
      .select()
      .single()
    menteeProfileId = menteeProfile!.id

    vi.mocked(clerkLib.ensureUserAndProfile).mockResolvedValue({
      ...adminProfile!,
      id: adminProfileId,
    } as Awaited<ReturnType<typeof clerkLib.ensureUserAndProfile>>)
  })

  afterAll(async () => {
    if (programId) {
      await supabase.from('matches').delete().eq('program_id', programId)
      await supabase.from('program_participants').delete().eq('program_id', programId)
      await supabase.from('programs').delete().eq('id', programId)
    }
    if (orgId) {
      await supabase.from('org_members').delete().eq('org_id', orgId)
      await supabase.from('organizations').delete().eq('id', orgId)
    }
    if (adminProfileId) await supabase.from('profiles').delete().eq('id', adminProfileId)
    if (mentorProfileId) await supabase.from('profiles').delete().eq('id', mentorProfileId)
    if (menteeProfileId) await supabase.from('profiles').delete().eq('id', menteeProfileId)
  })

  it('creates organization and lists it', async () => {
    const createReq = new NextRequest('http://localhost/api/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: `Test Org ${Date.now()}`, domain: 'test.edu' }),
    })

    const createRes = await POST(createReq)
    expect(createRes.status).toBe(201)
    const createJson = await createRes.json()
    orgId = createJson.data.id
    inviteCode = createJson.data.invite_code
    expect(inviteCode).toBeTruthy()

    const listRes = await GET()
    expect(listRes.status).toBe(200)
    const listJson = await listRes.json()
    expect(listJson.data.some((o: { id: string }) => o.id === orgId)).toBe(true)
  })

  it('creates program as admin', async () => {
    const req = new NextRequest(`http://localhost/api/organizations/${orgId}/programs`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Spring Mentorship' }),
    })

    const res = await POST_PROGRAM(req, { params: Promise.resolve({ orgId }) })
    expect(res.status).toBe(201)
    const json = await res.json()
    programId = json.data.id

    const listRes = await GET_PROGRAMS(new NextRequest('http://localhost'), {
      params: Promise.resolve({ orgId }),
    })
    expect(listRes.status).toBe(200)
    const listJson = await listRes.json()
    expect(listJson.data.length).toBeGreaterThan(0)
  })

  it('enrolls participants and runs matching', async () => {
    await supabase.from('program_participants').insert([
      { program_id: programId, profile_id: mentorProfileId, role: 'mentor' },
      { program_id: programId, profile_id: menteeProfileId, role: 'mentee' },
    ])

    const matchRes = await POST_MATCH(new NextRequest('http://localhost'), {
      params: Promise.resolve({ programId }),
    })
    expect(matchRes.status).toBe(200)
    const matchJson = await matchRes.json()
    expect(matchJson.data.summary.created).toBeGreaterThanOrEqual(1)
    expect(matchJson.data.matches.length).toBeGreaterThanOrEqual(1)
  })

  it('joins organization with invite code', async () => {
    const joinReq = new NextRequest('http://localhost/api/organizations/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode, role: 'mentee' }),
    })

    vi.mocked(clerkLib.ensureUserAndProfile).mockResolvedValueOnce({
      id: menteeProfileId,
      user_id: 'x',
      display_name: 'Org Mentee',
      is_mentor: false,
      is_mentee: true,
    } as Awaited<ReturnType<typeof clerkLib.ensureUserAndProfile>>)

    const joinRes = await POST_JOIN(joinReq)
    expect(joinRes.status).toBe(200)
  })
})
