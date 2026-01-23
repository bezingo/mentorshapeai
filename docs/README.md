# Mentorshape Docs – How To Read This Folder

Welcome to the **Mentorshape** docs.  
This folder is your single source of truth for what the product is, how it works, and how to build it.

Think of this as the **map** for the rest of the markdown files.

---

## 🔁 Recommended Reading Order

If you’re new to Mentorshape or onboarding someone, this is the order to go through:

1. **High-level concept**
   - [`platform-overall-concept.md`](./platform-overall-concept.md)

2. **User journeys**
   - [`mentee-flows.md`](./mentee-flows.md)
   - [`mentor-flows.md`](./mentor-flows.md)
   - [`mentor-mentee-toggling.md`](./mentor-mentee-toggling.md)
   - [`organization-flows.md`](./organization-flows.md)

3. **Business layer**
   - [`revenue-model.md`](./revenue-model.md)

4. **System design**
   - [`tech-stack.md`](./tech-stack.md)
   - [`project-structure.md`](./project-structure.md)

5. **Data & backend**
   - [`db-schema.md`](./db-schema.md)
   - [`erd-diagram.md`](./erd-diagram.md)
   - [`supabase-migrations.sql`](./supabase-migrations.sql)

6. **API & AI layer**
   - [`api-contracts.md`](./api-contracts.md)
   - [`ai-agents.md`](./ai-agents.md)
   - [`ai-prompts.md`](./ai-prompts.md)
   - [`goal-advisor-setup.md`](./goal-advisor-setup.md) - Setup guide for conversational Goal Advisor

7. **Security & Operations**
   - [`security-policies.md`](./security-policies.md)
   - [`edge-cases.md`](./edge-cases.md)
   - [`notifications.md`](./notifications.md)
   - [`payments.md`](./payments.md)
   - [`testing-strategy.md`](./testing-strategy.md)
   - [`deployment.md`](./deployment.md)

8. **Quick Reference**
   - [`quick-reference.md`](./quick-reference.md)

You don't have to read everything in one go, but this order tells a clean story:  
**why the product exists → how users use it → how it makes money → how it's built → how the AI works → how to secure and deploy it.**

---

## 🧭 File-by-File Guide

### 1. Product & Concept

#### `platform-overall-concept.md`
- What Mentorshape is
- The vision and positioning
- Core modules (Mentee Suite, Mentor Suite, Org Suite, AI layer)
- Good starting point for *anyone* joining the project

---

### 2. User Flows

#### `mentee-flows.md`
- End-to-end mentee experience:
  - onboarding, profile creation (LinkedIn/CV)
  - creating goals, sharing links
  - booking sessions, tracking progress, completing goals
- Useful for: product, UX, frontend devs

#### `mentor-flows.md`
- End-to-end mentor experience:
  - becoming a mentor
  - public mentor page
  - setting availability, running collabs
  - paid consults & digital products
- Useful for: product, UX, frontend, payments

#### `mentor-mentee-toggling.md`
- How a single user can be both mentor and mentee
- Role toggling (UX + DB model)
- Useful for: anyone working on dashboard / navigation / auth

#### `organization-flows.md`
- How universities/companies use Mentorshape:
  - org onboarding
  - program creation
  - AI matching
  - progress dashboards
- Useful for: B2B flows, org dashboards, sales/BD

---

### 3. Business & Pricing

#### `revenue-model.md`
- How Mentorshape makes money:
  - mentee subscriptions
  - org plans
  - mentor monetization & platform fee
- Useful for: founders, growth, pricing decisions

---

### 4. Tech & Architecture

#### `tech-stack.md`
- High-level stack:
  - Next.js, Supabase, Clerk, Stripe
  - Calendars, Zoom/Meet, Firecrawl
  - LangChain / LangGraph / LangSmith
- Good “architecture snapshot” for engineers

#### `project-structure.md`
- Suggested Next.js folder structure
- Where pages, APIs, libs, and AI code live
- Good starting point when you open the repo for the first time

---

### 5. Data Model & Backend

#### `db-schema.md`
- Human-readable database design:
  - users/profiles
  - goals/collabs/sessions
  - orgs/programs/matches
  - subscriptions/transactions
- Read this before touching Supabase or writing queries

