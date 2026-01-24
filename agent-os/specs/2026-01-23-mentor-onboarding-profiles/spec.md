# Mentor Onboarding & Profiles Specification

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Draft  
**Owner:** Product Team

---

## 1. Overview

This specification defines the Mentor Onboarding & Profiles feature for Mentorshape, enabling users to become mentors through a guided onboarding flow, connect their calendars for availability management, and showcase their expertise via enhanced public mentor profiles.

### Background

Phase 1 established user profiles with work history, education, skills, and avatar upload. The database already contains `is_mentor` boolean flags and mentor-specific tables (`mentor_offers`, `mentor_badges`, `ratings`), but these remain unused. This phase activates the mentor experience with:

- A multi-step onboarding wizard to convert users into mentors
- Google Calendar integration for availability sync
- Weekly recurring availability patterns
- Enhanced Linktree-style public mentor profiles
- Consultation offerings (with deferred payment integration)

### Scope

This specification covers:
- Mentor onboarding wizard (full-page, multi-step)
- Google Calendar OAuth integration
- Availability management system
- Public mentor profile enhancements
- Consultation offering creation (without Stripe Connect)

---

## 2. Goals & Non-Goals

### Goals

1. **G1:** Enable any user to become a mentor through a streamlined onboarding process
2. **G2:** Allow mentors to connect Google Calendar for real-time availability sync
3. **G3:** Provide flexible weekly recurring availability patterns with timezone support
4. **G4:** Create compelling public mentor profiles that drive mentorship requests
5. **G5:** Allow mentors to define consultation offerings (payment deferred to Phase 4)
6. **G6:** Ensure onboarding progress is saved, allowing users to return and complete later

### Non-Goals

1. **NG1:** Microsoft Outlook calendar integration (deferred to future iteration)
2. **NG2:** Stripe Connect for payment processing (deferred to Phase 4)
3. **NG3:** Digital products marketplace (deferred to Phase 4)
4. **NG4:** Different availability per consultation type
5. **NG5:** AI-powered mentor matching from this phase
6. **NG6:** Real-time availability conflict resolution

---

## 3. User Stories

### Mentor Onboarding

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US1 | As a user, I want to start mentor onboarding from a "Become a Mentor" CTA so I can share my expertise | "Become a Mentor" button visible on dashboard; clicking initiates wizard |
| US2 | As a user going through onboarding, I want my progress saved automatically so I can return later | Progress persists across sessions; partial state recoverable |
| US3 | As a user, I want to provide my bio and expertise areas in a guided flow so the platform understands my strengths | Bio, expertise areas, skills captured in step 2 |
| US4 | As a user, I want to connect my Google Calendar so my availability syncs automatically | OAuth flow completes; calendar events fetched |
| US5 | As a user, I want to set my weekly availability pattern so mentees know when to book | Weekly recurring slots saved with timezone |
| US6 | As a user, I want to choose my unique mentor handle so I have a memorable profile URL | Handle uniqueness validated; preview shown |
| US7 | As a user, I want to review all my information before submitting so I can verify accuracy | Review step shows all entered data |
| US8 | As a user who is already a mentor, I want to be redirected to my mentor dashboard when accessing onboarding | `is_mentor=true` users redirected |

### Calendar Integration

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US9 | As a mentor, I want to connect Google Calendar via OAuth so I don't enter credentials on Mentorshape | Standard OAuth consent flow; no password entry |
| US10 | As a mentor, I want my calendar busy times to block availability so I'm not double-booked | Busy events fetched; availability slots masked |
| US11 | As a mentor, I want to disconnect my calendar if I prefer manual availability | Disconnect option available; tokens deleted |
| US12 | As a mentor, I want calendar sync to happen automatically so my availability stays current | Webhook-based push notifications for real-time sync |

### Availability Management

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US13 | As a mentor, I want to define recurring weekly slots (e.g., "Tuesdays 5-7pm EST") | Multiple slots per day; timezone stored |
| US14 | As a mentor, I want to add multiple time slots per day so I can offer various windows | Up to 5 slots per day supported |
| US15 | As a mentor, I want my availability displayed in the viewer's timezone | Timezone conversion accurate on display |
| US16 | As a mentor, I want to edit my availability from my dashboard after onboarding | Dedicated availability management page |

