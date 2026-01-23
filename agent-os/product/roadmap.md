# Product Roadmap

## Phase 1: Core Mentee Experience

Build the foundation for mentees to create profiles, set goals, and share them publicly.

1. [x] **User Profile System** — Complete profile management with avatar upload, bio, skills, work history, and education fields stored in Supabase with public/private visibility toggles `M`

2. [x] **LinkedIn Profile Import** — Integration with Firecrawl to scrape LinkedIn URLs and auto-populate profile fields using the Profile Builder AI agent `M`

3. [x] **CV Upload & Parsing** — Allow users to upload CV/resume (PDF/text) as alternative to LinkedIn, with AI parsing to extract work history, education, and skills `S`

4. [x] **Goal Creation Wizard** — Multi-step form for creating goals with name, category (Career, Startup, Fitness, Learning, Personal Growth), time horizon (30/60 days), desired outcome, blockers, and mentor expectations `S`

5. [ ] **AI Goal Shaper Agent** — LangChain agent that expands user goals into structured milestones, success criteria, weekly breakdown, and suggested mentor questions `M` *(Spec created, ready for implementation)*

6. [x] **Public Goal Pages** — Shareable goal pages at `/g/[slug]` displaying mentee info, goal details, milestones, timeline, challenges, and a "Start Collaboration" CTA for mentors `S`

## Phase 2: Mentor Onboarding & Profiles

Enable mentors to create public profiles and showcase their expertise.

7. [ ] **Mentor Onboarding Flow** — Wizard for becoming a mentor including bio, expertise areas, skills, languages, timezone, years of experience, and public handle selection at `/m/[handle]` `S`

8. [ ] **Public Mentor Profiles** — Linktree-style pages at `/m/[handle]` showcasing mentor info, expertise, skills, testimonials, badges, consultation offerings, digital products, and "Request Mentorship" button `M`

9. [ ] **Calendar Integration** — Connect Google Calendar and Microsoft Outlook APIs to sync availability and automatically block busy time slots `L`

10. [ ] **Mentor Availability Management** — Weekly availability template with day/time slots that respects calendar busy times for session booking `M`

## Phase 3: Collaboration & Sessions

Enable mentor-mentee collaboration lifecycle and structured sessions.

11. [ ] **Collaboration Lifecycle** — Complete collab flow from request to acceptance, including notifications, status tracking (pending/active/completed), and both-party approval `M`

12. [ ] **Session Booking System** — Mentees select available time slots from mentor calendar, creating calendar events and focus session records in database `M`

13. [ ] **AI Session Planner Agent** — Pre-session AI agent generating agendas with topics to cover, questions to ask, review of previous actions, and preparation suggestions based on goal and previous sessions `M`

14. [ ] **Video Meeting Integration** — Zoom API integration for creating meetings, fetching recordings, and extracting transcripts (Google Meet as alternative via Calendar) `L`

15. [ ] **AI Transcript Summarizer Agent** — Post-session agent that processes transcripts to generate summaries, key decisions, action items for mentee & mentor, and milestone status updates `M`

16. [ ] **Milestone Progress Tracking** — Visual dashboard showing milestone completion, session timeline, action items, blockers, and weekly check-ins (mood, progress notes) for mentees `M`

17. [ ] **AI Progress Tracker Agent** — Weekly agent that scores progress (0-100), identifies stalled areas, predicts completion risk, and sends nudges to mentee/mentor `M`

18. [ ] **Goal Completion Flow** — Mark goal complete, trigger AI Completion Agent for final summary, award mentor badge, generate shareable LinkedIn achievement post, allow mentee reflection `S`

## Phase 4: Monetization

Enable mentors to earn through consultations and digital products.

19. [ ] **Clerk Billing Integration** — Mentee subscription plans (Free/Pro) using Clerk Billing with `<PricingTable />` component, automatic subscription sync, and `has({ plan: 'pro' })` feature gating `L`

20. [ ] **Mentor Stripe Connect Onboarding** — Onboard mentors to Stripe Express accounts for receiving payouts, with `charges_enabled` and `payouts_enabled` verification via webhooks `M`

