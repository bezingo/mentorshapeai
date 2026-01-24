# Mentor Onboarding & Profiles - Tasks

**Spec Version:** 1.0  
**Created:** 2026-01-24  
**Total Tasks:** 58  
**Estimated Effort:** ~120-180 hours

---

## Task Legend

| Size | Time Estimate |
|------|---------------|
| `XS` | < 1 hour |
| `S` | 1-2 hours |
| `M` | 2-3 hours |
| `L` | 3-4 hours |

---

## Milestone 1: Database Foundation

> Foundation tables and schema changes required by all other features.

- [x] **DB-001** Create mentor_onboarding_progress table `M`
  - Description: Create the table to track mentor onboarding wizard progress including current step, completed steps, and form data JSONB
  - Acceptance: Table exists with all columns, constraints, and UUID default; migration runs without errors
  - Depends on: None
  - Files: `supabase/migrations/015_mentor_onboarding.sql`

- [x] **DB-002** Create calendar_connections table `M`
  - Description: Create table to store Google OAuth tokens (encrypted), webhook channel IDs, and sync metadata
  - Acceptance: Table exists with provider enum, token fields, webhook fields; unique constraint on profile_id
  - Depends on: None
  - Files: `supabase/migrations/015_mentor_onboarding.sql`

- [x] **DB-003** Create mentor_availability table `S`
  - Description: Create table for weekly recurring availability patterns with day_of_week, start/end times, and timezone
  - Acceptance: Table has valid_time_range constraint; day_of_week CHECK constraint (0-6)
  - Depends on: None
  - Files: `supabase/migrations/015_mentor_onboarding.sql`

- [x] **DB-004** Create calendar_busy_blocks table `S`
  - Description: Create table to cache busy blocks synced from Google Calendar for availability filtering
  - Acceptance: Table has unique constraint on (profile_id, calendar_event_id); proper indexes for time range queries
  - Depends on: None
  - Files: `supabase/migrations/015_mentor_onboarding.sql`

- [x] **DB-005** Add columns to mentor_offers table `XS`
  - Description: Add payment_required boolean and sort_order integer columns to existing mentor_offers table
  - Acceptance: Columns added with proper defaults; existing data unaffected
  - Depends on: None
  - Files: `supabase/migrations/016_mentor_offers_update.sql`

- [x] **DB-006** Add mentor_onboarding_completed_at to profiles `XS`
  - Description: Add timestamptz column to profiles table to track when mentor onboarding was completed
  - Acceptance: Column added; nullable for existing profiles
  - Depends on: None
  - Files: `supabase/migrations/016_mentor_offers_update.sql`

- [x] **DB-007** Create RLS policies for new tables `M`
  - Description: Create Row Level Security policies for all 4 new tables ensuring users can only access their own data
  - Acceptance: SELECT/INSERT/UPDATE policies pass tests; users cannot access other users' data
  - Depends on: DB-001, DB-002, DB-003, DB-004
  - Files: `supabase/migrations/015_mentor_onboarding.sql`

- [x] **DB-008** Create database indexes `S`
  - Description: Create indexes for performance: profile lookups, availability by day, busy blocks by time range
  - Acceptance: All 4 indexes created; EXPLAIN shows index usage on common queries
  - Depends on: DB-001, DB-002, DB-003, DB-004
  - Files: `supabase/migrations/015_mentor_onboarding.sql`

---

## Milestone 2: Onboarding APIs

> Backend APIs for the 6-step mentor onboarding wizard.

- [x] **API-001** GET /api/mentor/onboarding endpoint `M`
  - Description: Fetch current onboarding progress for authenticated user; return 404 if not started
  - Acceptance: Returns progress object with current_step, completed_steps, form_data; handles not-started case
  - Depends on: DB-001
  - Files: `app/api/mentor/onboarding/route.ts`

- [x] **API-002** POST /api/mentor/onboarding endpoint `S`
  - Description: Initialize onboarding record for user; pre-fill form_data from existing profile
  - Acceptance: Creates record; pre-fills bio, skills from profile; returns 409 if already started
  - Depends on: DB-001
  - Files: `app/api/mentor/onboarding/route.ts`

