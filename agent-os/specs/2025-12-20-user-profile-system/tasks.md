# Task Breakdown: User Profile System

## Overview
Total Tasks: 59 (across 8 task groups)

This comprehensive user profile system enables multi-section profile editing with LinkedIn-style UX, mentor-specific fields, profile completion tracking, LinkedIn/CV import, and public profile pages at `/m/[handle]`.

## Task List

---

### Database Layer

#### Task Group 1: Schema Extensions and Migrations
**Dependencies:** None
**Specialist:** Database Engineer

- [x] 1.0 Complete database schema extensions for user profile system
  - [x] 1.1 Write 6 focused tests for profile schema changes
    - Test new profile fields store and retrieve correctly (phone, date_of_birth, gender, nationality, country, city)
    - Test text array fields (languages_spoken, can_mentor_for, want_to_learn, specializations, hobbies, expertise_areas, languages)
    - Test section visibility booleans (traits_public, work_history_public, education_public, skills_public)
    - Test completion_percentage calculation trigger
    - Test is_current boolean on work_experiences and educations tables
    - Test timezone and years_of_experience fields store correctly
  - [x] 1.2 Create migration `004_profile_extended_fields.sql` for profiles table extensions
    - Add `phone text`
    - Add `date_of_birth date`
    - Add `gender text`
    - Add `nationality text`
    - Add `country text`
    - Add `city text`
    - Add `timezone text`
    - Add `years_of_experience integer check (years_of_experience >= 0 and years_of_experience <= 50)`
    - Add `completion_percentage integer default 0 check (completion_percentage >= 0 and completion_percentage <= 100)`
    - Add `updated_at timestamptz not null default now()`
  - [x] 1.3 Create migration `005_profile_array_fields.sql` for text array columns
    - Add `languages_spoken text[] default '{}'`
    - Add `can_mentor_for text[] default '{}'`
    - Add `want_to_learn text[] default '{}'`
    - Add `specializations text[] default '{}'`
    - Add `hobbies text[] default '{}'`
    - Add `expertise_areas text[] default '{}'`
    - Add `languages text[] default '{}'` (for mentor languages)
  - [x] 1.4 Create migration `006_profile_visibility_fields.sql` for section visibility toggles
    - Add `traits_public boolean default true`
    - Add `work_history_public boolean default true`
    - Add `education_public boolean default true`
    - Add `skills_public boolean default true`
  - [x] 1.5 Create migration `007_work_education_is_current.sql` for is_current flags
    - Add `is_current boolean default false` to work_experiences table
    - Add `is_current boolean default false` to educations table
    - Add `created_at timestamptz default now()` and `updated_at timestamptz default now()` to both tables
  - [x] 1.6 Create migration `008_profile_completion_trigger.sql` for auto-calculation
    - Create function `calculate_profile_completion()` with weighted scoring:
      - Avatar (5%): `avatar_url IS NOT NULL`
      - Personal Info (10%): `display_name IS NOT NULL AND headline IS NOT NULL`
      - Location (5%): `country IS NOT NULL AND city IS NOT NULL`
      - Bio (10%): `bio IS NOT NULL AND length(bio) > 0`
      - Date of Birth (5%): `date_of_birth IS NOT NULL`
      - Gender (5%): `gender IS NOT NULL`
      - Nationality (5%): `nationality IS NOT NULL`
      - Traits (20%): `array_length(languages_spoken, 1) > 0 OR array_length(can_mentor_for, 1) > 0 OR ...`
      - Work History (15%): Check work_experiences table count > 0
      - Education (10%): Check educations table count > 0
      - Skills (10%): Check skills table count > 0
    - Create trigger on profiles INSERT/UPDATE
    - Create triggers on work_experiences, educations, skills INSERT/UPDATE/DELETE to recalculate parent profile
  - [x] 1.7 Create Supabase Storage bucket `avatars` with RLS policies
    - Bucket allows authenticated users to upload to `{profile_id}/avatar.*`
    - Users can only read/write their own avatar folder
    - Public read access for avatar display
  - [x] 1.8 Ensure database layer tests pass
    - Run ONLY the 6 tests written in 1.1
    - Verify all migrations run successfully with `supabase db push`
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 6 database tests pass
- Migrations run without errors
- Profile completion percentage auto-calculates correctly
- Supabase Storage bucket configured with proper RLS

