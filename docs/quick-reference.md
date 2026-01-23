# Quick Reference

## API Endpoints Cheat Sheet

### Authentication
- `POST /api/webhook/clerk` - Clerk webhook handler
- `GET /api/profile/me` - Get current user profile
- `PUT /api/profile/me` - Update profile

### Goals
- `POST /api/goals` - Create goal
- `GET /api/goals` - List user's goals (query: `status`, `page`, `limit`)
- `GET /api/goals/[goalId]` - Get goal detail
- `GET /api/goals/public/[slug]` - Get public goal (no auth)

### Collaborations
- `POST /api/collaborations` - Create collaboration (mentor only)
- `POST /api/collaborations/[collabId]/accept` - Accept collaboration (mentee)
- `POST /api/collaborations/[collabId]/close` - Close collaboration
- `GET /api/collaborations` - List collaborations (query: `role`, `status`, `page`, `limit`)

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - List sessions (query: `collaboration_id`, `status`, `page`)
- `GET /api/sessions/[sessionId]` - Get session detail

### Check-ins
- `POST /api/checkins` - Create check-in

### Mentor Offers
- `GET /api/mentor/offers` - List mentor offers
- `POST /api/mentor/offers` - Create/update offer

### Organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[orgId]/programs` - List programs
- `POST /api/organizations/[orgId]/programs` - Create program
- `POST /api/programs/[programId]/match` - Trigger AI matching

### AI Endpoints
- `POST /api/ai/goal-shaper` - Shape goal into milestones
- `POST /api/ai/session-planner` - Generate session agenda
- `POST /api/ai/summarizer` - Summarize session transcript
- `POST /api/ai/matcher` - Match mentors to mentees

### Webhooks
- `POST /api/webhook/clerk` - Clerk webhooks
- `POST /api/webhook/stripe` - Stripe webhooks

---

## Common Database Queries

### Get User Profile

```sql
SELECT * FROM profiles
WHERE user_id = (
  SELECT id FROM users WHERE clerk_user_id = $1
);
```

### Get User's Goals

```sql
SELECT * FROM goals
WHERE profile_id = $1
ORDER BY created_at DESC;
```

### Get Active Collaborations

```sql
SELECT c.*, g.title as goal_title
FROM collaborations c
JOIN goals g ON c.goal_id = g.id
WHERE (c.mentor_profile_id = $1 OR c.mentee_profile_id = $1)
  AND c.status = 'active'
ORDER BY c.start_date DESC;
```

### Get Upcoming Sessions

```sql
SELECT fs.*, c.goal_id, g.title as goal_title
FROM focus_sessions fs
JOIN collaborations c ON fs.collaboration_id = c.id
JOIN goals g ON c.goal_id = g.id
WHERE (c.mentor_profile_id = $1 OR c.mentee_profile_id = $1)
  AND fs.start_time > NOW()
  AND fs.status = 'scheduled'
ORDER BY fs.start_time ASC;
```

### Get Mentor's Earnings

```sql
SELECT 
  SUM(amount_cents - platform_fee_cents) as total_earnings_cents,
  COUNT(*) as transaction_count
FROM transactions
WHERE mentor_profile_id = $1
  AND status = 'succeeded'
  AND created_at >= DATE_TRUNC('month', NOW());
```

### Get Goal Progress

```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'done') as completed_milestones,
  COUNT(*) as total_milestones,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'done')::numeric / 
    NULLIF(COUNT(*), 0) * 100
  ) as progress_percentage
FROM goal_milestones
WHERE goal_id = $1;
```

### Get Organization Members

```sql
SELECT p.*, om.role
FROM org_members om
JOIN profiles p ON om.profile_id = p.id
WHERE om.org_id = $1
ORDER BY om.role, p.display_name;
```

### Get Program Matches

```sql
SELECT m.*, 
  mp.display_name as mentor_name,
  mep.display_name as mentee_name
FROM matches m
JOIN profiles mp ON m.mentor_profile_id = mp.id
JOIN profiles mep ON m.mentee_profile_id = mep.id
WHERE m.program_id = $1
ORDER BY m.match_score DESC;
```

---

## Database Table Quick Lookup

### Core Tables

| Table | Primary Key | Key Foreign Keys | Key Fields |
|-------|-------------|------------------|------------|
| `users` | `id` | - | `clerk_user_id`, `email` |
| `profiles` | `id` | `user_id` | `public_handle`, `is_mentor`, `is_mentee` |
| `goals` | `id` | `profile_id` | `public_slug`, `status`, `duration_days` |
| `goal_milestones` | `id` | `goal_id` | `status`, `target_date` |
| `collaborations` | `id` | `goal_id`, `mentor_profile_id`, `mentee_profile_id` | `status`, `start_date`, `end_date` |
| `focus_sessions` | `id` | `collaboration_id` | `start_time`, `status`, `meeting_url` |
| `focus_session_artifacts` | `id` | `focus_session_id` | `recording_url`, `transcript_text`, `summary_ai` |
| `checkins` | `id` | `collaboration_id`, `created_by_profile_id` | `mood`, `progress_note` |

### Mentor Economy Tables

| Table | Primary Key | Key Foreign Keys | Key Fields |
|-------|-------------|------------------|------------|
| `mentor_offers` | `id` | `mentor_profile_id` | `type`, `price_cents`, `is_active` |
| `mentor_badges` | `id` | `mentor_profile_id` | `type`, `label`, `awarded_at` |
| `ratings` | `id` | `collaboration_id`, `mentor_profile_id`, `mentee_profile_id` | `score`, `feedback` |