- [x] **API-003** PATCH /api/mentor/onboarding endpoint `M`
  - Description: Update current step, mark steps complete, merge form_data updates
  - Acceptance: Supports partial updates; validates step transitions; updates updated_at timestamp
  - Depends on: API-001
  - Files: `app/api/mentor/onboarding/route.ts`

- [x] **API-004** POST /api/mentor/onboarding/complete endpoint `L`
  - Description: Finalize onboarding: validate all steps complete, update profile.is_mentor=true, save all form_data to appropriate tables
  - Acceptance: Sets is_mentor=true, mentor_onboarding_completed_at; creates availability records; updates handle; returns 400 if incomplete
  - Depends on: API-003, DB-003, DB-006
  - Files: `app/api/mentor/onboarding/complete/route.ts`

- [x] **API-005** Onboarding form validation schemas `S`
  - Description: Create Zod schemas for each onboarding step's form data validation
  - Acceptance: Schemas for bio, expertise_areas, skills, languages, timezone, handle; proper error messages
  - Depends on: None
  - Files: `lib/validations/onboarding.ts`

---

## Milestone 3: Calendar Integration Backend

> Google Calendar OAuth, token management, and webhook-based sync.

- [x] **CAL-001** Token encryption utilities `M`
  - Description: Create AES-256-GCM encryption/decryption functions for OAuth tokens at rest
  - Acceptance: Encrypt/decrypt functions work; key rotation support; unit tests pass
  - Depends on: None
  - Files: `lib/crypto/tokens.ts`

- [x] **CAL-002** GET /api/mentor/calendar/auth-url endpoint `M`
  - Description: Generate Google OAuth URL with calendar.readonly scope, state parameter with CSRF token
  - Acceptance: Returns valid Google OAuth URL; state includes encrypted profile_id + CSRF
  - Depends on: CAL-001
  - Files: `app/api/mentor/calendar/auth-url/route.ts`

- [x] **CAL-003** GET /api/mentor/calendar/callback endpoint `L`
  - Description: Handle OAuth callback: exchange code for tokens, validate state, store encrypted tokens, trigger initial sync
  - Acceptance: Tokens stored encrypted; calendar_id fetched; redirects to onboarding/dashboard
  - Depends on: CAL-001, CAL-002, DB-002
  - Files: `app/api/mentor/calendar/callback/route.ts`

- [x] **CAL-004** DELETE /api/mentor/calendar/disconnect endpoint `S`
  - Description: Remove calendar connection: delete tokens, stop webhook, clear busy blocks
  - Acceptance: All calendar data deleted; Google token revoked; returns 200
  - Depends on: DB-002, DB-004
  - Files: `app/api/mentor/calendar/disconnect/route.ts`

- [x] **CAL-005** POST /api/mentor/calendar/sync endpoint `M`
  - Description: Manual sync trigger: fetch busy/free from Google, update calendar_busy_blocks
  - Acceptance: Fetches next 14 days of busy times; upserts busy blocks; updates last_sync_at
  - Depends on: DB-002, DB-004, CAL-003
  - Files: `app/api/mentor/calendar/sync/route.ts`

- [x] **CAL-006** POST /api/mentor/calendar/webhook endpoint `L`
  - Description: Receive Google push notifications, validate channel, trigger sync for affected user
  - Acceptance: Validates X-Goog-Resource-ID; rate limited; triggers sync; returns 200 quickly
  - Depends on: CAL-005
  - Files: `app/api/mentor/calendar/webhook/route.ts`

- [x] **CAL-007** Webhook channel registration utility `M`
  - Description: Create function to register/renew Google Calendar webhook channels with 7-day expiry
  - Acceptance: Creates channel; stores channel_id and expiration; handles renewal
  - Depends on: DB-002, CAL-003
  - Files: `lib/google/calendar-webhooks.ts`

- [x] **CAL-008** Google Calendar API client wrapper `M`
  - Description: Create wrapper around googleapis for calendar operations with automatic token refresh
  - Acceptance: Handles token refresh; fetches freebusy; lists calendars; proper error handling
  - Depends on: CAL-001, DB-002
  - Files: `lib/google/calendar-client.ts`

---

## Milestone 4: Availability APIs

> CRUD for weekly availability patterns and slot calculation.

- [x] **AVAIL-001** GET /api/mentor/availability endpoint `S`
  - Description: Fetch all weekly availability slots for authenticated mentor
  - Acceptance: Returns array of availability slots with day_of_week, times, timezone
  - Depends on: DB-003
  - Files: `app/api/mentor/availability/route.ts`