---

### API Layer

#### Task Group 2: Profile API Extensions
**Dependencies:** Task Group 1
**Specialist:** API Engineer

- [x] 2.0 Complete API layer for profile management
  - [x] 2.1 Write 8 focused tests for profile API endpoints
    - Test GET `/api/profile/me` returns all new profile fields
    - Test PUT `/api/profile/me` updates personal info fields (phone, date_of_birth, gender, nationality)
    - Test PUT `/api/profile/me` updates location fields (country, city)
    - Test PUT `/api/profile/me` updates text array fields (languages_spoken, can_mentor_for, etc.)
    - Test PUT `/api/profile/me` enforces max 20 items per array field
    - Test PUT `/api/profile/me` updates visibility toggles
    - Test PUT `/api/profile/me` updates mentor-specific fields only when is_mentor=true
    - Test completion_percentage is returned and reflects current state
  - [x] 2.2 Extend `/api/profile/me/route.ts` PUT handler with new fields
    - Add Zod schema for all new fields with validation
    - Phone: international format validation via regex
    - Date of birth: valid date, not in future, reasonable age range
    - Gender: enum validation (Male, Female, Non-binary, Prefer not to say)
    - Text arrays: max 20 items each, string sanitization
    - Years of experience: 0-50 range
    - Timezone: IANA timezone identifier validation
    - Follow existing error response pattern: `{ error: { code, message } }`
  - [x] 2.3 Create `/api/profile/avatar/route.ts` for avatar upload handling
    - POST: Generate upload path and avatar URL for Supabase Storage
    - Accept file metadata (size, type) for validation before upload
    - Validate 5MB max size, JPG/PNG only
    - Return upload path and final avatar_url path
    - PUT: Update `profiles.avatar_url` after successful upload
  - [x] 2.4 Extend GET `/api/profile/me` to include related data
    - Include work_experiences array (ordered by start_date desc)
    - Include educations array (ordered by start_date desc)
    - Include skills array
    - Include computed completion_percentage
  - [x] 2.5 Ensure API layer tests pass
    - Run ONLY the 8 tests written in 2.1
    - Verify all endpoints respond correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 8 API tests pass
- Profile CRUD operations work with all new fields
- Avatar upload flow generates valid presigned URLs
- Proper validation and error responses

---

#### Task Group 3: Work Experience, Education, and Skills CRUD APIs
**Dependencies:** Task Group 1
**Specialist:** API Engineer

- [x] 3.0 Complete CRUD APIs for profile sub-resources
  - [x] 3.1 Write 6 focused tests for sub-resource APIs
    - Test work_experiences CRUD (create with is_current, update, delete)
    - Test educations CRUD (create with is_current, update, delete)
    - Test skills CRUD (create with level, update, delete, max 50 limit)
    - Test authorization: users can only modify their own records
    - Test is_current=true nullifies end_date
    - Test profile completion recalculates after CRUD operations
  - [x] 3.2 Create `/api/profile/work-experiences/route.ts`
    - GET: List work experiences for current user (ordered by start_date desc)
    - POST: Create new work experience with Zod validation
      - Fields: company (required), title (required), start_date (required), end_date (optional), description (optional), is_current (boolean)
      - If is_current=true, set end_date to null
  - [x] 3.3 Create `/api/profile/work-experiences/[id]/route.ts`
    - GET: Fetch single work experience (verify ownership)
    - PUT: Update work experience
    - DELETE: Remove work experience
  - [x] 3.4 Create `/api/profile/educations/route.ts`
    - GET: List educations for current user (ordered by start_date desc)
    - POST: Create new education with Zod validation
      - Fields: institution (required), degree (required), start_date (required), end_date (optional), is_current (boolean)
  - [x] 3.5 Create `/api/profile/educations/[id]/route.ts`
    - GET, PUT, DELETE handlers following same pattern as work experiences
  - [x] 3.6 Create `/api/profile/skills/route.ts`
    - GET: List skills for current user
    - POST: Create new skill with Zod validation
      - Fields: name (required), level (Beginner/Intermediate/Advanced)
      - Enforce max 50 skills per profile
  - [x] 3.7 Create `/api/profile/skills/[id]/route.ts`
    - GET, PUT, DELETE handlers
  - [x] 3.8 Ensure sub-resource API tests pass
    - Run ONLY the 6 tests written in 3.1
    - Verify CRUD operations work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 6 sub-resource API tests pass