21. [ ] **Paid Consultations** — Mentors define consultation packages (type, title, description, price, duration, topic) with Stripe Payment Intents, 10-15% platform fee, and automatic session confirmation `M`

22. [ ] **Digital Products Marketplace** — Mentors upload and sell guides, templates, PDFs, courses with Supabase Storage and Stripe payment processing, RLS-protected download access `L`

23. [ ] **Mentor Ratings & Reviews** — End-of-collaboration rating system where mentees rate mentors, with feedback stored and displayed on mentor profiles `S`

## Phase 5: Organization Features

Enable universities, companies, and institutions to run structured mentorship programs.

24. [ ] **Organization Onboarding** — Org admin signup, organization creation with name, type (school/university/company), logo, domain, and billing setup `S`

25. [ ] **Program Management** — Create mentorship programs with name, description, start/end dates, mentor-to-mentee ratio, goal templates, max mentees per mentor, and optional structured tracks `M`

26. [ ] **Bulk Participant Import** — CSV upload, manual entry, and domain-based auto-enroll for adding mentors/mentees to programs with per-program role assignment `S`

27. [ ] **AI Matching Agent** — Organization-level matching using embeddings of mentor/mentee profiles (skills, interests, goals, alumni data) to generate ranked matches with scores and explanations `L`

28. [ ] **Organization Dashboards** — Admin dashboards showing active collaborations, session counts, goal completion rates, mentor performance, mentee progress, drop-off rates, and engagement timeline `M`

29. [ ] **Organization Billing** — Clerk Billing for org plans (Starter: 100 mentees, Pro: 500 mentees, Enterprise: unlimited) with add-ons like custom domain, SSO, and enhanced reporting `M`

## Phase 6: Notifications & Polish

Complete the user experience with notifications and mobile responsiveness.

30. [ ] **Email Notifications** — Resend integration for transactional emails: collab requests, session reminders, agenda delivery, summary delivery, progress updates, goal completions, and payout confirmations `M`

31. [ ] **In-App Notifications** — Real-time notification system for collaboration events, session updates, action item reminders, and check-in prompts `S`

32. [ ] **Mobile-Responsive Polish** — Ensure all core flows (goal creation, session booking, mentor profiles, dashboards) work seamlessly on mobile devices `M`

---

## Size Legend

- `XS` — A few hours of work
- `S` — Less than a day
- `M` — 1-3 days
- `L` — 3-5 days
- `XL` — More than a week

## Dependency Notes

- **Phase 1 (Items 1-6):** Unlocks core mentee experience — profiles, goals, public pages
- **Phase 2 (Items 7-10):** Unlocks mentor experience — profiles, availability, calendar
- **Phase 3 (Items 11-18):** Enables collaboration — requires Phase 1 & 2 complete
- **Phase 4 (Items 19-23):** Enables monetization — requires Phase 2 & 3 for context
- **Phase 5 (Items 24-29):** Organization features — can be built in parallel with Phase 4
- **Phase 6 (Items 30-32):** Polish layer — can be incrementally added throughout

## AI Agent Dependencies

The following AI agents are required for specific roadmap items:

| Agent | Required For | Inputs | Outputs |
|-------|-------------|--------|---------|
| Profile Builder | Item 2, 3 | LinkedIn URL, CV text | Structured JSON profile |
| Goal Shaper | Item 5 | User goal, challenges, time horizon | Milestones, success criteria, weekly breakdown |
| Session Planner | Item 13 | Goal summary, milestones, previous sessions | Agenda, questions, prep suggestions |
| Transcript Summarizer | Item 15 | Meeting transcript, agenda | Summary, action items, milestone updates |
| Progress Tracker | Item 17 | Milestones, sessions, check-ins | Progress score, risk predictions, nudges |
| Matching Agent | Item 27 | Mentor/mentee embeddings, skills, goals | Ranked matches with explanations |
| Completion Agent | Item 18 | All sessions, goal data | Final summary, LinkedIn post |