### Public Mentor Profiles

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US17 | As a visitor, I want to see a mentor's expertise and credentials on their public page | Expertise, experience, skills displayed |
| US18 | As a visitor, I want to see testimonials from past mentees so I can gauge mentor quality | Ratings/feedback from `ratings` table shown |
| US19 | As a visitor, I want to see a mentor's badges so I understand their achievements | `mentor_badges` displayed prominently |
| US20 | As a visitor, I want to request mentorship via a CTA so I can work with this mentor | "Request Mentorship" button opens modal |
| US21 | As a visitor, I want to see available consultation offerings so I know what's offered | `mentor_offers` listed with details |
| US22 | As a mentor, I want my profile to look professional and modern (Linktree-style) | Clean, mobile-first, visually appealing layout |

### Consultation Offerings

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US23 | As a mentor, I want to create free and paid consultation offerings | `mentor_offers` CRUD operations available |
| US24 | As a mentor, I want to set duration, title, description for each offering | Fields captured and validated |
| US25 | As a mentor with paid offerings, I want to see "Setup payments to enable" until Stripe is connected | `payment_required` flag; visual indicator |

---

## 4. Technical Design

### 4.1 Database Schema Changes

#### New Tables

```sql
-- 015_mentor_onboarding.sql

-- Mentor onboarding progress tracking
CREATE TABLE public.mentor_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  form_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Google Calendar OAuth tokens
CREATE TABLE public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'google', -- 'google' | 'microsoft' (future)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT, -- primary calendar ID
  webhook_channel_id TEXT, -- for push notifications
  webhook_expiration TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly availability patterns
CREATE TABLE public.mentor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Calendar busy blocks (synced from Google)
CREATE TABLE public.calendar_busy_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  summary TEXT, -- event title (for debugging)
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, calendar_event_id)
);

-- Indexes
CREATE INDEX idx_mentor_onboarding_profile ON public.mentor_onboarding_progress(profile_id);
CREATE INDEX idx_calendar_connections_profile ON public.calendar_connections(profile_id);
CREATE INDEX idx_mentor_availability_profile_day ON public.mentor_availability(profile_id, day_of_week);
CREATE INDEX idx_calendar_busy_blocks_profile_time ON public.calendar_busy_blocks(profile_id, start_time, end_time);

-- RLS Policies
ALTER TABLE public.mentor_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_busy_blocks ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own onboarding progress"
  ON public.mentor_onboarding_progress FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own onboarding progress"
  ON public.mentor_onboarding_progress FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own onboarding progress"
  ON public.mentor_onboarding_progress FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Similar policies for other tables...
```

#### Schema Modifications

```sql
-- Add to mentor_offers table
ALTER TABLE public.mentor_offers 
  ADD COLUMN payment_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Add mentor completion tracking to profiles
ALTER TABLE public.profiles
  ADD COLUMN mentor_onboarding_completed_at TIMESTAMPTZ;
```

### 4.2 API Routes

#### Onboarding APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mentor/onboarding` | Get current onboarding progress |
| POST | `/api/mentor/onboarding` | Initialize onboarding |
| PATCH | `/api/mentor/onboarding` | Update onboarding step/data |
| POST | `/api/mentor/onboarding/complete` | Complete onboarding, set `is_mentor=true` |

#### Calendar APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mentor/calendar/auth-url` | Get Google OAuth URL |
| GET | `/api/mentor/calendar/callback` | OAuth callback handler |
| DELETE | `/api/mentor/calendar/disconnect` | Remove calendar connection |
| POST | `/api/mentor/calendar/sync` | Manual sync trigger |
| POST | `/api/mentor/calendar/webhook` | Google push notification receiver |

#### Availability APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mentor/availability` | Get weekly availability patterns |
| POST | `/api/mentor/availability` | Create availability slot |
| PUT | `/api/mentor/availability/[id]` | Update slot |
| DELETE | `/api/mentor/availability/[id]` | Delete slot |
| GET | `/api/mentor/availability/slots` | Get available slots for date range (considers busy blocks) |