- Work experiences, educations, and skills CRUD fully functional
- Proper authorization prevents cross-user access
- Profile completion auto-recalculates

---

#### Task Group 4: LinkedIn and CV Import APIs
**Dependencies:** Task Groups 2, 3
**Specialist:** API Engineer

- [x] 4.0 Complete import APIs for LinkedIn and CV parsing
  - [x] 4.1 Write 4 focused tests for import functionality
    - Test `/api/profile/parse-linkedin` returns structured profile data
    - Test `/api/profile/parse-cv` handles PDF upload and returns parsed data
    - Test `/api/profile/import` saves parsed data to profile and sub-tables
    - Test import respects user confirmation (only saves selected sections)
  - [x] 4.2 Enhance `/api/profile/parse-linkedin/route.ts`
    - Verify existing Firecrawl integration works
    - Extend `ProfileDataSchema` in `lib/ai/profile-builder.ts` to include bio extraction
    - Return structured data for review (not auto-save)
    - Map: name -> display_name, headline, work experiences, education, skills, bio
  - [x] 4.3 Enhance `/api/profile/parse-cv/route.ts`
    - Verify PDF/DOCX text extraction via `lib/pdf-parser.ts`
    - Enhance text extraction for better resume parsing
    - Accept 5MB max, PDF/DOCX formats only
    - Return structured data matching LinkedIn parse format
    - Show parsing status/progress via response
  - [x] 4.4 Create `/api/profile/import/route.ts` for confirmed import
    - POST: Accept parsed data with section-level confirmation flags
    - Body: `{ sections: { personal: boolean, work: boolean, education: boolean, skills: boolean }, data: ParsedProfile }`
    - Only save sections where confirmation=true
    - Create/update work_experiences, educations, skills records as needed
    - Return updated profile with completion_percentage
  - [x] 4.5 Ensure import API tests pass
    - Run ONLY the 4 tests written in 4.1
    - Verify import flows work end-to-end
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 4 import API tests pass
- LinkedIn scraping returns parseable profile data
- CV upload extracts and structures resume content
- Confirmed import saves only selected sections

---

### Frontend - Profile Edit Page

#### Task Group 5: Profile Edit Page UI Components
**Dependencies:** Task Groups 2, 3
**Specialist:** UI Designer / Frontend Engineer

