# Specification: User Profile System

## Goal

Build a comprehensive user profile management system with LinkedIn-style multi-section editing, enabling users to view and edit their personal information, work history, education, skills, and visibility settings, with support for mentor-specific fields, profile completion tracking, and a public-facing mentor profile page.

## User Stories

- As a user, I want to edit my profile in distinct sections (avatar, personal info, bio, work history, education, skills) so that I can maintain an accurate and professional representation of myself on the platform.
- As a mentor, I want to configure mentor-specific fields (expertise, languages, timezone, years of experience) and have a public profile page at `/m/[handle]` so that potential mentees can discover and learn about me.

## Specific Requirements

**Profile Edit Page Layout**
- Three-column responsive layout: navigation sidebar (left), main content area (center), progress sidebar (right)
- Navigation sidebar shows profile sections and settings links with active state highlighting
- Main content area displays sections in "view mode" by default with Edit buttons
- Each section transitions to "edit mode" when Edit is clicked, showing form fields with Save/Cancel actions
- Mobile-first responsive design: sidebar collapses to hamburger menu, progress moves below content

**Avatar Upload**
- Circular avatar display at top of profile form with placeholder for empty state
- Client-side image cropping using a crop modal (400x400px square output)
- Accept JPG and PNG formats only with client-side MIME validation
- Maximum file size 5MB with client-side validation before upload
- Upload to Supabase Storage bucket `avatars` with path `{profile_id}/avatar.{ext}`
- Generate signed URL for display and store in `profiles.avatar_url`
- Show upload progress indicator and error states with user-friendly messages

**Personal Information Section**
- Fields: First Name, Last Name (combined as display_name), Headline, Phone
- Email displayed as read-only (synced from Clerk authentication)
- Phone number with international format validation
- Date of Birth: Date picker with month/day/year selection, stored as `profiles.date_of_birth` (date type), used for AI matching (age-based mentor pairing), not displayed publicly
- Gender: Dropdown with options (Male, Female, Non-binary, Prefer not to say), stored as `profiles.gender` (text), used for AI matching preferences, not displayed publicly
- Nationality: Searchable dropdown from countries list, stored as `profiles.nationality` (text), used for cultural matching in AI
- All fields stored in `profiles` table with Zod validation schemas

**Location Section**
- Country: Searchable dropdown from countries list, stored as `profiles.country` (text)
- City: Searchable dropdown/combobox (filtered by selected country if possible), stored as `profiles.city` (text)
- Location displayed on public profile as "City, Country" format
- Used for timezone inference and geographic matching in AI

**Traits Section**
This section contains multiple tag-based fields used for AI matching and public profile display:

*Languages Spoken*
- Multi-select tag input for languages user speaks (e.g., "English", "Arabic")
- Stored as `text[]` in `profiles.languages_spoken`
- Displayed on public profile
- Used for language-based mentor matching

*I Can Mentor For*
- Multi-select tag input for topics user can mentor others on (e.g., "Career Advice", "Personal Development", "Entrepreneurship")
- Stored as `text[]` in `profiles.can_mentor_for`
- Displayed on public mentor profile
- Color-coded tags (yellow/orange theme as shown in visual)
- Used for mentor discovery and matching

*Want to Learn More On*
- Multi-select tag input for topics user wants to learn (e.g., "Career Advice", "Personal Development", "Entrepreneurship")
- Stored as `text[]` in `profiles.want_to_learn`
- Displayed on public profile
- Color-coded tags (yellow/orange theme matching "can mentor for")
- Used for matching mentees with appropriate mentors

*I Specialize In*
- Multi-select tag input for professional specializations (e.g., "Marketing", "Design", "Growth")
- Stored as `text[]` in `profiles.specializations`
- Displayed on public profile
- Color-coded tags (gray/neutral theme as shown in visual)
- Used for expertise-based matching

*My Hobbies Are*
- Multi-select tag input for personal hobbies (e.g., "Singing", "Hiking", "Photography")
- Stored as `text[]` in `profiles.hobbies`
- Displayed on public profile
- Color-coded tags (colorful/varied theme - pink, yellow, blue as shown in visual)
- Used for interest-based matching and rapport building
- Maximum 20 hobbies per profile