- [x] **AVAIL-002** POST /api/mentor/availability endpoint `M`
  - Description: Create new availability slot with overlap validation
  - Acceptance: Creates slot; validates no overlap with existing slots for same day; max 5 per day
  - Depends on: DB-003, AVAIL-006
  - Files: `app/api/mentor/availability/route.ts`

- [x] **AVAIL-003** PUT /api/mentor/availability/[id] endpoint `S`
  - Description: Update existing availability slot
  - Acceptance: Updates times/active status; validates ownership; checks overlaps
  - Depends on: AVAIL-001
  - Files: `app/api/mentor/availability/[id]/route.ts`

- [x] **AVAIL-004** DELETE /api/mentor/availability/[id] endpoint `XS`
  - Description: Delete availability slot
  - Acceptance: Deletes slot; validates ownership; returns 404 if not found
  - Depends on: AVAIL-001
  - Files: `app/api/mentor/availability/[id]/route.ts`

- [x] **AVAIL-005** GET /api/mentor/availability/slots endpoint `L`
  - Description: Calculate available booking slots for date range, filtering out calendar busy blocks
  - Acceptance: Expands weekly patterns to specific dates; subtracts busy blocks; returns bookable slots
  - Depends on: AVAIL-001, DB-004, AVAIL-007
  - Files: `app/api/mentor/availability/slots/route.ts`

- [x] **AVAIL-006** Availability overlap validation utility `S`
  - Description: Create function to detect overlapping time slots on the same day
  - Acceptance: Detects partial and complete overlaps; handles edge cases (adjacent slots OK)
  - Depends on: None
  - Files: `lib/utils/availability.ts`

- [x] **AVAIL-007** Timezone conversion utilities `M`
  - Description: Create utilities for converting availability between timezones, handling DST
  - Acceptance: Converts times accurately; handles DST transitions; works with IANA timezones
  - Depends on: None
  - Files: `lib/utils/timezone.ts`

---

## Milestone 5: Mentor Offers APIs

> CRUD for consultation offerings (payment deferred).

- [x] **OFFER-001** GET /api/mentor/offers endpoint `S`
  - Description: Fetch all offers for authenticated mentor, ordered by sort_order
  - Acceptance: Returns array of offers; includes payment_required status
  - Depends on: DB-005
  - Files: `app/api/mentor/offers/route.ts`

- [x] **OFFER-002** POST /api/mentor/offers endpoint `M`
  - Description: Create new mentor offer with validation
  - Acceptance: Creates offer; validates required fields; sets payment_required=true for paid offers
  - Depends on: DB-005
  - Files: `app/api/mentor/offers/route.ts`

- [x] **OFFER-003** PUT /api/mentor/offers/[id] endpoint `S`
  - Description: Update existing offer
  - Acceptance: Updates offer fields; validates ownership; handles sort_order changes
  - Depends on: OFFER-001
  - Files: `app/api/mentor/offers/[id]/route.ts`

- [x] **OFFER-004** DELETE /api/mentor/offers/[id] endpoint `XS`
  - Description: Delete mentor offer
  - Acceptance: Soft delete or hard delete; validates ownership
  - Depends on: OFFER-001
  - Files: `app/api/mentor/offers/[id]/route.ts`

- [x] **OFFER-005** PATCH /api/mentor/offers/[id]/toggle endpoint `XS`
  - Description: Toggle offer active status
  - Acceptance: Toggles is_active; validates ownership; returns updated offer
  - Depends on: OFFER-001
  - Files: `app/api/mentor/offers/[id]/toggle/route.ts`

---

## Milestone 6: Public Profile APIs

> Enhanced public mentor profile endpoints.

- [x] **PUB-001** GET /api/public/mentor/[handle] endpoint `M`
  - Description: Fetch enhanced public mentor data including expertise, badges, offers, stats
  - Acceptance: Returns full profile with is_mentor check; includes expertise_areas, active offers, badge count
  - Depends on: DB-005
  - Files: `app/api/public/mentor/[handle]/route.ts`

