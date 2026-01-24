# Mentor Onboarding & Profiles - Raw Idea

## Feature Description

Enable mentors to create public profiles and showcase their expertise through a comprehensive onboarding flow, public profile pages, calendar integration, and availability management.

## Roadmap Context

- **Phase**: Phase 2: Mentor Onboarding & Profiles
- **Item Numbers**: 9, 10, 11, 12
- **Priority**: First features in Phase 2 - foundational for mentor experience

## Included Roadmap Items

### Item 9: Mentor Onboarding Flow (Size: S)

Wizard for becoming a mentor including:
- Bio
- Expertise areas
- Skills
- Languages
- Timezone
- Years of experience
- Public handle selection at `/m/[handle]`

### Item 10: Public Mentor Profiles (Size: M)

Linktree-style pages at `/m/[handle]` showcasing:
- Mentor info
- Expertise
- Skills
- Testimonials
- Badges
- Consultation offerings
- Digital products
- "Request Mentorship" button

### Item 11: Calendar Integration (Size: L)

Connect calendar APIs to sync availability:
- Google Calendar API integration
- Microsoft Outlook API integration
- Automatically block busy time slots
- Real-time calendar sync

### Item 12: Mentor Availability Management (Size: M)

Weekly availability template:
- Day/time slot configuration
- Respect calendar busy times
- Enable session booking against available slots

## Initial Notes

This spec covers the complete mentor onboarding and profile experience. It builds upon the existing user profile system (Phase 1) and unlocks the collaboration features in Phase 3.

Key dependencies:
- Requires completed user profile system (Item 1)
- Enables collaboration lifecycle (Item 13)
- Enables session booking (Item 14)

The public mentor profiles at `/m/[handle]` will serve as the mentor's landing page for attracting mentees and showcasing their expertise, similar to Linktree for link aggregation.

Calendar integration is the most complex component (Size: L) as it requires OAuth flows for both Google and Microsoft, webhook handling for real-time updates, and conflict resolution between multiple calendar sources.