All Traits fields:
- Use autocomplete/suggestions from existing values in database for consistency
- Section-level visibility toggle stored in `profiles.traits_public` (boolean)
- Maximum 20 items per field enforced at API level

**Bio Section**
- Plain text biography with character limit of 1000 characters
- Character count indicator showing remaining characters
- Section stored in `profiles.bio` column
- Edit mode shows textarea with auto-resize based on content

**Work History Section**
- Add/edit/delete work experience entries via modal or inline expansion
- Fields: Company name (required), Job title (required), Start date (required), End date (optional), Description (optional)
- "I currently work here" checkbox that disables end date field when checked
- Date pickers for month/year selection format
- Entries ordered by start_date descending (most recent first)
- Section-level visibility toggle stored in `profiles.work_history_public` (boolean)
- Data stored in `work_experiences` table with `is_current` boolean field added

**Education Section**
- Add/edit/delete education entries via modal or inline expansion
- Fields: Institution name (required), Degree/Field of study (required), Start date (required), End date (optional)
- "I currently study here" checkbox for ongoing education
- Entries ordered by start_date descending
- Section-level visibility toggle stored in `profiles.education_public` (boolean)
- Data stored in `educations` table with `is_current` boolean field added

**Skills Section**
- Add/edit/delete skills with tag-style UI (pill buttons)
- Skill level selection: Beginner / Intermediate / Advanced (radio or segmented control)
- Skill levels stored in `skills.level` column for AI matching, NOT displayed on public profile
- Autocomplete/suggestions from existing skills in database for consistency
- Section-level visibility toggle stored in `profiles.skills_public` (boolean)
- Maximum 50 skills per profile enforced at API level

**Mentor-Specific Fields**
- Displayed only when `profiles.is_mentor = true`
- Areas of expertise: Multi-select tag input stored as `text[]` in `profiles.expertise_areas`
- Languages spoken: Multi-select from predefined list stored as `text[]` in `profiles.languages`
- Timezone: Searchable dropdown using standard IANA timezone identifiers stored in `profiles.timezone`
- Years of experience: Numeric input (0-50 range) stored in `profiles.years_of_experience`
- These fields displayed on public mentor profile page `/m/[handle]`

**Profile Completion Tracking**
- Calculate completion percentage based on weighted section completion
- Weights: Avatar (5%), Personal Info (10%), Location (5%), Bio (10%), Date of Birth (5%), Gender (5%), Nationality (5%), Traits (20% - includes languages, can mentor for, want to learn, specializations, hobbies), Work History (15%), Education (10%), Skills (10%)
- Store computed percentage in `profiles.completion_percentage` (integer 0-100)
- Display circular progress indicator in right sidebar with percentage
- Checklist showing each section's status with point values
- Recalculate completion percentage on every profile update via database trigger or API middleware

**LinkedIn OAuth Import**
- "Import from LinkedIn" button in profile edit page header
- OAuth flow using Clerk's LinkedIn social connection
- After OAuth success, call Firecrawl API to scrape profile data (existing `/api/profile/parse-linkedin`)
- Present parsed data in review modal before saving to database
- Map LinkedIn data: name, headline, work experiences, education, skills
- User can accept/reject individual sections before final save

**CV/Resume Upload and AI Parsing**
- "Upload CV" button alongside LinkedIn import option
- Accept PDF and DOCX formats (5MB max) using existing `/api/profile/parse-cv` endpoint
- Show upload progress and parsing status with loading state
- Present parsed data in review modal identical to LinkedIn flow
- User reviews and confirms before data overwrites existing profile sections
- Implement full PDF/DOCX text extraction (enhance existing `lib/pdf-parser.ts`)

**Public Profile Page (`/m/[handle]`)**
- SEO-optimized Server Component page with metadata generation
- Display: Avatar, Display Name, Headline, Bio (always visible)
- Conditionally show Work History if `work_history_public = true`
- Conditionally show Education if `education_public = true`
- Conditionally show Skills if `skills_public = true` (without levels)
- Show mentor-specific fields: Expertise areas, Languages, Years of experience, Timezone
- "Request Mentorship" CTA button linking to goal creation or collaboration flow
- Handle 404 gracefully if handle not found or user is not a mentor

