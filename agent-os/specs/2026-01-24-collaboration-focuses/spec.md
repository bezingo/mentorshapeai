# Phase 3: Collaboration & Focuses Specification

## Overview

This specification covers the complete mentor-mentee collaboration lifecycle, from initial request through goal completion. It includes focus booking, AI-powered focus planning and summarization, video meeting integration, progress tracking, and goal completion flows.

## Goals

1. Enable mentees to request collaboration with mentors
2. Provide seamless focus booking integrated with mentor availability
3. Leverage AI agents for focus preparation and post-focus analysis
4. Integrate video meetings (Zoom) for live focuses
5. Track milestone progress and provide actionable insights
6. Celebrate goal completion with shareable achievements

## Non-Goals

1. Real-time chat/messaging (Phase 6)
2. Payment processing for focuses (Phase 4)
3. Organization-level collaboration management (Phase 5)
4. Microsoft Teams integration (future)

---

## User Stories

### Collaboration Lifecycle

1. As a mentee, I want to request collaboration with a mentor so I can get guidance on my goal
2. As a mentor, I want to review collaboration requests so I can decide which mentees to help
3. As a mentor, I want to accept or decline requests with an optional message
4. As a mentee, I want to see the status of my collaboration requests
5. As either party, I want to end a collaboration when the goal is complete or if it's not working out
6. As a mentee, I want to have multiple active collaborations for different goals

### Focus Booking

7. As a mentee, I want to see my mentor's available time slots for the next 2 weeks
8. As a mentee, I want to book a focus by selecting an available slot
9. As a mentor, I want booked focuses to appear in my Google Calendar
10. As a mentee, I want to receive calendar invites for booked focuses
11. As either party, I want to cancel or reschedule a focus with notice
12. As a mentor, I want to set focus duration options (30min, 60min)

### AI Focus Planner

13. As a mentee, I want an AI-generated agenda before each focus
14. As a mentor, I want to see the mentee's progress and blockers before focuses
15. As either party, I want suggested discussion topics based on goal progress
16. As a mentee, I want reminders of action items from previous focuses

### Video Meetings

17. As a mentor, I want Zoom meetings auto-created for booked focuses
18. As either party, I want a "Join Meeting" button in the focus details
19. As a mentor, I want focus recordings saved for reference
20. As the system, I want to extract transcripts from completed focuses

### AI Transcript Summarizer

21. As a mentee, I want an AI summary of each focus delivered after completion
22. As either party, I want action items extracted and assigned
23. As a mentee, I want milestone status updates suggested based on discussion
24. As a mentor, I want key decisions documented automatically

### Progress Tracking

25. As a mentee, I want a dashboard showing my milestone completion progress
26. As a mentee, I want to log weekly check-ins (mood, notes, blockers)
27. As a mentor, I want to see all my mentees' progress at a glance
28. As a mentee, I want to track action item completion
29. As either party, I want to see a timeline of focuses and updates

### AI Progress Tracker

30. As a mentee, I want weekly AI-generated progress scores
31. As a mentor, I want alerts when a mentee's progress stalls
32. As a mentee, I want predictions about goal completion timeline
33. As the system, I want to send nudges for overdue action items

### Goal Completion

34. As a mentee, I want to mark my goal as complete when achieved
35. As a mentor, I want to confirm goal completion
36. As a mentee, I want an AI-generated final summary of my journey
37. As a mentee, I want a shareable LinkedIn achievement post
38. As a mentor, I want to receive a badge for successful collaborations
39. As a mentee, I want to write a reflection and rate my mentor

---

## Technical Design

### Database Schema

#### New Tables