#### Mentor Offers APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mentor/offers` | List mentor's offers |
| POST | `/api/mentor/offers` | Create offer |
| PUT | `/api/mentor/offers/[id]` | Update offer |
| DELETE | `/api/mentor/offers/[id]` | Delete offer |
| PATCH | `/api/mentor/offers/[id]/toggle` | Toggle offer active status |

#### Public Profile APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/mentor/[handle]` | Get public mentor data (enhanced) |
| GET | `/api/public/mentor/[handle]/testimonials` | Get paginated testimonials |
| GET | `/api/public/mentor/[handle]/availability` | Get public availability for booking |

### 4.3 Component Architecture

#### New Components

```
components/
├── mentor/
│   ├── onboarding/
│   │   ├── OnboardingWizard.tsx          # Full-page wizard container
│   │   ├── OnboardingProgress.tsx        # Step indicator bar
│   │   ├── steps/
│   │   │   ├── WelcomeStep.tsx           # Step 1: Welcome & intro
│   │   │   ├── BioExpertiseStep.tsx      # Step 2: Bio & expertise areas
│   │   │   ├── SkillsLanguagesStep.tsx   # Step 3: Skills & languages
│   │   │   ├── AvailabilityStep.tsx      # Step 4: Basic availability setup
│   │   │   ├── HandleStep.tsx            # Step 5: Public handle selection
│   │   │   └── ReviewStep.tsx            # Step 6: Review & submit
│   │   └── hooks/
│   │       └── useOnboardingState.ts     # Onboarding state management
│   │
│   ├── calendar/
│   │   ├── CalendarConnectCard.tsx       # OAuth connect button
│   │   ├── CalendarConnectionStatus.tsx  # Connection status display
│   │   └── CalendarSyncIndicator.tsx     # Sync status badge
│   │
│   ├── availability/
│   │   ├── AvailabilityManager.tsx       # Full availability management
│   │   ├── WeeklyScheduleGrid.tsx        # Visual weekly grid
│   │   ├── TimeSlotEditor.tsx            # Add/edit time slots
│   │   ├── TimezoneSelector.tsx          # Timezone picker
│   │   └── AvailabilityPreview.tsx       # Preview as mentee sees it
│   │
│   ├── offers/
│   │   ├── OffersList.tsx                # List mentor offers
│   │   ├── OfferCard.tsx                 # Single offer display
│   │   ├── OfferModal.tsx                # Create/edit offer modal
│   │   └── PaymentRequiredBanner.tsx     # "Setup payments" notice
│   │
│   └── profile/
│       ├── MentorProfileHero.tsx         # Enhanced hero section
│       ├── ExpertiseSection.tsx          # Expertise areas display
│       ├── TestimonialsSection.tsx       # Ratings/testimonials
│       ├── BadgesSection.tsx             # Mentor badges display
│       ├── OffersSection.tsx             # Public offers display
│       └── RequestMentorshipModal.tsx    # Mentorship request flow
```

#### Page Structure

```
app/
├── mentor/
│   └── onboarding/
│       └── page.tsx                      # Full-page onboarding wizard
│
├── dashboard/
│   └── mentor/
│       ├── page.tsx                      # Mentor dashboard (existing)
│       ├── availability/
│       │   └── page.tsx                  # Availability management
│       ├── offers/
│       │   └── page.tsx                  # Consultation offers
│       └── profile/
│           └── page.tsx                  # Mentor profile editor
│
├── m/
│   └── [handle]/
│       ├── page.tsx                      # Enhanced public profile (existing)
│       └── public-profile-content.tsx    # Enhanced content component
```

### 4.4 State Management

#### Onboarding State (Zustand Store)

```typescript
interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  formData: {
    bio: string;
    expertiseAreas: string[];
    skills: string[];
    languages: string[];
    timezone: string;
    yearsOfExperience: number;
    availability: AvailabilitySlot[];
    handle: string;
    calendarConnected: boolean;
  };
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStep: (step: number) => void;
  completeStep: (step: number) => void;
  updateFormData: (data: Partial<OnboardingState['formData']>) => void;
  reset: () => void;
  loadProgress: () => Promise<void>;
  saveProgress: () => Promise<void>;
}
```

