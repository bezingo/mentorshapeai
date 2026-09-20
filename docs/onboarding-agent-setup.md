# Onboarding agent setup (production)

Mentorshape’s post-auth experience is the **Journey** chat at `/journey`, powered by [HeroUI Agents](https://heroui.pro/agents) and client tools in `lib/agent/journey-agent-tools.ts`.

## Vercel environment variables

Set these in the Vercel project (names only — values from HeroUI Agents dashboard and Clerk):

| Variable | Scope |
|----------|--------|
| `HEROUI_AGENT_API_KEY` | Server |
| `HEROUI_AGENT_ID` | Server |
| `NEXT_PUBLIC_HEROUI_AGENT_ID` | Public |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public |
| `CLERK_SECRET_KEY` | Server |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | Public (`/journey`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | Public (`/journey`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Public |
| `SUPABASE_SECRET_KEY` | Server |
| `OPENAI_API_KEY` | Server (goal advisor / AI routes used during journey) |
| `NEXT_PUBLIC_APP_URL` | Public |

Optional for full journey APIs (matching, outreach, reminders use existing app data):

| Variable | Scope |
|----------|--------|
| `CRON_SECRET` | Server (focus summary jobs; not required for chat onboarding) |
| `STRIPE_SECRET_KEY` | Server (payments; not required for chat onboarding) |

See `.env.local.example` for the full local template.

## HeroUI Agents dashboard

1. Sign in at [heroui.pro/agents](https://heroui.pro/agents).
2. **Create agent** (or open the production agent).
3. Copy **Agent ID** → set `HEROUI_AGENT_ID` and `NEXT_PUBLIC_HEROUI_AGENT_ID` to the same value.
4. Copy **API key** → `HEROUI_AGENT_API_KEY`.
5. **System prompt** — paste the contents of `lib/journey/onboarding-system-prompt.ts` (`MENTORSHAPE_ONBOARDING_SYSTEM_PROMPT`) into Settings → System prompt.
6. **Client tools** — register each tool below with the same name and a short description matching the code (parameters are enforced client-side via Zod in `createJourneyAgentTools`).
7. Enable **remote config** if you want dashboard prompt updates without redeploying (the app uses `remoteConfig={true}` on `HeroUIAgent`).
8. Deploy; visit `/journey` signed in. The auth token route is `POST /api/heroui-agent/auth-token`.

## Client tool registration list

Register these tools in the Agents dashboard (must match `JOURNEY_AGENT_TOOL_NAMES` in code):

| Tool name | Purpose |
|-----------|---------|
| `saveGoalDraft` | Save a simple goal draft |
| `createGoalArtifact` | Year plan + hierarchy for remainder of year |
| `lockGoal` | Lock goal plan |
| `openVisionBoard` | Open vision board in sidebar |
| `getYearPlanRemaining` | Calendar context (months/quarters/days left) |
| `navigateToArtifact` | Navigate to goals, vision board, profile, or matching |
| `getMatchingSuggestions` | Ranked mentor matches |
| `draftOutreach` | LinkedIn/email drafts (never auto-sent) |
| `publishOneLinkProfile` | Publish `/m/[handle]` profile |
| `getUpcomingFocuses` | Upcoming focuses and reminder copy |

## Supabase migrations

Onboarding journey data depends on migrations **020–024** in `supabase/migrations/` (collaboration statuses, goal advisor bucket, focus summary jobs, Stripe/payments columns, goal hierarchy + `vision_boards`). Apply via Supabase CLI or dashboard before production traffic.

## Verification checklist

- [ ] Signed-in user lands on `/journey` (middleware redirects `/` → `/journey`).
- [ ] Agent panel opens; tools execute without console errors.
- [ ] Sidebar shows goals hierarchy, vision board, and mentor matches after tool calls.
- [ ] `GET /api/reminders/upcoming` drives the banner when focuses or pending collabs exist.
- [ ] System prompt in dashboard matches `lib/journey/onboarding-system-prompt.ts`.