```sql
-- Collaboration between mentor and mentee for a specific goal
CREATE TABLE collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  mentor_profile_id UUID NOT NULL REFERENCES profiles(id),
  mentee_profile_id UUID NOT NULL REFERENCES profiles(id),
  offer_id UUID REFERENCES mentor_offers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  request_message TEXT,
  response_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'active', 'completed', 'cancelled', 'declined')),
  CONSTRAINT different_parties CHECK (mentor_profile_id != mentee_profile_id),
  UNIQUE(goal_id, mentor_profile_id)
);

-- Focuses within a collaboration
CREATE TABLE focuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  meeting_url TEXT,
  meeting_id TEXT,
  meeting_provider TEXT DEFAULT 'zoom',
  recording_url TEXT,
  transcript_url TEXT,
  mentor_calendar_event_id TEXT,
  mentee_calendar_event_id TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'))
);

-- AI-generated focus agendas
CREATE TABLE focus_agendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES focuses(id) ON DELETE CASCADE UNIQUE,
  topics JSONB NOT NULL DEFAULT '[]',
  questions JSONB NOT NULL DEFAULT '[]',
  previous_action_items JSONB NOT NULL DEFAULT '[]',
  preparation_tips TEXT[],
  mentee_notes TEXT,
  mentor_notes TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI-generated focus summaries
CREATE TABLE focus_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES focuses(id) ON DELETE CASCADE UNIQUE,
  summary TEXT NOT NULL,
  key_decisions JSONB NOT NULL DEFAULT '[]',
  mentee_action_items JSONB NOT NULL DEFAULT '[]',
  mentor_action_items JSONB NOT NULL DEFAULT '[]',
  milestone_updates JSONB NOT NULL DEFAULT '[]',
  mood_rating INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_mood CHECK (mood_rating IS NULL OR (mood_rating >= 1 AND mood_rating <= 5))
);

-- Action items from focuses
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID REFERENCES focuses(id) ON DELETE SET NULL,
  collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  assignee_profile_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

-- Weekly check-ins from mentees
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  week_start DATE NOT NULL,
  mood_rating INTEGER NOT NULL,
  progress_notes TEXT,
  blockers TEXT,
  wins TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_mood CHECK (mood_rating >= 1 AND mood_rating <= 5),
  UNIQUE(collaboration_id, profile_id, week_start)
);

-- AI progress tracking scores
CREATE TABLE progress_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  trend TEXT NOT NULL DEFAULT 'stable',
  analysis TEXT NOT NULL,
  risk_areas JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  predicted_completion_date DATE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100),
  CONSTRAINT valid_trend CHECK (trend IN ('improving', 'stable', 'declining'))
);

-- Goal completion records
CREATE TABLE goal_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE UNIQUE,
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE SET NULL,
  completed_by UUID NOT NULL REFERENCES profiles(id),
  confirmed_by UUID REFERENCES profiles(id),
  final_summary TEXT,
  mentee_reflection TEXT,
  mentor_feedback TEXT,
  rating INTEGER,
  linkedin_post_text TEXT,
  badge_awarded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- Mentor badges earned
CREATE TABLE mentor_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(profile_id, badge_type, collaboration_id)
);
```

#### Indexes

```sql
CREATE INDEX idx_collaborations_mentor ON collaborations(mentor_profile_id, status);
CREATE INDEX idx_collaborations_mentee ON collaborations(mentee_profile_id, status);
CREATE INDEX idx_collaborations_goal ON collaborations(goal_id);
CREATE INDEX idx_focuses_collaboration ON focuses(collaboration_id, scheduled_at);
CREATE INDEX idx_focuses_scheduled ON focuses(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_action_items_assignee ON action_items(assignee_profile_id, status);
CREATE INDEX idx_action_items_due ON action_items(due_date) WHERE status = 'pending';
CREATE INDEX idx_check_ins_collaboration ON check_ins(collaboration_id, week_start);
CREATE INDEX idx_progress_scores_collaboration ON progress_scores(collaboration_id, generated_at);
CREATE INDEX idx_mentor_badges_profile ON mentor_badges(profile_id);
```

### API Routes

#### Collaboration APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/collaborations` | List user's collaborations (as mentor or mentee) |
| POST | `/api/collaborations` | Request new collaboration |
| GET | `/api/collaborations/[id]` | Get collaboration details |
| PATCH | `/api/collaborations/[id]` | Update collaboration (accept/decline/complete) |
| DELETE | `/api/collaborations/[id]` | Cancel collaboration |

#### Focus APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/collaborations/[id]/focuses` | List focuses for collaboration |
| POST | `/api/collaborations/[id]/focuses` | Book new focus |
| GET | `/api/focuses/[id]` | Get focus details |
| PATCH | `/api/focuses/[id]` | Update focus (reschedule/cancel) |
| POST | `/api/focuses/[id]/complete` | Mark focus complete |

#### Agenda & Summary APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/focuses/[id]/agenda` | Get focus agenda |
| POST | `/api/focuses/[id]/agenda/generate` | Generate AI agenda |
| GET | `/api/focuses/[id]/summary` | Get focus summary |
| POST | `/api/focuses/[id]/summary/generate` | Generate AI summary |

#### Action Items APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/collaborations/[id]/action-items` | List action items |
| POST | `/api/collaborations/[id]/action-items` | Create action item |
| PATCH | `/api/action-items/[id]` | Update action item |
| DELETE | `/api/action-items/[id]` | Delete action item |

#### Check-ins APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/collaborations/[id]/check-ins` | List check-ins |
| POST | `/api/collaborations/[id]/check-ins` | Submit check-in |