### 4.5 Google Calendar Integration

#### OAuth Flow

1. User clicks "Connect Google Calendar"
2. Frontend calls `GET /api/mentor/calendar/auth-url`
3. Backend generates OAuth URL with:
   - Scopes: `calendar.readonly`, `calendar.events.readonly`
   - State: encrypted profile_id + CSRF token
   - Redirect: `/api/mentor/calendar/callback`
4. User completes Google consent
5. Callback exchanges code for tokens
6. Tokens encrypted and stored in `calendar_connections`
7. Initial sync triggered
8. Webhook channel created for push notifications

#### Webhook-Based Sync

```typescript
// Push notification flow
// 1. On connection, register webhook channel with Google
// 2. Google sends POST to /api/mentor/calendar/webhook on changes
// 3. Webhook handler:
//    - Validates X-Goog-Resource-ID header
//    - Fetches updated busy/free data
//    - Updates calendar_busy_blocks table
//    - Expires and re-registers channel before expiry (7 days)
```

#### Security Considerations

- Refresh tokens encrypted at rest using AES-256
- Access tokens short-lived (1 hour)
- Webhook channel IDs validated on every request
- Minimal scope requested (read-only calendar access)

---

## 5. UI/UX Design

### 5.1 Onboarding Wizard

#### Layout
- Full-page experience (no dashboard chrome)
- Progress bar at top showing steps 1-6
- Left panel: step content
- Right panel: preview/context (on desktop)
- Mobile: single-column stacked layout

#### Step 1: Welcome
- Headline: "Welcome to Mentoring on Mentorshape"
- Benefits list (earn badges, help others, optional paid consultations)
- Existing profile data pulled (avatar, name)
- CTA: "Get Started"

#### Step 2: Bio & Expertise
- Bio textarea (existing bio pre-filled if available)
- Expertise areas tag input (suggestions based on profile data)
- Character counter for bio
- Live preview of how bio appears

#### Step 3: Skills & Languages
- Skills multi-select (existing skills pre-filled)
- Languages dropdown with search
- Timezone auto-detected but editable
- Years of experience slider (0-50)

#### Step 4: Availability Basics
- Visual weekly grid
- Click/drag to add time blocks
- Timezone displayed prominently
- Optional: "Connect Google Calendar" card
- Skip option for manual-only availability

#### Step 5: Handle Selection
- Input field with `/m/` prefix shown
- Real-time availability check
- Suggestions if taken (add numbers, underscores)
- Preview of full URL

#### Step 6: Review & Submit
- Summary cards for each section
- Edit buttons to jump back
- Terms acceptance checkbox
- "Become a Mentor" CTA button
- Redirect to mentor dashboard on success

### 5.2 Public Mentor Profile (Enhanced)

#### Linktree-Style Layout
- Mobile-first vertical stack
- Hero: Avatar (larger), name, headline, expertise tags
- Section: "About" with bio
- Section: "Expertise Areas" with icons
- Section: "Skills" with proficiency levels
- Section: "Testimonials" (from ratings table)
- Section: "Badges" earned
- Section: "Consultation Offerings" cards
- Sticky CTA: "Request Mentorship" button

#### Visual Design
- Clean white background with subtle shadows
- Accent color derived from avatar or configurable
- Smooth scroll-snap between sections on mobile
- Skeleton loading states

### 5.3 Availability Manager

#### Weekly Grid View
- 7-day row headers
- 24-hour column (or configurable range)
- Drag to select time blocks
- Color-coded: green = available, gray = busy from calendar
- Click block to edit/delete

#### Time Slot Editor
- Day selector (multi-select for same time multiple days)
- Start/end time pickers
- Timezone prominent
- Repeat: weekly (default for MVP)

---

## 6. Security Considerations

### 6.1 Authentication & Authorization

| Concern | Mitigation |
|---------|------------|
| Onboarding access | Clerk middleware verifies authenticated user |
| Mentor-only routes | `requireMentor()` guard checks `is_mentor=true` |
| Data isolation | RLS policies scope all queries to user's profile |
| Handle enumeration | Rate limit handle availability checks |