- [x] **PUB-002** GET /api/public/mentor/[handle]/testimonials endpoint `S`
  - Description: Fetch paginated testimonials/ratings for mentor
  - Acceptance: Returns paginated results from ratings table; includes mentee name, rating, comment
  - Depends on: None
  - Files: `app/api/public/mentor/[handle]/testimonials/route.ts`

- [x] **PUB-003** GET /api/public/mentor/[handle]/availability endpoint `M`
  - Description: Fetch public availability slots for booking UI, converted to requester's timezone
  - Acceptance: Expands availability for next 14 days; filters busy blocks; converts to viewer TZ
  - Depends on: AVAIL-005
  - Files: `app/api/public/mentor/[handle]/availability/route.ts`

---

## Milestone 7: Onboarding UI Foundation

> Core wizard components and state management.

- [x] **UI-001** OnboardingWizard container component `M`
  - Description: Full-page wizard container with navigation, progress tracking, and step rendering
  - Acceptance: Renders current step; handles next/back; full-page layout without dashboard chrome
  - Depends on: API-001
  - Files: `components/mentor/onboarding/OnboardingWizard.tsx`

- [x] **UI-002** OnboardingProgress step indicator `S`
  - Description: Visual progress bar showing 6 steps with completed/current/upcoming states
  - Acceptance: Shows step numbers/names; highlights current; checkmarks for completed
  - Depends on: None
  - Files: `components/mentor/onboarding/OnboardingProgress.tsx`

- [x] **UI-003** useOnboardingState Zustand store `M`
  - Description: Create Zustand store for onboarding state management with persistence
  - Acceptance: Manages step, form data, loading; syncs with API; handles save/load
  - Depends on: API-001, API-003
  - Files: `hooks/use-onboarding-state.ts`

- [x] **UI-004** Mentor onboarding page route `S`
  - Description: Create the /mentor/onboarding page that hosts the wizard
  - Acceptance: Full-page route; redirects mentors to dashboard; auth required
  - Depends on: UI-001
  - Files: `app/mentor/onboarding/page.tsx`

---

## Milestone 8: Onboarding Step Components

> Individual step components for the 6-step wizard.

- [x] **STEP-001** WelcomeStep component `S`
  - Description: Step 1: Welcome screen with benefits list, user avatar/name, "Get Started" CTA
  - Acceptance: Shows user's existing avatar/name; lists mentor benefits; advances on CTA click
  - Depends on: UI-001
  - Files: `components/mentor/onboarding/steps/WelcomeStep.tsx`

- [x] **STEP-002** BioExpertiseStep component `M`
  - Description: Step 2: Bio textarea with character counter, expertise areas tag input with suggestions
  - Acceptance: Pre-fills existing bio; tag input with autocomplete; validates bio length; live preview
  - Depends on: UI-001, UI-003
  - Files: `components/mentor/onboarding/steps/BioExpertiseStep.tsx`

- [x] **STEP-003** SkillsLanguagesStep component `M`
  - Description: Step 3: Skills multi-select, languages dropdown, timezone selector, years of experience
  - Acceptance: Pre-fills existing skills; timezone auto-detected; experience slider 0-50
  - Depends on: UI-001, UI-003
  - Files: `components/mentor/onboarding/steps/SkillsLanguagesStep.tsx`

- [x] **STEP-004** AvailabilityStep component `L`
  - Description: Step 4: Basic weekly availability grid with optional Google Calendar connect card
  - Acceptance: Visual grid for time selection; skip option; calendar connect button; saves slots
  - Depends on: UI-001, UI-003, CALUI-001, AVAILUI-002
  - Files: `components/mentor/onboarding/steps/AvailabilityStep.tsx`

- [x] **STEP-005** HandleStep component `M`
  - Description: Step 5: Handle input with /m/ prefix, real-time availability check, URL preview
  - Acceptance: Shows availability status on type; debounced check; suggestions if taken
  - Depends on: UI-001, UI-003
  - Files: `components/mentor/onboarding/steps/HandleStep.tsx`

- [x] **STEP-006** ReviewStep component `M`
  - Description: Step 6: Summary cards for all sections, edit buttons, terms checkbox, submit CTA
  - Acceptance: Shows all entered data; jump-back buttons; terms required; calls complete API
  - Depends on: UI-001, UI-003, API-004
  - Files: `components/mentor/onboarding/steps/ReviewStep.tsx`

---

## Milestone 9: Calendar UI Components

> Components for Google Calendar connection and status display.