#### Progress APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/collaborations/[id]/progress` | Get progress scores |
| POST | `/api/collaborations/[id]/progress/analyze` | Generate AI progress analysis |

#### Goal Completion APIs

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/goals/[id]/complete` | Mark goal complete |
| POST | `/api/goals/[id]/complete/confirm` | Mentor confirms completion |
| GET | `/api/goals/[id]/completion` | Get completion record |
| POST | `/api/goals/[id]/completion/linkedin` | Generate LinkedIn post |

#### Zoom Integration APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/integrations/zoom/auth-url` | Get Zoom OAuth URL |
| GET | `/api/integrations/zoom/callback` | Handle OAuth callback |
| POST | `/api/integrations/zoom/meetings` | Create Zoom meeting |
| GET | `/api/integrations/zoom/recordings/[id]` | Get recording |
| POST | `/api/webhooks/zoom` | Handle Zoom webhooks |

### AI Agents

#### Focus Planner Agent

**Purpose**: Generate pre-focus agendas

**Inputs**:
- Goal details and milestones
- Previous focus summaries
- Outstanding action items
- Recent check-ins
- Time since last focus

**Outputs**:
```typescript
interface FocusAgenda {
  topics: {
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    estimated_minutes: number
  }[]
  questions: {
    question: string
    context: string
  }[]
  previous_action_items: {
    title: string
    status: string
    notes: string
  }[]
  preparation_tips: string[]
}
```

#### Transcript Summarizer Agent

**Purpose**: Generate post-focus summaries from transcripts

**Inputs**:
- Meeting transcript
- Focus agenda
- Goal context

**Outputs**:
```typescript
interface FocusSummary {
  summary: string
  key_decisions: {
    decision: string
    context: string
  }[]
  mentee_action_items: {
    title: string
    description: string
    due_date?: string
  }[]
  mentor_action_items: {
    title: string
    description: string
    due_date?: string
  }[]
  milestone_updates: {
    milestone_id: string
    suggested_status: string
    notes: string
  }[]
}
```

#### Progress Tracker Agent

**Purpose**: Analyze progress and predict outcomes

**Inputs**:
- Milestone completion status
- Focus attendance
- Action item completion rate
- Check-in data (mood, blockers)
- Time remaining on goal

**Outputs**:
```typescript
interface ProgressAnalysis {
  score: number // 0-100
  trend: 'improving' | 'stable' | 'declining'
  analysis: string
  risk_areas: {
    area: string
    severity: 'high' | 'medium' | 'low'
    recommendation: string
  }[]
  recommendations: string[]
  predicted_completion_date: string | null
}
```

#### Completion Agent

**Purpose**: Generate goal completion summary

**Inputs**:
- All focus summaries
- Milestone history
- Goal details
- Collaboration duration

**Outputs**:
```typescript
interface CompletionSummary {
  final_summary: string
  journey_highlights: string[]
  skills_developed: string[]
  linkedin_post: string
  suggested_next_goals: string[]
}
```

### Component Architecture

#### Pages

```
app/
├── dashboard/
│   ├── collaborations/
│   │   ├── page.tsx              # List all collaborations
│   │   └── [id]/
│   │       ├── page.tsx          # Collaboration detail
│   │       ├── focuses/
│   │       │   └── page.tsx      # Focuses list
│   │       ├── progress/
│   │       │   └── page.tsx      # Progress dashboard
│   │       └── action-items/
│   │           └── page.tsx      # Action items list
│   └── mentee/
│       └── goals/
│           └── [goalId]/
│               └── complete/
│                   └── page.tsx  # Goal completion flow
├── focuses/
│   └── [id]/
│       ├── page.tsx              # Focus detail/join
│       ├── agenda/
│       │   └── page.tsx          # Focus agenda
│       └── summary/
│           └── page.tsx          # Focus summary
```

#### Components

```
components/
├── collaborations/
│   ├── CollaborationCard.tsx
│   ├── CollaborationRequestModal.tsx
│   ├── CollaborationStatusBadge.tsx
│   ├── CollaborationTimeline.tsx
│   └── MentorCollaborationsList.tsx
├── focuses/
│   ├── FocusCard.tsx
│   ├── FocusBookingModal.tsx
│   ├── FocusAgendaView.tsx
│   ├── FocusSummaryView.tsx
│   ├── TimeSlotPicker.tsx
│   └── JoinMeetingButton.tsx
├── progress/
│   ├── ProgressDashboard.tsx
│   ├── ProgressScoreCard.tsx
│   ├── MilestoneTracker.tsx
│   ├── ActionItemsList.tsx
│   ├── CheckInForm.tsx
│   └── ProgressTimeline.tsx
├── completion/
│   ├── GoalCompletionWizard.tsx
│   ├── CompletionSummaryCard.tsx
│   ├── MentorRatingForm.tsx
│   ├── LinkedInShareCard.tsx
│   └── BadgeAwardCard.tsx
```

