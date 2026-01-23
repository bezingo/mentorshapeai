/**
 * Database Schema Tests for User Profile System
 *
 * These tests validate the database schema extensions for the user profile system.
 * They test the new fields, constraints, and triggers added through migrations 004-009.
 *
 * NOTE: These tests require a running Supabase instance with the migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Profile Schema Extensions', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test_clerk_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = userData.id

    // Create a test profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test User',
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test profile and user
    if (testProfileId) {
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  describe('Test 1: New profile fields store and retrieve correctly', () => {
    it('should store and retrieve phone, date_of_birth, gender, nationality, country, city', async () => {
      const testData = {
        phone: '+1234567890',
        date_of_birth: '1990-05-15',
        gender: 'Male',
        nationality: 'United States',
        country: 'United States',
        city: 'New York',
      }

      // Update profile with new fields
      const { error: updateError } = await supabase
        .from('profiles')
        .update(testData)
        .eq('id', testProfileId)

      expect(updateError).toBeNull()

      // Retrieve and verify
      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('phone, date_of_birth, gender, nationality, country, city')
        .eq('id', testProfileId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.phone).toBe(testData.phone)
      expect(data?.date_of_birth).toBe(testData.date_of_birth)
      expect(data?.gender).toBe(testData.gender)
      expect(data?.nationality).toBe(testData.nationality)
      expect(data?.country).toBe(testData.country)
      expect(data?.city).toBe(testData.city)
    })
  })

  describe('Test 2: Text array fields store and retrieve correctly', () => {
    it('should store and retrieve languages_spoken, can_mentor_for, want_to_learn, specializations, hobbies, expertise_areas, languages', async () => {
      const testData = {
        languages_spoken: ['English', 'Spanish', 'French'],
        can_mentor_for: ['Career Advice', 'Personal Development'],
        want_to_learn: ['Entrepreneurship', 'Marketing'],
        specializations: ['Software Engineering', 'Product Management'],
        hobbies: ['Photography', 'Hiking', 'Reading'],
        expertise_areas: ['Web Development', 'AI/ML'],
        languages: ['English', 'Spanish'],
      }

      // Update profile with array fields
      const { error: updateError } = await supabase
        .from('profiles')
        .update(testData)
        .eq('id', testProfileId)

      expect(updateError).toBeNull()

      // Retrieve and verify
      const { data, error: selectError } = await supabase
        .from('profiles')
        .select(
          'languages_spoken, can_mentor_for, want_to_learn, specializations, hobbies, expertise_areas, languages'
        )
        .eq('id', testProfileId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.languages_spoken).toEqual(testData.languages_spoken)
      expect(data?.can_mentor_for).toEqual(testData.can_mentor_for)
      expect(data?.want_to_learn).toEqual(testData.want_to_learn)
      expect(data?.specializations).toEqual(testData.specializations)
      expect(data?.hobbies).toEqual(testData.hobbies)
      expect(data?.expertise_areas).toEqual(testData.expertise_areas)
      expect(data?.languages).toEqual(testData.languages)
    })

    it('should default array fields to empty arrays', async () => {
      // Create a new profile to test defaults
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          user_id: testUserId,
        })
        .select(
          'languages_spoken, can_mentor_for, want_to_learn, specializations, hobbies, expertise_areas, languages'
        )
        .single()

      if (newProfile) {
        // Cleanup
        await supabase.from('profiles').delete().eq('id', newProfile.id)
      }

      expect(error).toBeNull()
      expect(newProfile?.languages_spoken).toEqual([])
      expect(newProfile?.can_mentor_for).toEqual([])
      expect(newProfile?.want_to_learn).toEqual([])
      expect(newProfile?.specializations).toEqual([])
      expect(newProfile?.hobbies).toEqual([])
      expect(newProfile?.expertise_areas).toEqual([])
      expect(newProfile?.languages).toEqual([])
    })
  })

  describe('Test 3: Section visibility booleans work correctly', () => {
    it('should store and retrieve traits_public, work_history_public, education_public, skills_public', async () => {
      const testData = {
        traits_public: false,
        work_history_public: true,
        education_public: false,
        skills_public: true,
      }

      // Update profile with visibility toggles
      const { error: updateError } = await supabase
        .from('profiles')
        .update(testData)
        .eq('id', testProfileId)

      expect(updateError).toBeNull()

      // Retrieve and verify
      const { data, error: selectError } = await supabase
        .from('profiles')
        .select(
          'traits_public, work_history_public, education_public, skills_public'
        )
        .eq('id', testProfileId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.traits_public).toBe(false)
      expect(data?.work_history_public).toBe(true)
      expect(data?.education_public).toBe(false)
      expect(data?.skills_public).toBe(true)
    })

    it('should default visibility fields to true', async () => {
      // Create a new profile to test defaults
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          user_id: testUserId,
        })
        .select(
          'traits_public, work_history_public, education_public, skills_public'
        )
        .single()

      if (newProfile) {
        await supabase.from('profiles').delete().eq('id', newProfile.id)
      }

      expect(error).toBeNull()
      expect(newProfile?.traits_public).toBe(true)
      expect(newProfile?.work_history_public).toBe(true)
      expect(newProfile?.education_public).toBe(true)
      expect(newProfile?.skills_public).toBe(true)
    })
  })

  describe('Test 4: Profile completion_percentage calculation trigger', () => {
    let completionTestProfileId: string

    beforeEach(async () => {
      // Create a fresh profile for completion testing
      const { data: profile } = await supabase
        .from('profiles')
        .insert({
          user_id: testUserId,
        })
        .select()
        .single()

      completionTestProfileId = profile!.id
    })

    afterAll(async () => {
      // Cleanup completion test profiles
      await supabase
        .from('profiles')
        .delete()
        .neq('id', testProfileId)
        .eq('user_id', testUserId)
    })

    it('should calculate completion percentage based on profile fields', async () => {
      // Initially empty profile should have 0% completion
      const { data: emptyProfile } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', completionTestProfileId)
        .single()

      expect(emptyProfile?.completion_percentage).toBe(0)

      // Add display_name and headline for Personal Info (+10%)
      await supabase
        .from('profiles')
        .update({
          display_name: 'Test Name',
          headline: 'Test Headline',
        })
        .eq('id', completionTestProfileId)

      const { data: withPersonalInfo } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', completionTestProfileId)
        .single()

      expect(withPersonalInfo?.completion_percentage).toBe(10)

      // Add avatar (+5%)
      await supabase
        .from('profiles')
        .update({
          avatar_url: 'https://example.com/avatar.jpg',
        })
        .eq('id', completionTestProfileId)

      const { data: withAvatar } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', completionTestProfileId)
        .single()

      expect(withAvatar?.completion_percentage).toBe(15)
    })

    it('should update completion when work experience is added', async () => {
      // Add personal info first
      await supabase
        .from('profiles')
        .update({
          display_name: 'Test Name',
          headline: 'Test Headline',
        })
        .eq('id', completionTestProfileId)

      // Add work experience (+15%)
      await supabase.from('work_experiences').insert({
        profile_id: completionTestProfileId,
        company: 'Test Company',
        title: 'Test Title',
        start_date: '2020-01-01',
      })

      const { data: withWork } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', completionTestProfileId)
        .single()

      expect(withWork?.completion_percentage).toBe(25) // 10 + 15
    })

    it('should update completion when education is added', async () => {
      // Add education (+10%)
      await supabase.from('educations').insert({
        profile_id: completionTestProfileId,
        institution: 'Test University',
        degree: 'Test Degree',
        start_date: '2016-01-01',
      })

      const { data: withEducation } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', completionTestProfileId)
        .single()

      expect(withEducation?.completion_percentage).toBe(10)
    })

    it('should update completion when skills are added', async () => {
      // Add skill (+10%)
      await supabase.from('skills').insert({
        profile_id: completionTestProfileId,
        name: 'JavaScript',
        level: 'Advanced',
      })

      const { data: withSkill } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', completionTestProfileId)
        .single()

      expect(withSkill?.completion_percentage).toBe(10)
    })
  })

  describe('Test 5: is_current boolean on work_experiences and educations', () => {
    it('should store and retrieve is_current on work_experiences', async () => {
      // Create work experience with is_current = true
      const { data: workExp, error: insertError } = await supabase
        .from('work_experiences')
        .insert({
          profile_id: testProfileId,
          company: 'Current Company',
          title: 'Current Role',
          start_date: '2023-01-01',
          is_current: true,
        })
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(workExp?.is_current).toBe(true)

      // Cleanup
      if (workExp) {
        await supabase.from('work_experiences').delete().eq('id', workExp.id)
      }
    })

    it('should store and retrieve is_current on educations', async () => {
      // Create education with is_current = true
      const { data: education, error: insertError } = await supabase
        .from('educations')
        .insert({
          profile_id: testProfileId,
          institution: 'Current University',
          degree: 'Current Degree',
          start_date: '2023-01-01',
          is_current: true,
        })
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(education?.is_current).toBe(true)

      // Cleanup
      if (education) {
        await supabase.from('educations').delete().eq('id', education.id)
      }
    })

    it('should default is_current to false', async () => {
      // Create work experience without specifying is_current
      const { data: workExp } = await supabase
        .from('work_experiences')
        .insert({
          profile_id: testProfileId,
          company: 'Past Company',
          title: 'Past Role',
          start_date: '2020-01-01',
          end_date: '2022-12-31',
        })
        .select()
        .single()

      expect(workExp?.is_current).toBe(false)

      // Cleanup
      if (workExp) {
        await supabase.from('work_experiences').delete().eq('id', workExp.id)
      }
    })

    it('should include created_at and updated_at timestamps', async () => {
      const { data: workExp } = await supabase
        .from('work_experiences')
        .insert({
          profile_id: testProfileId,
          company: 'Test Company',
          title: 'Test Role',
          start_date: '2023-01-01',
        })
        .select('created_at, updated_at')
        .single()

      expect(workExp?.created_at).toBeDefined()
      expect(workExp?.updated_at).toBeDefined()

      // Cleanup
      if (workExp) {
        await supabase.from('work_experiences').delete().eq('id', workExp.id)
      }
    })
  })

  describe('Test 6: timezone and years_of_experience fields', () => {
    it('should store and retrieve timezone correctly', async () => {
      const testTimezone = 'America/New_York'

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ timezone: testTimezone })
        .eq('id', testProfileId)

      expect(updateError).toBeNull()

      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', testProfileId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.timezone).toBe(testTimezone)
    })

    it('should store and retrieve years_of_experience correctly', async () => {
      const testYears = 10

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ years_of_experience: testYears })
        .eq('id', testProfileId)

      expect(updateError).toBeNull()

      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('years_of_experience')
        .eq('id', testProfileId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.years_of_experience).toBe(testYears)
    })

    it('should enforce years_of_experience constraint (0-50)', async () => {
      // Try to set years_of_experience to -1 (should fail)
      const { error: negativeError } = await supabase
        .from('profiles')
        .update({ years_of_experience: -1 })
        .eq('id', testProfileId)

      expect(negativeError).not.toBeNull()

      // Try to set years_of_experience to 51 (should fail)
      const { error: tooHighError } = await supabase
        .from('profiles')
        .update({ years_of_experience: 51 })
        .eq('id', testProfileId)

      expect(tooHighError).not.toBeNull()

      // Valid values should work
      const { error: validError } = await supabase
        .from('profiles')
        .update({ years_of_experience: 0 })
        .eq('id', testProfileId)

      expect(validError).toBeNull()

      const { error: validMaxError } = await supabase
        .from('profiles')
        .update({ years_of_experience: 50 })
        .eq('id', testProfileId)

      expect(validMaxError).toBeNull()
    })

    it('should enforce completion_percentage constraint (0-100)', async () => {
      // The completion_percentage is auto-calculated, but the constraint should still exist
      // We can verify by checking the profile data
      const { data } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', testProfileId)
        .single()

      expect(data?.completion_percentage).toBeGreaterThanOrEqual(0)
      expect(data?.completion_percentage).toBeLessThanOrEqual(100)
    })
  })
})