- [x] 5.0 Complete profile edit page with multi-section editing
  - [x] 5.1 Write 8 focused tests for profile edit components
    - Test ProfileEditPage renders three-column layout on desktop
    - Test section view/edit mode toggle works correctly
    - Test AvatarUpload component handles file selection and crop
    - Test PersonalInfoSection displays and edits fields correctly
    - Test form validation shows errors for invalid inputs
    - Test Save/Cancel buttons appear in edit mode and work correctly
    - Test mobile responsive layout collapses sidebar
    - Test ProfileCompletionWidget displays correct percentage and checklist
  - [x] 5.2 Create profile edit page layout at `/app/dashboard/profile/page.tsx`
    - Three-column responsive layout using CSS Grid
    - Left: Navigation sidebar with profile sections and settings links
    - Center: Main content area with profile sections
    - Right: Profile completion widget
    - Mobile: Sidebar as hamburger menu, completion widget below content
    - Match visual design from `planning/visuals/Screenshot 2025-12-20 at 9.01.20 PM.png`
  - [x] 5.3 Create `ProfileNavSidebar` component
    - Section links: Edit Profile, Language, Notifications (divider), Payments, Taxes, Transactions (divider), Password, Access, Sessions, Delete account
    - Active state highlighting for current section
    - Collapsible on mobile with hamburger trigger
    - Note: Only "Edit Profile" is in scope; other links can be placeholders
  - [x] 5.4 Create `AvatarUploadSection` component
    - Circular avatar display with placeholder for empty state
    - "Upload new photo" link triggers file picker
    - Helper text: "At least 800x800 px recommended. JPG or PNG is allowed"
    - Client-side validation: 5MB max, JPG/PNG only
    - Integrate `react-image-crop` or similar for 400x400px square cropping
    - Upload to Supabase Storage via presigned URL from API
    - Show upload progress indicator
    - Error states with user-friendly messages
  - [x] 5.5 Create `ProfileSection` wrapper component for view/edit pattern
    - Props: title, viewContent, editContent, onSave, onCancel, isEditing
    - Displays "Edit" button in view mode (aligned right of header)
    - Shows Save/Cancel buttons in edit mode
    - Handles loading state during save
    - Reusable for all profile sections
  - [x] 5.6 Create `PersonalInfoSection` component
    - View mode: Display Full Name, Email (read-only badge), Phone in grid layout
    - Edit mode: First Name, Last Name inputs, Phone with international format
    - Email shown as read-only (from Clerk auth)
    - Additional fields: Date of Birth (date picker), Gender (dropdown), Nationality (searchable dropdown)
    - Zod validation matching API schema
    - Use React Hook Form for form state management
  - [x] 5.7 Create `LocationSection` component
    - View mode: Display "City, Country" or "Not set"
    - Edit mode: Country searchable dropdown, City searchable combobox
    - Country list from static data (ISO countries)
    - City filtering based on selected country (if data available) or freeform input
    - Pill/tag UI for selected location (blue pill as shown in visual)
  - [x] 5.8 Create `TraitsSection` component
    - View mode: Display all tag groups with color-coded pills
    - Edit mode: Multi-select tag inputs for each field
    - Fields:
      - Languages Spoken: Blue tags
      - I Can Mentor For: Yellow/orange tags
      - Want to Learn More On: Yellow/orange tags
      - I Specialize In: Gray tags
      - My Hobbies Are: Colorful varied tags (pink, yellow, blue)
    - Autocomplete suggestions from existing values in database
    - Max 20 items per field with client-side enforcement
    - Section-level visibility toggle (traits_public)
  - [x] 5.9 Create `BioSection` component
    - View mode: Display bio text (truncated with "Read more" if long)
    - Edit mode: Textarea with auto-resize
    - Character count indicator showing remaining (1000 max)
    - Plain text only (no rich text)
  - [x] 5.10 Create `ProfileCompletionWidget` component
    - Circular progress indicator with percentage (like 40% in visual)
    - "Complete your profile" header
    - Checklist items with completion status and point values:
      - Setup account: 10% (always checked)
      - Upload your photo: 5%
      - Personal Info: 10%
      - Location: 5%
      - Date of Birth: 5%
      - Gender: 5%
      - Nationality: 5%
      - Traits: 20%
      - Biography: 10%
      - Work History: 15%
      - Education: 10%
      - Skills: 10%
    - Fetch completion_percentage from API
    - Animate progress changes
  - [x] 5.11 Ensure profile edit page tests pass
    - Run ONLY the 8 tests written in 5.1
    - Verify components render and interact correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 8 UI tests pass
- Three-column layout matches visual design
- All sections toggle between view/edit modes correctly
- Avatar upload with crop works end-to-end
- Form validation provides clear feedback
- Mobile responsive layout works correctly
- Profile completion widget displays accurate data

---

#### Task Group 6: Work History, Education, and Skills UI Sections
**Dependencies:** Task Group 5
**Specialist:** UI Designer / Frontend Engineer