### Organization Tables

| Table | Primary Key | Key Foreign Keys | Key Fields |
|-------|-------------|------------------|------------|
| `organizations` | `id` | - | `name`, `domain`, `billing_customer_id` |
| `org_members` | `id` | `org_id`, `profile_id` | `role` |
| `programs` | `id` | `org_id` | `name`, `start_date`, `end_date` |
| `program_participants` | `id` | `program_id`, `profile_id` | `role` |
| `matches` | `id` | `program_id`, `mentor_profile_id`, `mentee_profile_id` | `status`, `match_score` |

### Billing Tables

| Table | Primary Key | Key Foreign Keys | Key Fields |
|-------|-------------|------------------|------------|
| `subscriptions` | `id` | `user_id` or `org_id` | `stripe_subscription_id`, `plan`, `status` |
| `transactions` | `id` | `buyer_profile_id`, `mentor_profile_id`, `mentor_offer_id` | `amount_cents`, `platform_fee_cents`, `status` |

**Note:** User and organization subscriptions are managed by Clerk Billing. The `subscriptions` table may be used for tracking/reporting purposes, but Clerk handles subscription lifecycle automatically.

---

## Status Enums Reference

### Goal Status
- `draft` - Goal not yet published
- `active` - Goal is active and public
- `completed` - Goal completed successfully
- `archived` - Goal archived (not public)

### Milestone Status
- `pending` - Not started
- `in_progress` - Currently working on
- `done` - Completed

### Collaboration Status
- `pending` - Awaiting mentee acceptance
- `active` - Collaboration active
- `completed` - Collaboration completed
- `cancelled` - Collaboration cancelled

### Session Status
- `scheduled` - Session scheduled
- `completed` - Session completed
- `cancelled` - Session cancelled

### Subscription Status
- `active` - Subscription active
- `past_due` - Payment failed
- `cancelled` - Subscription cancelled
- `trialing` - In trial period

### Transaction Status
- `pending` - Payment pending
- `succeeded` - Payment successful
- `failed` - Payment failed

### Match Status
- `proposed` - Match proposed (awaiting confirmation)
- `confirmed` - Match confirmed by both parties
- `declined` - Match declined

---

## Environment Variables Quick Reference

### Required
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (for mentor payouts only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (for mentor payouts only)
- `STRIPE_WEBHOOK_SECRET` (for mentor payouts only)
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

**Note:** Clerk Billing handles user and organization subscriptions. Stripe is only needed for mentor payouts via Stripe Connect.

### Optional
- `RESEND_API_KEY`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `FIRECRAWL_API_KEY`
- `SENTRY_DSN`
- `NEXT_PUBLIC_APP_URL`

---

## Error Codes Reference

- `VALIDATION_ERROR` (400) - Input validation failed
- `NOT_FOUND` (404) - Resource not found
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `CONFLICT` (409) - Resource conflict (e.g., double-booking)
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `SERVICE_UNAVAILABLE` (503) - External service down
- `INTERNAL_ERROR` (500) - Server error

---

## Rate Limits

- **Authenticated endpoints**: 100 requests/minute per user
- **Public endpoints**: 30 requests/minute per IP
- **Webhook endpoints**: 200 requests/minute per IP
- **AI endpoints**: 20 requests/minute per user

---

## Common File Paths

### Components
- `src/components/ui/` - shadcn/ui components
- `src/components/goals/` - Goal-related components
- `src/components/mentor/` - Mentor-related components
- `src/components/org/` - Organization components

### API Routes
- `src/app/api/goals/` - Goal endpoints
- `src/app/api/collaborations/` - Collaboration endpoints
- `src/app/api/sessions/` - Session endpoints
- `src/app/api/webhook/` - Webhook handlers

### Libraries
- `src/lib/supabase/` - Supabase clients
- `src/lib/ai/` - AI agent functions
- `src/lib/stripe/` - Stripe utilities
- `src/lib/calendar/` - Calendar integrations

### Database
- `supabase/migrations/` - Database migrations
- `docs/supabase-migrations.sql` - Migration reference

---

## Useful Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Lint code
```

### Database
```bash
supabase db reset    # Reset local database
supabase db push     # Push migrations
supabase migration new <name>  # Create migration
```

### Deployment
```bash
vercel deploy        # Deploy to Vercel
vercel env pull      # Pull environment variables
```

---

## Key URLs

### Public Routes
- `/` - Landing page
- `/pricing` - Pricing page
- `/g/[slug]` - Public goal page
- `/m/[handle]` - Public mentor page

### Authenticated Routes
- `/dashboard` - Dashboard (role-aware)
- `/goals` - Goals list
- `/goals/new` - Create goal
- `/goals/[id]` - Goal detail
- `/collaborations` - Collaborations list
- `/sessions` - Sessions list
- `/settings` - Settings

### Organization Routes
- `/org` - Organization dashboard
- `/org/programs` - Programs list
- `/org/programs/[id]` - Program detail

---

## Support Resources

- **Documentation**: `/docs/README.md`
- **API Contracts**: `/docs/api-contracts.md`
- **Database Schema**: `/docs/db-schema.md`
- **Security Policies**: `/docs/security-policies.md`
- **Edge Cases**: `/docs/edge-cases.md`