- [x] **CALUI-001** CalendarConnectCard component `M`
  - Description: OAuth connect button card with Google branding, benefits list, connect CTA
  - Acceptance: Shows Google icon; triggers OAuth flow; displays connected state if already connected
  - Depends on: CAL-002
  - Files: `components/mentor/calendar/CalendarConnectCard.tsx`

- [x] **CALUI-002** CalendarConnectionStatus component `S`
  - Description: Display current calendar connection status with disconnect option
  - Acceptance: Shows connected email; last sync time; disconnect button with confirmation
  - Depends on: CAL-004
  - Files: `components/mentor/calendar/CalendarConnectionStatus.tsx`

- [x] **CALUI-003** CalendarSyncIndicator component `XS`
  - Description: Small badge/indicator showing sync status (synced, syncing, error)
  - Acceptance: Shows appropriate icon/color for status; tooltip with last sync time
  - Depends on: None
  - Files: `components/mentor/calendar/CalendarSyncIndicator.tsx`

---

## Milestone 10: Availability UI Components

> Components for managing weekly availability patterns.

- [x] **AVAILUI-001** AvailabilityManager component `L`
  - Description: Full availability management container with grid, editor, and calendar status
  - Acceptance: Combines grid + editor; shows calendar busy blocks; save/cancel actions
  - Depends on: AVAIL-001, AVAILUI-002, AVAILUI-003
  - Files: `components/mentor/availability/AvailabilityManager.tsx`

- [x] **AVAILUI-002** WeeklyScheduleGrid component `L`
  - Description: Visual 7-day grid with time slots, drag-to-select, color-coded availability
  - Acceptance: 7 rows for days; clickable time blocks; green=available, gray=busy; click to edit
  - Depends on: AVAIL-001
  - Files: `components/mentor/availability/WeeklyScheduleGrid.tsx`

- [x] **AVAILUI-003** TimeSlotEditor component `M`
  - Description: Form for adding/editing time slots with day selector, time pickers, timezone
  - Acceptance: Multi-day selection; start/end time pickers; shows timezone; validates overlap
  - Depends on: AVAIL-002, AVAIL-006
  - Files: `components/mentor/availability/TimeSlotEditor.tsx`

- [x] **AVAILUI-004** TimezoneSelector component `S`
  - Description: Searchable dropdown for IANA timezones with common options at top
  - Acceptance: Search/filter; shows UTC offset; auto-detects user timezone
  - Depends on: None
  - Files: `components/mentor/availability/TimezoneSelector.tsx`

- [x] **AVAILUI-005** AvailabilityPreview component `S`
  - Description: Preview component showing availability as mentees will see it (in their timezone)
  - Acceptance: Converts to selected preview timezone; shows next 7 days; matches public display
  - Depends on: AVAIL-007
  - Files: `components/mentor/availability/AvailabilityPreview.tsx`

---

## Milestone 11: Mentor Offers UI Components

> Components for managing consultation offerings.

- [x] **OFFERUI-001** OffersList component `S`
  - Description: List container for mentor offers with add button and drag-to-reorder
  - Acceptance: Lists all offers; reorder via drag; add new offer CTA
  - Depends on: OFFER-001
  - Files: `components/mentor/offers/OffersList.tsx`

- [x] **OFFERUI-002** OfferCard component `S`
  - Description: Individual offer display card with title, price, duration, edit/delete actions
  - Acceptance: Shows offer details; toggle active; edit/delete buttons; payment required indicator
  - Depends on: OFFER-005
  - Files: `components/mentor/offers/OfferCard.tsx`

- [x] **OFFERUI-003** OfferModal component `M`
  - Description: Modal for creating/editing offers with form fields and validation
  - Acceptance: Title, description, price, duration fields; validates required; handles create/update
  - Depends on: OFFER-002, OFFER-003
  - Files: `components/mentor/offers/OfferModal.tsx`

- [x] **OFFERUI-004** PaymentRequiredBanner component `XS`
  - Description: Banner showing "Setup payments to enable paid consultations" with CTA
  - Acceptance: Shows only for paid offers without Stripe; links to future payment setup
  - Depends on: None
  - Files: `components/mentor/offers/PaymentRequiredBanner.tsx`

---

## Milestone 12: Public Profile UI Components

> Enhanced Linktree-style public mentor profile components.

