# Mentorshape – Project Structure (Next.js 15 + Supabase + Clerk)

This is a suggested structure for the Mentorshape monorepo (single app) using Next.js App Router.

```bash
mentorshape/
├─ .env
├─ .env.local
├─ package.json
├─ next.config.mjs
├─ tsconfig.json
├─ postcss.config.cjs
├─ tailwind.config.cjs
├─ drizzle.config.ts (if using Drizzle for types)
├─ supabase/
│  ├─ migrations/
│  │  ├─ 001_initial.sql
│  │  └─ ...future migrations...
│  └─ seed/
│     └─ seed.sql
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx                # Landing page
│  │  │  └─ pricing/page.tsx
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx              # Authenticated layout (Clerk + sidebar)
│  │  │  ├─ page.tsx                # Overview (role-aware)
│  │  │  ├─ mentee/
│  │  │  │  ├─ page.tsx             # Mentee dashboard
│  │  │  │  ├─ goals/
│  │  │  │  │  ├─ page.tsx          # List goals
│  │  │  │  │  ├─ new/page.tsx      # Goal creation wizard
│  │  │  │  │  └─ [goalId]/page.tsx # Goal detail (internal)
│  │  │  ├─ mentor/
│  │  │  │  ├─ page.tsx             # Mentor dashboard
│  │  │  │  ├─ availability/page.tsx
│  │  │  │  ├─ offers/page.tsx
│  │  │  │  └─ collabs/[collabId]/page.tsx
│  │  │  ├─ org/
│  │  │  │  ├─ page.tsx             # Org overview
│  │  │  │  ├─ programs/
│  │  │  │  │  ├─ page.tsx          # List programs
│  │  │  │  │  └─ [programId]/page.tsx
│  │  │  └─ settings/
│  │  │     └─ page.tsx
│  │  ├─ g/
│  │  │  └─ [slug]/page.tsx         # Public goal page
│  │  ├─ m/
│  │  │  └─ [handle]/page.tsx       # Public mentor page
│  │  ├─ api/
│  │  │  ├─ webhook/
│  │  │  │  ├─ clerk/route.ts       # Clerk webhooks
│  │  │  │  ├─ stripe/route.ts      # Stripe webhooks
│  │  │  │  └─ ai/route.ts          # Optional signed AI webhooks
│  │  │  ├─ goals/route.ts          # POST/GET for goals
│  │  │  ├─ collaborations/route.ts
│  │  │  ├─ sessions/route.ts
│  │  │  ├─ organizations/route.ts
│  │  │  ├─ programs/route.ts
│  │  │  └─ ai/
│  │  │     ├─ goal-shaper/route.ts
│  │  │     ├─ session-planner/route.ts
│  │  │     └─ summarizer/route.ts
│  ├─ components/
│  │  ├─ ui/                         # shadcn components
│  │  ├─ layout/                     # shell, navbar, sidebar
│  │  ├─ forms/                      # form builders
│  │  ├─ profile/
│  │  ├─ goals/
│  │  ├─ mentor/
│  │  ├─ org/
│  │  └─ shared/
│  ├─ lib/
│  │  ├─ supabase-client.ts          # browser client
│  │  ├─ supabase-server.ts          # server-side client
│  │  ├─ clerk.ts                    # Clerk helpers
│  │  ├─ stripe.ts                   # Stripe SDK init
│  │  ├─ calendar/
│  │  │  ├─ google.ts
│  │  │  └─ microsoft.ts
│  │  ├─ zoom.ts
│  │  ├─ firecrawl.ts
│  │  ├─ ai/
│  │  │  ├─ client.ts                # LangChain client + config
│  │  │  ├─ profile-builder.ts
│  │  │  ├─ goal-shaper.ts
│  │  │  ├─ session-planner.ts
│  │  │  ├─ summarizer.ts
│  │  │  └─ matcher.ts
│  │  └─ utils.ts
│  ├─ styles/
│  │  └─ globals.css
│  └─ middleware.ts                  # Clerk / auth middleware
└─ README.md


Notes:

For complex business logic (matching, AI flows, recording hooks), consider src/services/* folders to keep lib/ lean.

Use feature-based folders for components to keep things scalable.