- [x] 6.0 Complete CRUD UI sections for work, education, and skills
  - [x] 6.1 Write 6 focused tests for CRUD UI sections
    - Test WorkHistorySection displays entries and opens add/edit modal
    - Test EducationSection displays entries and opens add/edit modal
    - Test SkillsSection displays skill pills with add/edit capability
    - Test "I currently work/study here" checkbox disables end date
    - Test delete confirmation works correctly
    - Test visibility toggle updates section privacy
  - [x] 6.2 Create `WorkHistorySection` component
    - View mode: List work experiences with company, title, date range
    - Date format: "2021-2023" or "2021-Present" for is_current=true
    - "Add Experience" button triggers modal
    - Each entry has Edit/Delete actions (icon buttons)
    - Section visibility toggle (work_history_public)
  - [x] 6.3 Create `WorkExperienceModal` component
    - Modal dialog for add/edit work experience
    - Fields: Company name*, Job title*, Start date* (month/year), End date (month/year), Description (textarea)
    - "I currently work here" checkbox - when checked, disable and clear end date
    - Save/Cancel buttons
    - Delete button (with confirmation) in edit mode
    - Form validation with error messages
  - [x] 6.4 Create `EducationSection` component
    - View mode: List educations with degree, institution, date range
    - "Add Education" button triggers modal
    - Each entry has Edit/Delete actions
    - Section visibility toggle (education_public)
  - [x] 6.5 Create `EducationModal` component
    - Modal dialog for add/edit education
    - Fields: Institution name*, Degree/Field of study*, Start date*, End date
    - "I currently study here" checkbox
    - Save/Cancel/Delete buttons
  - [x] 6.6 Create `SkillsSection` component
    - View mode: Display skills as pill/tag buttons
    - "Add Skill" button triggers modal or inline add
    - Each skill pill has edit/delete on hover/click
    - Section visibility toggle (skills_public)
    - Show count indicator (e.g., "23/50 skills")
  - [x] 6.7 Create `SkillModal` or inline skill editor
    - Fields: Skill name*, Level (Beginner/Intermediate/Advanced radio or segmented control)
    - Autocomplete suggestions from existing skills in database
    - Note: Level is for AI matching, not displayed publicly
    - Max 50 skills enforcement with warning
  - [x] 6.8 Ensure CRUD UI section tests pass
    - Run ONLY the 6 tests written in 6.1
    - Verify add/edit/delete flows work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 6 CRUD UI tests pass
- Work history, education, and skills sections fully functional
- Modal forms validate and save correctly
- "Currently here" checkbox behavior works correctly
- Visibility toggles update section privacy

---

#### Task Group 7: Import UI and Mentor Fields
**Dependencies:** Task Groups 4, 5, 6
**Specialist:** UI Designer / Frontend Engineer

- [x] 7.0 Complete import flows and mentor-specific fields UI
  - [x] 7.1 Write 6 focused tests for import and mentor UI
    - Test LinkedIn import button triggers OAuth flow
    - Test CV upload accepts PDF/DOCX and shows progress
    - Test ImportReviewModal displays parsed sections for confirmation
    - Test MentorFieldsSection only renders when is_mentor=true
    - Test timezone dropdown shows IANA timezones
    - Test years of experience accepts valid numeric input
  - [x] 7.2 Create import section in profile edit page header
    - "Import from LinkedIn" button with LinkedIn icon
    - "Upload CV" button with upload icon
    - Buttons positioned in page header area or as a card above sections
  - [x] 7.3 Create LinkedIn import flow
    - Button triggers Clerk LinkedIn OAuth connection
    - After OAuth success, call `/api/profile/parse-linkedin`
    - Show loading state during scraping/parsing
    - Open ImportReviewModal with parsed data
  - [x] 7.4 Create CV upload flow
    - File picker accepting PDF, DOCX (5MB max)
    - Upload file to API with progress indicator
    - Call `/api/profile/parse-cv` for parsing
    - Show loading state with "Parsing your CV..." message
    - Open ImportReviewModal with parsed data
  - [x] 7.5 Create `ImportReviewModal` component
    - Display parsed data in sections: Personal Info, Work History, Education, Skills
    - Each section has checkbox to include/exclude from import
    - Preview parsed data in each section
    - "Import Selected" and "Cancel" buttons
    - Call `/api/profile/import` with selected sections
    - Show success message and refresh profile data
  - [x] 7.6 Create `MentorFieldsSection` component (only visible when is_mentor=true)
    - View mode: Display expertise areas, languages, timezone, years of experience
    - Edit mode:
      - Areas of expertise: Multi-select tag input
      - Languages spoken: Multi-select from predefined list
      - Timezone: Searchable dropdown (IANA identifiers)
      - Years of experience: Number input (0-50)
    - These fields display on public mentor profile
  - [x] 7.7 Ensure import and mentor UI tests pass
    - Run ONLY the 6 tests written in 7.1
    - Verify import flows work end-to-end
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 6 import/mentor UI tests pass
- LinkedIn import flow completes successfully
- CV upload parses and presents review modal
- Import review allows selective section import
- Mentor fields section works correctly for mentors