### Zoom Integration

#### OAuth Flow

1. Mentor clicks "Connect Zoom" in settings
2. Redirect to Zoom OAuth with scopes: `meeting:write`, `recording:read`
3. Callback stores encrypted tokens in `zoom_connections` table
4. Auto-refresh tokens on API calls

#### Meeting Creation

When focus is booked:
1. Check mentor has Zoom connected
2. Create meeting via Zoom API with:
   - Topic: "MentorShape: {Mentor} + {Mentee}"
   - Duration: focus duration
   - Start time: scheduled time
   - Settings: auto-record to cloud
3. Store meeting_id and join_url in focus record
4. Add to both calendars with join link

#### Webhook Handling

Listen for Zoom webhooks:
- `meeting.ended` - Mark focus complete, trigger summary generation
- `recording.completed` - Fetch transcript, store URL

---

## UI/UX Design

### Collaboration Request Flow

1. Mentee views mentor profile at `/m/[handle]`
2. Clicks "Request Mentorship" button
3. Modal shows:
   - Goal selector (their active goals)
   - Offer selector (if mentor has offers)
   - Message textarea
4. Submit creates collaboration request
5. Redirect to collaborations page with success message

### Focus Booking Flow

1. Mentee opens collaboration detail page
2. Clicks "Book Focus" button
3. Modal shows:
   - 2-week calendar view
   - Available slots (from mentor availability minus busy blocks)
   - Duration selector (30min/60min)
4. Select slot and confirm
5. Focus created, calendar events sent

### Progress Dashboard

Layout:
```
┌─────────────────────────────────────────────────┐
│  Progress Score: 78/100  [↑ Improving]          │
│  ████████████████████░░░░░                      │
├─────────────────────────────────────────────────┤
│  Milestones           │  Action Items           │
│  ├─ ✅ Complete (3)   │  ├─ ⏰ Due Today (2)    │
│  ├─ 🔄 In Progress (2)│  ├─ 📋 Pending (5)     │
│  └─ ⏳ Upcoming (2)   │  └─ ✅ Done (12)       │
├─────────────────────────────────────────────────┤
│  Focuses Timeline                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ Jan 5│  │Jan 12│  │Jan 19│  │Jan 26│       │
│  │  ✅  │  │  ✅  │  │  📅  │  │  ─   │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
├─────────────────────────────────────────────────┤
│  Weekly Check-in                                │
│  How are you feeling? 😊😐😕                    │
│  [Progress notes...]                            │
│  [Submit Check-in]                              │
└─────────────────────────────────────────────────┘
```

### Goal Completion Flow

5-step wizard:
1. **Confirm Completion** - Review goal, confirm achieved
2. **Reflection** - Mentee writes reflection
3. **Rate Mentor** - 1-5 stars + feedback
4. **AI Summary** - View generated summary
5. **Share** - Generate LinkedIn post, download certificate

---

## Security Considerations

1. **RLS Policies**: Users can only access their own collaborations/focuses
2. **Zoom Tokens**: Encrypted at rest like Google Calendar tokens
3. **Transcripts**: Only accessible to collaboration participants
4. **Meeting Links**: Include random token to prevent guessing

---

## Testing Requirements

### Unit Tests
- Availability slot calculation with focus conflicts
- Progress score calculation
- Action item status transitions

### Integration Tests
- Collaboration lifecycle (request → accept → complete)
- Focus booking with calendar integration
- AI agent outputs

### E2E Tests
- Full collaboration flow from request to completion
- Focus booking and joining
- Goal completion wizard

---

## Migration Plan

1. Deploy database migrations
2. Release collaboration APIs
3. Release focus booking (without Zoom initially)
4. Integrate Zoom OAuth and meeting creation
5. Release AI agents (Focus Planner, then Summarizer)
6. Release progress tracking
7. Release goal completion flow

---

## Environment Variables Required

```env
# Zoom OAuth
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_WEBHOOK_SECRET=your-webhook-verification-token

# Already configured
OPENAI_API_KEY=...
ENCRYPTION_KEY=...
NEXT_PUBLIC_APP_URL=...
```

---

## Open Questions

1. Should mentors be able to request minimum focus notice (e.g., 24h)?
2. Should we support recurring focuses (weekly at same time)?
3. How long should recordings/transcripts be retained?
4. Should progress scores be visible to both parties or just mentees?
