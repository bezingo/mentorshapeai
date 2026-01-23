# Security Policies & Access Control

## Overview

Mentorshape uses a multi-layered security approach combining Clerk authentication, Supabase Row Level Security (RLS), and API-level authorization checks.

---

## Authentication Flow

### Clerk → Supabase Sync

**Architecture:**
- Users authenticate via Clerk (OAuth, email/password)
- Clerk webhooks sync user data to Supabase `users` table
- JWT tokens from Clerk contain `clerk_user_id` claim
- Server-side code maps `clerk_user_id` to Supabase `user_id` for RLS

**Webhook Flow:**
1. User signs up/logs in via Clerk
2. Clerk sends webhook to `/api/webhook/clerk`
3. Webhook handler verifies signature using `CLERK_WEBHOOK_SECRET`
4. Creates/updates `users` row with `clerk_user_id`
5. Creates/updates `profiles` row (if new user)

**Security Measures:**
- Webhook signature verification (HMAC SHA256)
- Idempotency handling (prevent duplicate user creation)
- Rate limiting on webhook endpoint
- Error logging without exposing sensitive data

---

## Row Level Security (RLS) Policies

### General Principles

- All tables have RLS enabled
- Policies use helper functions to get current user's profile_id
- Public data (goal pages, mentor pages) uses separate policies
- Organization data respects org membership

### Helper Function

```sql
-- Get current user's profile_id from Clerk JWT
create or replace function auth.get_profile_id()
returns uuid as $$
  select id from public.profiles
  where user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  );
$$ language sql stable;
```

### Table-Specific Policies

#### `users` Table

```sql
-- Users can only read their own user record
create policy "Users can view own record"
  on public.users for select
  using (
    clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  );

-- Service role can insert/update (via webhook)
create policy "Service role can manage users"
  on public.users for all
  using (auth.role() = 'service_role');
```

#### `profiles` Table

```sql
-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  ));

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  ));

-- Public profiles are viewable by anyone (for mentor pages)
create policy "Public profiles are viewable"
  on public.profiles for select
  using (public_handle is not null);
```

#### `goals` Table

```sql
-- Mentees can view their own goals
create policy "Mentees can view own goals"
  on public.goals for select
  using (profile_id = auth.get_profile_id());

-- Mentees can create/update their own goals
create policy "Mentees can manage own goals"
  on public.goals for all
  using (profile_id = auth.get_profile_id());

-- Public goals are viewable by anyone (via public_slug)
create policy "Public goals are viewable"
  on public.goals for select
  using (public_slug is not null and status = 'active');
```

#### `collaborations` Table

```sql
-- Users can view collaborations where they are mentor or mentee
create policy "Users can view own collaborations"
  on public.collaborations for select
  using (
    mentor_profile_id = auth.get_profile_id() or
    mentee_profile_id = auth.get_profile_id()
  );

-- Mentors can create collaborations
create policy "Mentors can create collaborations"
  on public.collaborations for insert
  with check (
    mentor_profile_id = auth.get_profile_id() and
    exists (
      select 1 from public.profiles
      where id = auth.get_profile_id() and is_mentor = true
    )
  );

-- Mentees can accept collaborations
create policy "Mentees can accept collaborations"
  on public.collaborations for update
  using (
    mentee_profile_id = auth.get_profile_id() and
    status = 'pending'
  )
  with check (status = 'active');

-- Either party can close collaboration
create policy "Parties can close collaboration"
  on public.collaborations for update
  using (
    mentor_profile_id = auth.get_profile_id() or
    mentee_profile_id = auth.get_profile_id()
  )
  with check (status = 'completed' or status = 'cancelled');
```

#### `focus_sessions` Table

```sql
-- Users can view sessions in their collaborations
create policy "Users can view own sessions"
  on public.focus_sessions for select
  using (
    exists (
      select 1 from public.collaborations
      where id = collaboration_id and (
        mentor_profile_id = auth.get_profile_id() or
        mentee_profile_id = auth.get_profile_id()
      )
    )
  );

-- Mentees can create sessions
create policy "Mentees can create sessions"
  on public.focus_sessions for insert
  with check (
    exists (
      select 1 from public.collaborations
      where id = collaboration_id and
      mentee_profile_id = auth.get_profile_id() and
      status = 'active'
    )
  );
```

#### `organizations` Table

```sql
-- Org members can view their organization
create policy "Org members can view org"
  on public.organizations for select
  using (
    exists (
      select 1 from public.org_members
      where org_id = organizations.id and
      profile_id = auth.get_profile_id()
    )
  );

-- Org admins can update organization
create policy "Org admins can update org"
  on public.organizations for update
  using (
    exists (
      select 1 from public.org_members
      where org_id = organizations.id and
      profile_id = auth.get_profile_id() and
      role = 'admin'
    )
  );
```

#### `org_members` Table

```sql
-- Org members can view members of their org
create policy "Org members can view members"
  on public.org_members for select
  using (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id and
      om2.profile_id = auth.get_profile_id()
    )
  );

-- Only admins can manage members
create policy "Admins can manage members"
  on public.org_members for all
  using (
    exists (
      select 1 from public.org_members
      where org_id = org_members.org_id and
      profile_id = auth.get_profile_id() and
      role = 'admin'
    )
  );
```

#### `transactions` Table