## Visual Design

**`planning/visuals/Screenshot 2025-12-20 at 9.01.20 PM.png`** - Profile Edit Page Reference
- Three-column layout: nav sidebar (profile sections), main content (form sections), progress sidebar (completion tracker)
- Circular avatar at top with "Upload new photo" link and format guidance text below
- Section-based editing with "Edit" buttons aligned right of each section header
- Personal Info displayed in read-only mode showing Full Name, Email, Phone in grid layout
- Location uses pill/tag selector UI for selected value (shown as blue pill)
- Cancel and "Save changes" buttons appear contextually when section is in edit mode
- Progress widget shows circular percentage (40%) with checklist items and point values
- Clean white card backgrounds with subtle borders and proper spacing

**`planning/visuals/Screenshot 2025-12-20 at 9.15.28 PM.png`** - Public Profile Page Reference
- Single-column centered layout for public profile view
- Large circular avatar at top with user name, current company, and university below
- "I am a mentee" badge indicator and star rating display
- Two CTAs: "Edit Profile" (outline) and "Share my Profile" (filled blue)
- "My Career Path" section showing work history with company, role, and date range (e.g., "2021-2023")
- "My Academic Path" section showing education entries with degree, institution, and dates
- "Traits" section with multiple tag-based fields:
  - Languages: Blue tags (e.g., "English", "Arabic")
  - I can mentor for: Yellow/orange tags (e.g., "Career Advice", "Personal Development", "Entrepreneurship")
  - Want to learn more on: Yellow/orange tags matching mentor topics
  - I specialize in: Gray tags (e.g., "Marketing", "Design", "Growth")
  - My Hobbies are: Colorful varied tags - pink, yellow, blue (e.g., "Singing", "Hiking", "Photography")
- "Update 5 days ago" timestamp with expand/collapse chevron for each section

## Existing Code to Leverage

**`/lib/clerk.ts` - Authentication and Profile Helpers**
- `getCurrentProfile()` function retrieves authenticated user's profile with auto-creation fallback
- `getProfileId()` and `getSupabaseUserId()` for ID resolution between Clerk and Supabase
- `requireAuth()`, `requireMentor()`, `requireMentee()` for route protection patterns
- Reuse these helpers in all new API routes and Server Components

**`/app/api/profile/me/route.ts` - Profile CRUD API**
- Existing GET/PUT endpoints for basic profile fields (display_name, headline, bio, avatar_url)
- Extend PUT handler to accept new fields: phone, location, expertise_areas, languages, timezone, years_of_experience
- Follow same error response pattern: `{ error: { code: string, message: string } }` with appropriate HTTP status codes

**`/app/api/profile/parse-linkedin/route.ts` and `/app/api/profile/parse-cv/route.ts`**
- Complete LinkedIn scraping and CV parsing flows already implemented
- Uses Firecrawl for LinkedIn scraping and OpenAI for structured data extraction via `lib/ai/profile-builder.ts`
- Extend `ProfileDataSchema` in profile-builder.ts to include bio field extraction
- Add review/confirmation step in frontend before auto-saving parsed data

**`/app/m/[handle]/page.tsx` - Public Profile Page**
- Basic public mentor profile already implemented as Server Component
- Extend to display mentor-specific fields (expertise, languages, years, timezone)
- Add section visibility checks using new `*_public` boolean fields on profiles table
- Add proper metadata generation for SEO (title, description, Open Graph tags)

**`/lib/utils/slug.ts` - Handle Validation**
- `isValidHandle()` and `generateHandle()` functions for handle format validation
- Reserved words list prevents conflicts with application routes
- Reuse for handle input validation in profile settings

## Out of Scope

- Account settings (password changes, session management, delete account)
- Payment and billing settings (Stripe Connect setup, transaction history)
- Notification preferences configuration (email, push settings)
- Tax information and bank details for mentor payouts
- AI mentor-mentee matching algorithm implementation (will consume skill data but is separate spec)
- Goal pages at `/g/[slug]` (separate spec, references profile data)
- Mentor onboarding wizard flow (separate spec, uses profile fields built here)
- Real-time collaborative editing or profile version history
- Profile analytics or view tracking
- Social sharing cards generation for profile pages
