# Mentor Onboarding & Profiles - Initialization

## Spec Initialization

- **Created**: 2026-01-23
- **Status**: Shaping
- **Agent**: spec-initializer

## Scope

This spec covers Phase 2 of the Product Roadmap: "Mentor Onboarding & Profiles". It includes roadmap items 9-12:

| Item | Name | Size | Description |
|------|------|------|-------------|
| 9 | Mentor Onboarding Flow | S | Wizard for becoming a mentor including bio, expertise areas, skills, languages, timezone, years of experience, and public handle selection |
| 10 | Public Mentor Profiles | M | Linktree-style pages at `/m/[handle]` showcasing mentor info, expertise, skills, testimonials, badges, consultation offerings, digital products, and "Request Mentorship" button |
| 11 | Calendar Integration | L | Connect Google Calendar and Microsoft Outlook APIs to sync availability and automatically block busy time slots |
| 12 | Mentor Availability Management | M | Weekly availability template with day/time slots that respects calendar busy times for session booking |

## Related Documentation

- `docs/mentor-flows.md` - Mentor onboarding and profile flows
- `docs/mentee-flows.md` - Mentee perspective on mentor profiles
- `docs/db-schema.md` - Database schema for profiles and availability
- `docs/mentor-mentee-toggling.md` - Role toggling between mentee/mentor
- `docs/platform-overall-concept.md` - Overall platform vision
- `agent-os/specs/2025-12-20-user-profile-system/` - User profile system spec (prerequisite)

## Next Steps

1. **Requirements Gathering**: Document detailed requirements for each roadmap item
2. **Technical Analysis**: Analyze existing codebase for reusable components and patterns
3. **Design Decisions**: Define architecture for calendar integration and availability management
4. **Spec Writing**: Create detailed spec.md with implementation details
5. **Task Breakdown**: Create tasks.md with actionable implementation tasks

## Existing Codebase Context

The following existing components are relevant to this spec:

- `/app/m/[handle]/` - Existing public mentor profile page structure
- `/app/dashboard/profile/` - User profile management
- `/app/api/profile/` - Profile API endpoints
- `/supabase/migrations/` - Database migrations
- `/components/` - Reusable UI components

## Dependencies

### Prerequisites (Completed)
- Item 1: User Profile System ✓
- Item 2: LinkedIn Profile Import ✓

### Enables (Future)
- Item 13: Collaboration Lifecycle
- Item 14: Session Booking System
- Item 23: Paid Consultations