### 6.2 OAuth Security

| Concern | Mitigation |
|---------|------------|
| Token storage | Refresh tokens encrypted with AES-256-GCM |
| Token exposure | Access tokens never sent to frontend |
| State tampering | CSRF token in OAuth state parameter |
| Scope creep | Minimal read-only scopes requested |

### 6.3 Webhook Security

| Concern | Mitigation |
|---------|------------|
| Spoofed webhooks | Validate `X-Goog-Resource-ID` matches stored channel |
| Replay attacks | Check `X-Goog-Resource-State` for sync vs. exists |
| DoS via webhooks | Rate limit webhook endpoint |

### 6.4 Data Privacy

| Concern | Mitigation |
|---------|------------|
| Calendar event titles | Only busy/free status synced, not event details |
| Profile visibility | Granular visibility controls per section |
| Soft delete | Calendar connection data fully deleted on disconnect |

---

## 7. Testing Strategy

### 7.1 Unit Tests

| Area | Tests |
|------|-------|
| Availability calculation | Time slot overlap detection, timezone conversion |
| Handle validation | Format rules, uniqueness, reserved words |
| Form validation | Onboarding step schemas with Zod |

### 7.2 Integration Tests

| Area | Tests |
|------|-------|
| Onboarding API | Progress save/restore, completion flow |
| Calendar API | OAuth mock, token refresh, webhook handling |
| Availability API | CRUD operations, busy block filtering |

### 7.3 E2E Tests

| Flow | Coverage |
|------|----------|
| Complete onboarding | All 6 steps, success redirect |
| Calendar connect | OAuth flow (mocked), disconnect |
| Public profile view | Data display, CTA functionality |
| Availability booking | Slot selection, timezone handling |

### 7.4 Test Data

```typescript
// Test fixtures for mentor onboarding
const mockMentorOnboarding = {
  profile_id: 'uuid',
  current_step: 3,
  completed_steps: [1, 2],
  form_data: {
    bio: 'Experienced software engineer...',
    expertise_areas: ['Career Coaching', 'Technical Interviews'],
    // ...
  }
};

// Mock Google Calendar responses
const mockCalendarBusy = {
  calendars: {
    primary: {
      busy: [
        { start: '2026-01-25T10:00:00Z', end: '2026-01-25T11:00:00Z' }
      ]
    }
  }
};
```

---

## 8. Migration Plan

### 8.1 Database Migrations

**Order of execution:**

1. `015_mentor_onboarding.sql` - New tables
2. `016_mentor_offers_update.sql` - Add columns to existing table

**Rollback plan:**

```sql
-- Rollback 015
DROP TABLE IF EXISTS public.calendar_busy_blocks;
DROP TABLE IF EXISTS public.mentor_availability;
DROP TABLE IF EXISTS public.calendar_connections;
DROP TABLE IF EXISTS public.mentor_onboarding_progress;

-- Rollback 016
ALTER TABLE public.mentor_offers DROP COLUMN IF EXISTS payment_required;
ALTER TABLE public.mentor_offers DROP COLUMN IF EXISTS sort_order;
```

### 8.2 Feature Flags

| Flag | Purpose |
|------|---------|
| `mentor_onboarding_enabled` | Gate onboarding wizard access |
| `google_calendar_enabled` | Gate calendar OAuth flow |
| `mentor_offers_enabled` | Gate consultation offerings |

### 8.3 Deployment Steps

1. Deploy database migrations (no breaking changes)
2. Deploy backend APIs with feature flags OFF
3. Deploy frontend components (hidden behind flags)
4. Enable `mentor_onboarding_enabled` for internal testing
5. Enable `google_calendar_enabled` with limited OAuth quota
6. Gradual rollout to all users
7. Monitor error rates and calendar sync performance

---

## 9. Dependencies

### 9.1 External Services

| Service | Purpose | Cost Model |
|---------|---------|------------|
| Google Calendar API | OAuth, calendar read | Free tier (1M requests/day) |
| Google Cloud Console | OAuth client credentials | Free |