#### `erd-diagram.md`
- Mermaid diagram of the DB relationships
- Great for visual thinkers & quick onboarding

#### `supabase-migrations.sql`
- Actual SQL to create core tables, enums, and indices
- This is what should be reflected in Supabase
- Treat this as the **source of truth** for DB structure

---

### 6. APIs & AI Layer

#### `api-contracts.md`
- REST-ish contracts for Next.js route handlers:
  - goals
  - collaborations
  - sessions
  - organizations
  - programs
  - AI endpoints
- Useful when:
  - Implementing frontend calls
  - Wiring up backend handlers
  - Checking request/response shapes

#### `ai-agents.md`
- List of all AI agents:
  - Profile Builder, Goal Shaper, Session Planner
  - Transcript Summarizer, Progress Tracker
  - Matching Agent, Completion Agent, etc.
- Describes what each agent does & when it runs

#### `ai-prompts.md`
- Concrete prompt templates (system + user) for each agent
- Use these in LangChain/LangGraph
- This is the "prompt library" for Mentorshape

---

### 7. Security & Operations

#### `security-policies.md`
- Row Level Security (RLS) policies for all tables
- Authentication flow (Clerk → Supabase sync)
- API authorization rules
- Webhook security
- Rate limiting strategy
- Essential for backend developers and security audits

#### `edge-cases.md`
- Collaboration lifecycle edge cases
- Payment failure scenarios
- Calendar integration conflicts
- AI agent failure handling
- Error response formats
- Critical for robust error handling

#### `notifications.md`
- Email notification triggers and templates
- In-app notification system
- Notification preferences
- Background job scheduling
- Useful for implementing user communication

#### `payments.md`
- Stripe Billing (subscriptions)
- Stripe Connect (mentor payouts)
- Webhook event handling
- Refund policies
- Payout schedules
- Essential for payment integration

#### `testing-strategy.md`
- Unit testing approach
- Integration testing
- E2E testing with Playwright
- AI agent testing strategies
- Test coverage goals
- Useful for maintaining code quality

#### `deployment.md`
- Environment variables reference
- Database migration process
- Vercel deployment checklist
- CI/CD pipeline setup
- Monitoring and observability
- Essential for deploying to production

---

### 8. Quick Reference

#### `quick-reference.md`
- API endpoints cheat sheet
- Common database queries
- Database table quick lookup
- Status enums reference
- Environment variables list
- Error codes reference
- Useful commands and file paths
- Great for daily development work

---

## 👥 Suggested Reading by Role

### Product / Founder
1. `platform-overall-concept.md`  
2. `mentee-flows.md`, `mentor-flows.md`, `organization-flows.md`  
3. `revenue-model.md`

### UX / Design
1. `platform-overall-concept.md`  
2. `mentee-flows.md`, `mentor-flows.md`, `mentor-mentee-toggling.md`  
3. `organization-flows.md`

### Backend / Systems
1. `tech-stack.md`  
2. `db-schema.md` + `erd-diagram.md`  
3. `supabase-migrations.sql`  
4. `api-contracts.md`  
5. `ai-agents.md` + `ai-prompts.md`
6. `security-policies.md`
7. `edge-cases.md`
8. `payments.md`
9. `testing-strategy.md`
10. `deployment.md`

### AI / ML
1. `platform-overall-concept.md` (for context)  
2. `ai-agents.md`  
3. `ai-prompts.md`  
4. `db-schema.md` (for what you can use as context)  

---

## ✅ How to Keep This Folder Healthy

- When you add a new feature:
  - Update the relevant `*-flows.md` and `db-schema.md` / `api-contracts.md`.
- When schema changes:
  - Update both `db-schema.md` and `supabase-migrations.sql`.
- When AI logic changes:
  - Update `ai-agents.md` (what it does) **and** `ai-prompts.md` (how it talks).
- When security changes:
  - Update `security-policies.md` (RLS policies, auth flows).
- When adding error handling:
  - Update `edge-cases.md` with new scenarios.
- When payment logic changes:
  - Update `payments.md` with new flows or webhooks.
- When deployment process changes:
  - Update `deployment.md` with new steps or variables.

This folder should always answer three questions for anyone new:

1. **What is Mentorshape?**  
2. **How does it work for users?**  
3. **How do we implement + extend it?**

