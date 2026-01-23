# Tech Stack

## Framework & Runtime

| Category | Technology | Version |
|----------|------------|---------|
| Application Framework | Next.js with App Router | 16.0.7 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | Latest LTS |
| Package Manager | npm | - |
| React | React with Server Components | 19.2.0 |

## Frontend

| Category | Technology | Purpose |
|----------|------------|---------|
| JavaScript Framework | React 19 | Server Components, Client Components |
| CSS Framework | Tailwind CSS 4 | Utility-first styling |
| UI Components | shadcn/ui (Radix UI primitives) | Accessible component library |
| State Management | Zustand | Lightweight global state |
| Data Fetching | TanStack Query (React Query) | Server state management, caching |
| Icons | Lucide React | Icon library |
| Date Handling | date-fns, date-fns-tz | Date manipulation, timezone support |
| Animation | tw-animate-css | Tailwind animation utilities |
| Utility Libraries | clsx, tailwind-merge, class-variance-authority | Class name utilities |

## Database & Storage

| Category | Technology | Purpose |
|----------|------------|---------|
| Database | PostgreSQL via Supabase | Primary data store |
| ORM/Query Builder | Supabase JS Client | Query interface with Row Level Security (RLS) |
| File Storage | Supabase Storage | Profile images, recordings, transcripts, digital products |
| Caching | Supabase built-in + TanStack Query | Server and client-side caching |

### Key Database Tables

- **Users & Profiles:** `users`, `profiles`, `work_experiences`, `educations`, `skills`
- **Goals & Milestones:** `goals`, `goal_milestones`
- **Collaborations:** `collaborations`, `focus_sessions`, `focus_session_artifacts`, `checkins`
- **Mentor Economy:** `mentor_offers`, `mentor_badges`, `ratings`
- **Organizations:** `organizations`, `org_members`, `programs`, `program_participants`, `matches`
- **Billing:** `subscriptions`, `transactions`

## Authentication

| Category | Technology | Purpose |
|----------|------------|---------|
| Provider | Clerk | Authentication and user management |
| OAuth Providers | Google, LinkedIn, Microsoft | Social login |
| Email/Password | Clerk built-in | Traditional auth |
| Multi-role Support | Clerk | Mentee/Mentor role toggling |
| Webhook Sync | Clerk Webhooks | Sync user data to Supabase |
| Route Protection | Clerk Middleware | Server-side auth guards |

## Payments

| Category | Technology | Purpose |
|----------|------------|---------|
| Subscription Billing | Clerk Billing | Mentee subscriptions, org plans (uses Stripe under the hood) |
| Marketplace Payouts | Stripe Connect Express | Mentor consultations, digital products |
| Payment Processing | Stripe | Payment intents, refunds |
| Webhook Verification | Svix | Secure webhook signature verification |
| Platform Fee | 10-15% | Deducted from mentor transactions |

### Billing Features

- **Mentee Plans:** Free (1 goal, 1 collab) / Pro (unlimited)
- **Org Plans:** Starter (100 mentees) / Pro (500) / Enterprise (unlimited + SSO)
- **Mentor Payouts:** Daily payouts via Stripe Connect, 2-day settlement

## AI Layer

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | LangChain, LangGraph | AI agent orchestration |
| Monitoring | LangSmith | Traces, evaluation, debugging |
| LLM - Structured Outputs | OpenAI | Profile parsing, goal shaping |
| LLM - Long-form Reasoning | Anthropic Claude | Complex analysis, summaries |
| Embeddings | OpenAI / Custom | Mentor-mentee matching |

### AI Agents

| Agent | Purpose | Trigger |
|-------|---------|---------|
| Profile Builder | Parse LinkedIn/CV into structured profile | User onboarding |
| Goal Shaper | Expand goals into milestones and success criteria | Goal creation |
| Session Planner | Generate pre-session agendas | Session booked |
| Transcript Summarizer | Extract summaries, action items from recordings | Session completed |
| Progress Tracker | Score progress, identify risks, send nudges | Weekly scheduled |
| Matching Agent | Rank mentor-mentee pairs with explanations | Org program matching |
| Completion Agent | Generate final summaries, LinkedIn posts | Goal marked complete |

## Integrations

| Category | Technology | Purpose |
|----------|------------|---------|
| Profile Scraping | Firecrawl | LinkedIn profile parsing |
| Logo API | Brandfetch Logo API | Company/organization logos via CDN |
| Calendar - Google | Google Calendar API | Availability sync, event creation |
| Calendar - Microsoft | Outlook Calendar API | Availability sync, event creation |
| Video Meetings | Zoom API | Meeting creation, recordings, transcripts |
| Video Meetings (Alt) | Google Meet via Calendar | Alternative meeting option |
| Email | Resend | Transactional emails |

### Future Integrations (Planned)

- **Electron App:** Desktop call recording
- **React Native App:** Mobile note capture

## Validation & Schema

| Category | Technology | Purpose |
|----------|------------|---------|
| Runtime Validation | Zod | Schema validation, type inference |
| Form Handling | React Hook Form + Zod resolver | Form state and validation |

## Testing & Quality

| Category | Technology | Purpose |
|----------|------------|---------|
| Linting | ESLint 9 with eslint-config-next | Code quality |
| Type Checking | TypeScript strict mode (`tsc --noEmit`) | Type safety |
| Formatting | Prettier via ESLint | Code formatting |

## Deployment & Infrastructure

| Category | Technology | Purpose |
|----------|------------|---------|
| Hosting | Vercel | Application hosting, CDN |
| Edge Functions | Supabase Edge Functions | Scheduled tasks, async workers |
| API Routes | Next.js Route Handlers | API surface |
| CI/CD | Vercel Git Integration | Automatic deployments |

## Observability

| Category | Technology | Status |
|----------|------------|--------|
| Error Tracking | Sentry | Planned |
| Analytics | Vercel Analytics | Planned |
| AI Tracing | LangSmith | Active |

## Environment Variables

Required environment variables for the application:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LANGCHAIN_API_KEY=

# Integrations
FIRECRAWL_API_KEY=
BRANDFETCH_API_KEY=
BRANDFETCH_CLIENT_ID=
RESEND_API_KEY=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
```

## Development Tools

| Tool | Purpose |
|------|---------|
| shadcn CLI | Adding UI components (`npx shadcn add [component]`) |
| Stripe CLI | Testing webhooks locally (`stripe listen --forward-to`) |
| Supabase CLI | Database migrations, local development |