```sql
-- Buyers can view their transactions
create policy "Buyers can view transactions"
  on public.transactions for select
  using (buyer_profile_id = auth.get_profile_id());

-- Mentors can view transactions for their offers
create policy "Mentors can view offer transactions"
  on public.transactions for select
  using (mentor_profile_id = auth.get_profile_id());
```

---

## API Authorization Rules

### Profile Endpoints

- `GET /api/profile/me`: Requires authentication, returns own profile
- `PUT /api/profile/me`: Requires authentication, can only update own profile
- `GET /api/profile/[handle]`: Public endpoint, no auth required

### Goals Endpoints

- `POST /api/goals`: Requires authentication, creates goal for current user
- `GET /api/goals`: Requires authentication, returns own goals only
- `GET /api/goals/[goalId]`: Requires authentication, returns if user is owner or collaborator
- `GET /api/goals/public/[slug]`: Public endpoint, no auth required

### Collaboration Endpoints

- `POST /api/collaborations`: Requires authentication + `is_mentor = true`
- `POST /api/collaborations/[collabId]/accept`: Requires authentication, only mentee can accept
- `POST /api/collaborations/[collabId]/close`: Requires authentication, either party can close
- `GET /api/collaborations`: Requires authentication, filters by role

### Session Endpoints

- `POST /api/sessions`: Requires authentication, validates collaboration membership
- `GET /api/sessions`: Requires authentication, filters by collaboration membership

### Organization Endpoints

- `POST /api/organizations`: Requires authentication, creates org and makes user admin
- `GET /api/organizations/[orgId]/programs`: Requires org membership
- `POST /api/organizations/[orgId]/programs`: Requires org admin role

---

## Webhook Security

### Clerk Webhooks

**Signature Verification:**
```typescript
import { Webhook } from 'svix';

const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
const payload = webhook.verify(req.body, headers);
```

**Security Measures:**
- Verify webhook signature on every request
- Check webhook timestamp (prevent replay attacks)
- Idempotency keys for user creation
- Rate limiting (max 100 requests/minute per IP)

### Stripe Webhooks

**Signature Verification:**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**Security Measures:**
- Verify webhook signature
- Check event idempotency (prevent duplicate processing)
- Validate event types before processing
- Rate limiting on webhook endpoint

---

## Rate Limiting

### API Rate Limits

- **Authenticated endpoints**: 100 requests/minute per user
- **Public endpoints**: 30 requests/minute per IP
- **Webhook endpoints**: 200 requests/minute per IP
- **AI endpoints**: 20 requests/minute per user (to control costs)

### Implementation

Use middleware or API gateway:
- Vercel Edge Config for rate limiting
- Or Redis-based rate limiting in Next.js middleware
- Return `429 Too Many Requests` with `Retry-After` header

---

## Data Privacy

### User Data Handling

- **Profile Data**: Users control visibility via `is_public` flags
- **Goal Data**: Public only if `public_slug` is set and `status = 'active'`
- **Session Data**: Private to collaboration participants only
- **Organization Data**: Private to org members only

### GDPR Compliance

- **Right to Access**: Users can export their data via API
- **Right to Deletion**: 
  - Soft delete: Set `deleted_at` timestamp
  - Hard delete: Cascade via FK constraints (after 30-day grace period)
- **Data Retention**: 
  - Active data: Indefinite
  - Completed goals: 2 years
  - Archived goals: 1 year after archiving
  - Deleted accounts: 30 days before hard delete

### Data Encryption

- **At Rest**: Supabase encrypts all data
- **In Transit**: TLS 1.3 for all connections
- **Sensitive Fields**: 
  - Payment data: Never stored (Stripe handles)
  - Passwords: Never stored (Clerk handles)
  - API keys: Encrypted in environment variables

---

## Security Best Practices

### Environment Variables

- Never commit `.env` files
- Use `.env.local.example` for documentation
- Rotate secrets regularly
- Use different secrets for dev/staging/production

### API Security

- Always validate input with Zod schemas
- Sanitize user input before database queries
- Use parameterized queries (Supabase handles this)
- Return generic error messages (don't leak system details)

### File Uploads

- Validate file types (whitelist approach)
- Limit file sizes (CV: 5MB, recordings: 500MB)
- Scan uploads for malware (optional: VirusTotal API)
- Store in Supabase Storage with RLS policies

### Session Security

- Clerk handles session management
- JWT tokens expire after 7 days
- Refresh tokens expire after 30 days
- Logout invalidates all sessions

---

## Monitoring & Incident Response

### Security Monitoring

- Log all authentication failures
- Monitor for suspicious patterns (brute force, etc.)
- Track webhook failures
- Alert on unusual API usage

### Incident Response

1. **Detect**: Automated alerts + manual review
2. **Contain**: Disable affected accounts/endpoints
3. **Investigate**: Review logs, identify root cause
4. **Remediate**: Fix vulnerability, rotate secrets
5. **Notify**: Inform affected users if data breach

---

## Testing Security

### Security Testing Checklist

- [ ] RLS policies tested for each table
- [ ] API authorization tested for each endpoint
- [ ] Webhook signature verification tested
- [ ] Rate limiting tested
- [ ] Input validation tested (SQL injection, XSS)
- [ ] File upload validation tested
- [ ] Authentication flow tested
- [ ] Error messages don't leak sensitive info