### 9.2 NPM Packages

| Package | Purpose | Version |
|---------|---------|---------|
| `googleapis` | Google API client | ^130.0.0 |
| `@react-email/components` | Email templates | ^0.0.22 |

### 9.3 Internal Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Profile system (Phase 1) | Complete | Extends existing profiles |
| Handle reservation | Complete | `/api/profile/handle/check` exists |
| Clerk auth | Complete | Middleware in place |

---

## 10. Open Questions

### 10.1 Product Decisions

| # | Question | Default Assumption | Decision |
|---|----------|-------------------|----------|
| Q1 | Should mentors be able to set different availability per consultation type? | No (single availability for MVP) | TBD |
| Q2 | What happens to existing `is_mentor=true` users who haven't completed onboarding? | Migrate with `onboarding_completed_at=NULL` flag | TBD |
| Q3 | Should we require email verification before becoming a mentor? | No (Clerk handles verification) | TBD |
| Q4 | Maximum number of expertise areas allowed? | 10 | TBD |
| Q5 | Should testimonials require mentor approval before displaying? | No (auto-display after collab completion) | TBD |

### 10.2 Technical Decisions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| T1 | Where to encrypt OAuth tokens? | Application layer vs Supabase vault | Application layer (more control) |
| T2 | Calendar sync frequency for fallback (if webhooks fail)? | 15 min, 30 min, 1 hour | 30 min via Edge Function |
| T3 | Store availability in UTC or user's timezone? | UTC with TZ stored, User TZ | UTC with TZ metadata |
| T4 | Handle max length? | 20, 30, 50 chars | 30 characters |

### 10.3 Future Considerations

| Item | Notes |
|------|-------|
| Microsoft Outlook | Requires separate OAuth app registration; similar architecture |
| Stripe Connect | Phase 4; will add `stripe_account_id` to profiles |
| Digital Products | Phase 4; new `mentor_products` table |
| Availability exceptions | Single-day overrides (vacation, holidays) |

---

## Appendix A: API Schemas

### Onboarding Progress Response

```typescript
interface OnboardingProgressResponse {
  id: string;
  profile_id: string;
  current_step: number;
  completed_steps: number[];
  form_data: {
    bio?: string;
    expertise_areas?: string[];
    skills?: string[];
    languages?: string[];
    timezone?: string;
    years_of_experience?: number;
    availability?: AvailabilitySlot[];
    handle?: string;
    calendar_connected?: boolean;
  };
  started_at: string;
  completed_at: string | null;
}
```

### Availability Slot

```typescript
interface AvailabilitySlot {
  id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  timezone: string; // IANA timezone
  is_active: boolean;
}
```

### Mentor Offer

```typescript
interface MentorOffer {
  id: string;
  mentor_profile_id: string;
  type: 'free_collab' | 'paid_consult' | 'digital_product';
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  payment_required: boolean;
  sort_order: number;
}
```

---

## Appendix B: Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ONBOARDING_NOT_STARTED` | 404 | No onboarding record exists |
| `ONBOARDING_ALREADY_COMPLETE` | 409 | User already completed onboarding |
| `HANDLE_TAKEN` | 409 | Requested handle unavailable |
| `HANDLE_INVALID` | 400 | Handle format invalid |
| `CALENDAR_AUTH_FAILED` | 401 | OAuth flow failed |
| `CALENDAR_NOT_CONNECTED` | 400 | Attempting action without calendar |
| `AVAILABILITY_OVERLAP` | 400 | Time slots overlap |
| `AVAILABILITY_INVALID_RANGE` | 400 | End time before start time |

---

## Appendix C: Wireframes

*Wireframes to be added in `/agent-os/specs/2026-01-23-mentor-onboarding-profiles/wireframes/`*

- `01-onboarding-welcome.png`
- `02-onboarding-bio.png`
- `03-onboarding-skills.png`
- `04-onboarding-availability.png`
- `05-onboarding-handle.png`
- `06-onboarding-review.png`
- `07-public-profile.png`
- `08-availability-manager.png`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Spec Writer Agent | Initial draft |