---

### Public Profile Page

#### Task Group 8: Public Profile Page Enhancement
**Dependencies:** Task Groups 1, 2
**Specialist:** Frontend Engineer

- [x] 8.0 Complete public profile page at `/m/[handle]`
  - [x] 8.1 Write 5 focused tests for public profile page
    - Test page renders mentor profile with all visible sections
    - Test page respects section visibility toggles (work_history_public, etc.)
    - Test page returns 404 for non-existent or non-mentor handles
    - Test SEO metadata is generated correctly
    - Test Traits section displays with correct tag colors
  - [x] 8.2 Enhance `/app/m/[handle]/page.tsx` Server Component
    - Fetch profile with all new fields
    - Check `is_mentor = true` requirement
    - Return 404 gracefully if handle not found or not a mentor
    - Query work_experiences, educations, skills based on `*_public` flags
    - Pass data to client components for display
  - [x] 8.3 Add SEO metadata generation
    - Generate `metadata` export with dynamic title: "{display_name} | Mentor on Mentorshape"
    - Meta description from headline or bio (truncated)
    - Open Graph tags: title, description, image (avatar_url)
    - Twitter card tags
  - [x] 8.4 Update profile display layout to match visual design
    - Single-column centered layout (max-w-2xl or similar)
    - Large circular avatar at top center
    - Name, current company (from most recent work), university (from most recent education)
    - "I am a mentee" or "I am a mentor" badge
    - Star rating display (if ratings data available)
    - Two CTAs: "Edit Profile" (outline, only if own profile), "Share my Profile" (filled blue)
    - Match visual from `planning/visuals/Screenshot 2025-12-20 at 9.15.28 PM.png`
  - [x] 8.5 Create "My Career Path" section
    - Display work history entries with company, role, date range
    - Date format: "2021-2023" (year only)
    - Only show if `work_history_public = true`
    - "Update X days ago" timestamp with expand/collapse chevron
  - [x] 8.6 Create "My Academic Path" section
    - Display education entries with degree, institution, dates
    - Only show if `education_public = true`
    - Matching layout to career path section
  - [x] 8.7 Create "Traits" section with color-coded tags
    - Languages: Blue tags
    - I can mentor for: Yellow/orange tags
    - Want to learn more on: Yellow/orange tags
    - I specialize in: Gray tags
    - My Hobbies are: Colorful varied tags (pink, yellow, blue)
    - Only show if `traits_public = true`
    - Match visual design exactly
  - [x] 8.8 Display mentor-specific fields
    - Expertise areas (if mentor)
    - Languages spoken
    - Years of experience
    - Timezone (formatted nicely)
  - [x] 8.9 Add "Request Mentorship" CTA button
    - Link to goal creation or collaboration request flow
    - Only show for visitors (not own profile)
  - [x] 8.10 Ensure public profile page tests pass
    - Run ONLY the 5 tests written in 8.1
    - Verify page renders correctly with visibility logic
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 5 public profile tests pass
- Public profile page matches visual design
- Section visibility toggles respected
- SEO metadata generated correctly
- Traits displayed with correct color-coding

---

### Testing

#### Task Group 9: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-8
**Specialist:** QA Engineer