- [x] **PROFUI-001** MentorProfileHero component `M`
  - Description: Enhanced hero section with larger avatar, name, headline, expertise tags
  - Acceptance: Larger avatar; expertise badges; verified badge if applicable; social links
  - Depends on: PUB-001
  - Files: `components/mentor/profile/MentorProfileHero.tsx`

- [x] **PROFUI-002** ExpertiseSection component `S`
  - Description: Display expertise areas with icons in a visually appealing grid/list
  - Acceptance: Shows all expertise areas; icons for common areas; expandable if many
  - Depends on: None
  - Files: `components/mentor/profile/ExpertiseSection.tsx`

- [x] **PROFUI-003** TestimonialsSection component `M`
  - Description: Display testimonials/ratings with pagination and average rating
  - Acceptance: Shows rating stars; mentee attribution; pagination; "no testimonials yet" state
  - Depends on: PUB-002
  - Files: `components/mentor/profile/TestimonialsSection.tsx`

- [x] **PROFUI-004** BadgesSection component `S`
  - Description: Display mentor badges earned with descriptions
  - Acceptance: Shows all badges; hover for description; empty state if none
  - Depends on: None
  - Files: `components/mentor/profile/BadgesSection.tsx`

- [x] **PROFUI-005** OffersSection component `M`
  - Description: Display public consultation offerings with booking CTAs
  - Acceptance: Shows active offers; price/duration; "Request" or "Book" CTA per offer
  - Depends on: PUB-001
  - Files: `components/mentor/profile/OffersSection.tsx`

- [x] **PROFUI-006** RequestMentorshipModal component `M`
  - Description: Modal for requesting mentorship with message input and offer selection
  - Acceptance: Select offer type; add message; submit creates request; success confirmation
  - Depends on: None
  - Files: `components/mentor/profile/RequestMentorshipModal.tsx`

- [x] **PROFUI-007** Integrate enhanced profile into public page `M`
  - Description: Update existing public-profile-content.tsx to use new mentor components
  - Acceptance: Public profile shows new sections for mentors; non-mentors see basic profile
  - Depends on: PROFUI-001, PROFUI-002, PROFUI-003, PROFUI-004, PROFUI-005
  - Files: `app/m/[handle]/public-profile-content.tsx`

---

## Milestone 13: Dashboard Integration

> Mentor dashboard pages and navigation updates.

- [x] **DASH-001** Mentor availability dashboard page `M`
  - Description: Create /dashboard/mentor/availability page with full availability manager
  - Acceptance: Page renders AvailabilityManager; calendar connection status; save persistence
  - Depends on: AVAILUI-001
  - Files: `app/dashboard/mentor/availability/page.tsx`

- [x] **DASH-002** Mentor offers dashboard page `M`
  - Description: Create /dashboard/mentor/offers page with offers list and management
  - Acceptance: Page renders OffersList; create/edit/delete functionality; reorder
  - Depends on: OFFERUI-001
  - Files: `app/dashboard/mentor/offers/page.tsx`

- [x] **DASH-003** Mentor profile editor page `S`
  - Description: Create /dashboard/mentor/profile page for editing mentor-specific profile fields
  - Acceptance: Edit bio, expertise, handle; preview public profile link
  - Depends on: PROFUI-001
  - Files: `app/dashboard/mentor/profile/page.tsx`

- [x] **DASH-004** "Become a Mentor" CTA integration `S`
  - Description: Add prominent "Become a Mentor" button to main dashboard for non-mentors
  - Acceptance: CTA visible for non-mentors; links to /mentor/onboarding; hidden for mentors
  - Depends on: UI-004
  - Files: `app/dashboard/page.tsx`, `components/mentor/BecomeMentorCard.tsx`

- [x] **DASH-005** Mentor redirect guard middleware `S`
  - Description: Redirect existing mentors from onboarding to dashboard; redirect non-mentors from mentor pages
  - Acceptance: is_mentor=true users skip onboarding; non-mentors can't access mentor dashboard
  - Depends on: None
  - Files: `lib/clerk.ts`, `app/mentor/onboarding/page.tsx`, `app/dashboard/mentor/page.tsx`

---

## Milestone 14: Testing

> Unit, integration, and E2E tests for the feature.

