# Mentorshape – API Contracts (REST-ish over Next.js Route Handlers)

## Conventions

- All routes under `/api/*`
- Auth via Clerk (session; server-side checks).
- JSON responses: `{ data, error }`
- Use Zod on both ends for validation.
- All timestamps in ISO 8601 format (UTC)
- All monetary amounts in cents (integers)

---

## Standard Response Format

### Success Response

```json
{
  "data": {
    // Response payload
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context (optional)"
    },
    "retryable": false,
    "retry_after": null
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Input validation failed (400)
- `NOT_FOUND`: Resource not found (404)
- `UNAUTHORIZED`: Authentication required (401)
- `FORBIDDEN`: Insufficient permissions (403)
- `CONFLICT`: Resource conflict (e.g., double-booking) (409)
- `RATE_LIMIT_EXCEEDED`: Too many requests (429)
- `SERVICE_UNAVAILABLE`: External service down (503)
- `INTERNAL_ERROR`: Server error (500)

---

## Pagination

### Query Parameters

- `page`: Page number (default: 1, min: 1)
- `limit`: Items per page (default: 20, min: 1, max: 100)
- `cursor`: Cursor for cursor-based pagination (alternative to page-based)

### Response Format

```json
{
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

**Cursor-based Pagination (Alternative):**

```json
{
  "data": [
    // Array of items
  ],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyIsInRpbWUiOiIyMDI1LTAxLTEwVDE2OjAwOjAwWiJ9",
    "has_next": true,
    "limit": 20
  }
}
```

---

## Rate Limiting

### Rate Limits

- **Authenticated endpoints**: 100 requests/minute per user
- **Public endpoints**: 30 requests/minute per IP
- **Webhook endpoints**: 200 requests/minute per IP
- **AI endpoints**: 20 requests/minute per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641900000
Retry-After: 60
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryable": true,
    "retry_after": 60
  }
}
```

Status Code: `429 Too Many Requests`

---

## Auth & User Sync

### POST /api/webhook/clerk

Triggered by Clerk webhooks.

**Headers:**
- `svix-id`: Webhook ID
- `svix-timestamp`: Webhook timestamp
- `svix-signature`: Webhook signature (HMAC SHA256)

**Request Body:**
```json
{
  "type": "user.created",
  "data": {
    "id": "clerk_user_id",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Webhook Events:**
- `user.created`: Create user and profile rows
- `user.updated`: Update user row
- `user.deleted`: Soft-delete user (set deleted_at) or cascade via FK

**Response:**
```json
{
  "data": {
    "status": "processed",
    "user_id": "uuid"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid webhook signature
- `400 Bad Request`: Invalid webhook payload
- `429 Too Many Requests`: Rate limit exceeded

**Security:**
- Verify webhook signature using `CLERK_WEBHOOK_SECRET`
- Check webhook timestamp (prevent replay attacks)
- Idempotency handling (prevent duplicate processing)

Profile API
GET /api/profile/me

Returns current user profile.

Response:

{
  "data": {
    "id": "uuid",
    "display_name": "Has",
    "headline": "Growth & Product",
    "bio": "...",
    "is_mentor": true,
    "is_mentee": true
  }
}

PUT /api/profile/me

Update profile.

Body:

{
  "display_name": "string",
  "headline": "string",
  "bio": "string",
  "avatar_url": "string",
  "is_mentor": true,
  "is_mentee": true
}

Goals API
POST /api/goals

Create new goal.

**Request Body:**
```json
{
  "title": "Become a PM in 6 months",
  "description": "I want to transition from marketing to product.",
  "category": "career",
  "duration_days": 60,
  "success_definition": "Land a PM interview + create portfolio.",
  "current_challenges": "No PM experience, no portfolio."
}
```

**Validation Rules:**
- `title`: Required, string, 3-200 characters
- `description`: Optional, string, max 5000 characters
- `category`: Required, enum (`career`, `startup`, `fitness`, `learning`, `personal_growth`)
- `duration_days`: Required, integer, 30 or 60
- `success_definition`: Optional, string, max 1000 characters
- `current_challenges`: Optional, string, max 1000 characters

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "public_slug": "pm-transition-123",
    "status": "draft",
    "created_at": "2025-01-10T16:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Not authenticated
- `429 Too Many Requests`: Rate limit exceeded


GET /api/goals

List current user's goals (as mentee).

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `active`, `completed`, `archived`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Become a PM in 6 months",
      "status": "active",
      "public_slug": "pm-transition-123",
      "created_at": "2025-01-10T16:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `429 Too Many Requests`: Rate limit exceeded

GET /api/goals/[goalId]

Full goal detail (owner or collaborator).

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Become a PM in 6 months",
    "description": "...",
    "status": "active",
    "milestones": [...],
    "collaborations": [...]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not owner or collaborator
- `404 Not Found`: Goal not found

GET /api/goals/public/[slug]

Public goal data (sanitized, public view). No authentication required.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Become a PM in 6 months",
    "description": "...",
    "category": "career",
    "duration_days": 60,
    "milestones": [...],
    "mentee": {
      "display_name": "John Doe",
      "headline": "Marketing Professional"
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: Goal not found or not public

Collaborations API
POST /api/collaborations

Mentor starts a collab from a public goal page.

Body:

{
  "goal_id": "uuid"
}


Behavior:

Auth user must be mentor (is_mentor = true)

Creates collaboration with status = "pending"

Notifies mentee

POST /api/collaborations/[collabId]/accept

Mentee accepts collab.

POST /api/collaborations/[collabId]/close

Either party closes collab.

GET /api/collaborations?role=mentor|mentee

List collaborations for current user.

**Query Parameters:**
- `role` (required): Filter by role (`mentor` or `mentee`)
- `status` (optional): Filter by status (`pending`, `active`, `completed`, `cancelled`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "goal": {
        "id": "uuid",
        "title": "Become a PM"
      },
      "mentor": {...},
      "mentee": {...},
      "status": "active",
      "start_date": "2025-01-10",
      "end_date": "2025-03-10"
    }
  ],
  "pagination": {...}
}
```

**Error Responses:**
- `400 Bad Request`: Invalid role parameter
- `401 Unauthorized`: Not authenticated

Focus Sessions API
POST /api/sessions

Create a Focus (book a session).

**Request Body:**
```json
{
  "collaboration_id": "uuid",
  "start_time": "2025-01-10T16:00:00Z",
  "duration_minutes": 60
}
```

**Validation Rules:**
- `collaboration_id`: Required, UUID, must exist and be active
- `start_time`: Required, ISO 8601 timestamp, must be future
- `duration_minutes`: Required, integer, 15-180 minutes

**Behavior:**
- Validate against mentor availability + calendar busy times
- Create calendar event + meeting link
- Trigger Session Planner AI

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "collaboration_id": "uuid",
    "start_time": "2025-01-10T16:00:00Z",
    "end_time": "2025-01-10T17:00:00Z",
    "meeting_url": "https://zoom.us/j/123456",
    "status": "scheduled",
    "agenda_ai": {...}
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or invalid time
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not part of collaboration
- `409 Conflict`: Time slot unavailable (double-booking)
- `429 Too Many Requests`: Rate limit exceeded

GET /api/sessions?collaboration_id=uuid

List all sessions in a collaboration.

**Query Parameters:**
- `collaboration_id` (required): Filter by collaboration
- `status` (optional): Filter by status (`scheduled`, `completed`, `cancelled`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "start_time": "2025-01-10T16:00:00Z",
      "status": "completed",
      "agenda_ai": {...}
    }
  ],
  "pagination": {...}
}
```

GET /api/sessions/[sessionId]

Get session detail + agenda + artifacts.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "collaboration_id": "uuid",
    "start_time": "2025-01-10T16:00:00Z",
    "end_time": "2025-01-10T17:00:00Z",
    "meeting_url": "https://zoom.us/j/123456",
    "status": "completed",
    "agenda_ai": {...},
    "artifacts": {
      "recording_url": "https://...",
      "transcript_text": "...",
      "summary_ai": "...",
      "action_items_ai": [...]
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not part of collaboration
- `404 Not Found`: Session not found

Check-ins API
POST /api/checkins

Body:

{
  "collaboration_id": "uuid",
  "mood": 4,
  "progress_note": "Feeling good, hit milestone 1.",
  "blockers": "Need feedback on my case study."
}

Mentor Offers & Commerce
GET /api/mentor/offers

List offers for current mentor.

POST /api/mentor/offers

Create/update offer.

Body:

{
  "type": "paid_consult",
  "title": "1:1 PM Career Coaching - 60 min",
  "description": "...",
  "price_cents": 15000,
  "currency": "aed",
  "duration_minutes": 60
}


Organizations & Programs
POST /api/organizations

Create org (admin only via signup flow).

GET /api/organizations/[orgId]/programs

List programs.

POST /api/organizations/[orgId]/programs

Create program.

POST /api/programs/[programId]/match

Trigger AI matching for program.

AI Endpoints (Internal)

These can be called from frontend or backend, but ideally from backend to avoid exposing prompts.

POST /api/ai/goal-shaper

Shape a rough goal into structured milestones and questions.

**Request Body:**
```json
{
  "goal_text": "I want to move from marketing to product.",
  "duration_days": 60,
  "challenges": "No portfolio or PM title."
}
```

**Validation Rules:**
- `goal_text`: Required, string, 10-1000 characters
- `duration_days`: Required, integer, 30 or 60
- `challenges`: Optional, string, max 1000 characters

**Response:**
```json
{
  "data": {
    "title": "Transition from Marketing to Product Management",
    "refined_goal_statement": "...",
    "success_definition": "...",
    "milestones": [
      {
        "title": "Learn fundamentals",
        "description": "...",
        "relative_day_offset": 7
      }
    ],
    "suggested_questions_for_mentor": [
      "What skills gaps do I need to close first?",
      "How should I prioritize side projects?"
    ],
    "risks_or_pitfalls": [...]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Not authenticated
- `429 Too Many Requests`: Rate limit exceeded (AI endpoints: 20/min)
- `503 Service Unavailable`: AI service unavailable

POST /api/ai/session-planner

Generate session agenda and preparation items.

**Request Body:**
```json
{
  "goal_summary": "...",
  "milestones_json": [...],
  "previous_summaries": [...],
  "session_number": 1,
  "duration_minutes": 60
}
```

**Response:**
```json
{
  "data": {
    "session_title": "...",
    "agenda_items": [...],
    "questions_for_mentee_to_prepare": [...],
    "questions_for_mentor_to_explore": [...],
    "pre_session_homework_for_mentee": [...]
  }
}
```

POST /api/ai/summarizer

Summarize session transcript and extract action items.

**Request Body:**
```json
{
  "transcript_text": "...",
  "agenda_json": {...}
}
```

**Response:**
```json
{
  "data": {
    "summary": "...",
    "key_points": [...],
    "action_items_for_mentee": [...],
    "action_items_for_mentor": [...],
    "milestone_updates": [...]
  }
}
```

POST /api/ai/matcher

Match mentors to mentees for organization programs.

**Request Body:**
```json
{
  "mentors": [...],
  "mentees": [...]
}
```

**Response:**
```json
{
  "data": {
    "matches": [
      {
        "mentor_profile_id": "uuid",
        "mentee_profile_id": "uuid",
        "match_score": 0.85,
        "reasons": [...]
      }
    ]
  }
}
```

(See `ai-prompts.md` for detailed prompt logic)