- [x] 9.0 Review existing tests and fill critical gaps only
  - [x] 9.1 Review tests from Task Groups 1-8
    - Review 6 database tests (Task 1.1)
    - Review 8 profile API tests (Task 2.1)
    - Review 6 sub-resource API tests (Task 3.1)
    - Review 4 import API tests (Task 4.1)
    - Review 8 profile edit UI tests (Task 5.1)
    - Review 6 CRUD UI tests (Task 6.1)
    - Review 6 import/mentor UI tests (Task 7.1)
    - Review 5 public profile tests (Task 8.1)
    - Total existing tests: approximately 49 tests
  - [x] 9.2 Analyze test coverage gaps for user profile feature only
    - Identify critical user workflows lacking coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Prioritize end-to-end workflows: complete profile edit flow, import flow, public profile viewing
    - Do NOT assess entire application test coverage
  - [x] 9.3 Write up to 10 additional strategic tests maximum
    - End-to-end: Complete profile creation from empty state to 100% completion
    - End-to-end: LinkedIn import to profile save flow
    - End-to-end: CV upload to profile save flow
    - Integration: Profile completion percentage updates after all CRUD operations
    - Integration: Public profile respects all visibility toggles simultaneously
    - Edge case (if critical): Max limits (50 skills, 20 items per array)
    - Skip non-critical edge cases, error states, and accessibility tests
  - [x] 9.4 Run feature-specific tests only
    - Run ONLY tests related to user profile feature
    - Expected total: approximately 49-59 tests maximum
    - Do NOT run entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 49-59 tests total)
- Critical user workflows for profile management are covered
- No more than 10 additional tests added
- Testing focused exclusively on user profile system requirements

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Foundation
  1. Database Layer (Task Group 1)

Phase 2: API Layer
  2. Profile API Extensions (Task Group 2)
  3. Work/Education/Skills CRUD APIs (Task Group 3)
  4. LinkedIn and CV Import APIs (Task Group 4)

Phase 3: Frontend
  5. Profile Edit Page UI Components (Task Group 5)
  6. Work History, Education, Skills UI (Task Group 6)
  7. Import UI and Mentor Fields (Task Group 7)
  8. Public Profile Page Enhancement (Task Group 8)

Phase 4: Quality Assurance
  9. Test Review and Gap Analysis (Task Group 9)
```

## Dependencies Graph

```
Task Group 1 (Database)
    |
    +---> Task Group 2 (Profile API)
    |         |
    |         +---> Task Group 4 (Import APIs)
    |         |         |
    |         |         +---> Task Group 7 (Import UI)
    |         |
    |         +---> Task Group 5 (Profile Edit UI)
    |                   |
    |                   +---> Task Group 6 (CRUD UI)
    |                             |
    |                             +---> Task Group 7 (Import UI)
    |
    +---> Task Group 3 (Sub-resource APIs)
    |         |
    |         +---> Task Group 5 (Profile Edit UI)
    |
    +---> Task Group 8 (Public Profile Page)
              |
              +---> Task Group 9 (Test Review)
```

## Technical Notes

### Existing Code to Leverage
- `/lib/clerk.ts` - Authentication helpers (`getCurrentProfile`, `requireAuth`, `requireMentor`)
- `/app/api/profile/me/route.ts` - Existing profile GET/PUT (extend, don't replace)
- `/app/api/profile/parse-linkedin/route.ts` - LinkedIn scraping (verify and enhance)
- `/app/api/profile/parse-cv/route.ts` - CV parsing (verify and enhance)
- `/app/m/[handle]/page.tsx` - Public profile (enhance with new fields)
- `/lib/ai/profile-builder.ts` - AI profile extraction schema (extend)
- `/lib/utils/slug.ts` - Handle validation utilities

### Key Patterns to Follow
- RESTful API design with consistent error responses: `{ error: { code, message } }`
- Zod schemas for all API validation
- React Hook Form + Zod for frontend form validation
- Server Components where possible, Client Components for interactive forms
- Shadcn/ui components for UI elements
- Supabase Storage for file uploads with presigned URLs
- Database triggers for computed fields (completion_percentage)

### Visual References
- Profile Edit Page: `planning/visuals/Screenshot 2025-12-20 at 9.01.20 PM.png`
- Public Profile Page: `planning/visuals/Screenshot 2025-12-20 at 9.15.28 PM.png`
