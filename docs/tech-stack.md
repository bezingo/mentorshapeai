# Tech Stack

## Frontend
- Next.js 15
- App Router
- React 19
- shadcn/ui
- TailwindCSS
- TanStack Query
- Zustand or Jotai (state management)
- Vercel hosting

---

## Backend
- Supabase (PostgreSQL + RLS)
- Supabase Edge Functions (scheduled tasks, async workers)
- Next.js Route Handlers (API surface)
- Supabase Auth disabled in favor of Clerk

---

## Authentication
- Clerk Authentication:
  - OAuth (Google, LinkedIn, Microsoft)
  - Email/Password
  - Multi-role support
  - Webhooks to sync to Supabase

---

## Payments
- Stripe Billing:
  - Mentee subscriptions
  - Organization billing
  - Usage limits
- Stripe Connect:
  - Mentor payouts (consultations, digital products)

---

## AI Layer
- LangChain
- LangGraph
- LangSmith (monitoring & evaluation)
- OpenAI (structured outputs)
- Anthropic Claude (long-form reasoning)
- Custom embeddings for matching

---

## Integrations
- **Firecrawl** for LinkedIn profile scraping
- **Brandfetch Logo API** for company/organization logos
- **Google Calendar API**
- **Microsoft Outlook Calendar API**
- **Zoom API** for meetings & recordings
- **Google Meet** via Calendar
- **Electron App** for desktop call recording (later)
- **React Native App** for mobile note capture (later)

---

## File Storage
- Supabase Storage:
  - Profile images
  - Meeting recordings
  - Transcripts
  - Digital product files

---

## Observability
- Sentry
- Vercel Analytics
- LangSmith traces