- [x] **TEST-001** Unit tests for availability utilities `M`
  - Description: Test overlap detection, timezone conversion, slot expansion
  - Acceptance: Tests for overlaps, adjacent slots, time format validation, slot counting
  - Depends on: AVAIL-006, AVAIL-007
  - Files: `__tests__/utils/availability.test.ts`

- [x] **TEST-002** Unit tests for timezone utilities `S`
  - Description: Test timezone conversion, DST handling
  - Acceptance: Tests for timezone validation, offset calculation, time conversion, availability expansion
  - Depends on: AVAIL-007
  - Files: `__tests__/utils/timezone.test.ts`

- [x] **TEST-003** Unit tests for onboarding validation `S`
  - Description: Test Zod schemas for onboarding steps
  - Acceptance: Tests for all step schemas, validateStep helper, validateOnboardingComplete
  - Depends on: API-005
  - Files: `__tests__/validations/onboarding.test.ts`

- [x] **TEST-004** Integration tests for onboarding API `M`
  - Description: Test onboarding CRUD flow
  - Acceptance: Tests GET/POST/PATCH endpoints, progress persistence, step validation
  - Depends on: API-001, API-002, API-003
  - Files: `__tests__/api/onboarding.test.ts`

- [x] **TEST-005** Integration tests for availability API `M`
  - Description: Test availability CRUD and slot calculation
  - Acceptance: Tests create, update, delete, overlap detection, slot limits
  - Depends on: AVAIL-001, AVAIL-002
  - Files: `__tests__/api/availability.test.ts`

- [x] **TEST-006** Integration tests for offers API `S`
  - Description: Test offers CRUD
  - Acceptance: Tests create, read, type validation, price/duration requirements
  - Depends on: OFFER-001, OFFER-002
  - Files: `__tests__/api/offers.test.ts`

- [x] **TEST-007** Integration tests for public profile API `S`
  - Description: Test public mentor data endpoints
  - Acceptance: Tests handle lookup, data aggregation, privacy filters
  - Depends on: PUB-001
  - Files: `__tests__/api/public-mentor.test.ts`

- [x] **TEST-008** E2E test for onboarding flow `L`
  - Description: Test complete 6-step wizard flow (placeholder for Playwright/Cypress)
  - Acceptance: Placeholder tests with detailed implementation plan for E2E framework
  - Depends on: UI-001, STEP-001 through STEP-006
  - Files: `__tests__/e2e/onboarding.test.ts`

---

## Summary

### Tasks by Milestone

| Milestone | Task Count | Est. Hours |
|-----------|------------|------------|
| 1. Database Foundation | 8 | 12-16 |
| 2. Onboarding APIs | 5 | 10-14 |
| 3. Calendar Integration | 8 | 18-24 |
| 4. Availability APIs | 7 | 12-16 |
| 5. Mentor Offers APIs | 5 | 6-10 |
| 6. Public Profile APIs | 3 | 6-8 |
| 7. Onboarding UI Foundation | 4 | 8-12 |
| 8. Onboarding Steps | 6 | 14-18 |
| 9. Calendar UI | 3 | 4-6 |
| 10. Availability UI | 5 | 12-16 |
| 11. Offers UI | 4 | 6-8 |
| 12. Public Profile UI | 7 | 14-18 |
| 13. Dashboard Integration | 5 | 8-12 |
| 14. Testing | 8 | 14-20 |
| **Total** | **58** | **144-198** |

### Critical Path

The following tasks are on the critical path and block the most downstream work:

1. **DB-001** → **API-001** → **UI-003** → **UI-001** → All step components
2. **DB-002** → **CAL-001** → **CAL-003** → **CAL-005** → **AVAIL-005**
3. **DB-003** → **AVAIL-001** → **AVAILUI-002** → **STEP-004**

### Recommended Execution Order

1. Start with all database migrations (Milestone 1)
2. Build onboarding APIs (Milestone 2) parallel with calendar utilities (CAL-001, CAL-008)
3. Build availability APIs (Milestone 4) and calendar APIs (Milestone 3)
4. Build mentor offers APIs (Milestone 5) and public APIs (Milestone 6)
5. Build UI foundation and steps (Milestones 7-8)
6. Build supporting UI components (Milestones 9-11)
7. Build public profile UI and dashboard integration (Milestones 12-13)
8. Complete testing (Milestone 14)
