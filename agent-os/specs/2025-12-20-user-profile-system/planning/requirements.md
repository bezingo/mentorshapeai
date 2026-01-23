# Spec Requirements: User Profile System

## Initial Description

Create a comprehensive user profile management system allowing users to view and edit their personal information, work history, education, skills, and manage visibility settings for their public mentor profile.

## Requirements Discussion

### First Round Questions

**Q1:** I assume the profile edit page will be a multi-section form (similar to LinkedIn's profile editing experience) where users can edit their bio, work history, education, and skills in distinct sections. Is that correct, or would you prefer a single-page form with all fields visible at once?
**Answer:** Yes, LinkedIn-style multi-section editing is correct.

**Q2:** For avatar upload, I'm thinking we'll use Supabase Storage with client-side image cropping/resizing before upload (to ensure consistent aspect ratios and file sizes). Should we enforce a maximum file size (e.g., 5MB) and specific dimensions (e.g., 400x400px square crop), or do you have different requirements?
**Answer:** Yes, use Supabase Storage with 5MB max, 400x400px square crop.

**Q3:** The DB schema shows individual `is_public` toggles on `work_experiences`, `educations`, and `skills` tables. I assume users will want granular control (e.g., show Job A but hide Job B). Is that correct, or should visibility be section-level only (e.g., all work history public or all private)?
**Answer:** Section-level only (not per-item granular control).

**Q4:** For skills, the schema includes a `level` field. I'm assuming this will be a simple scale (e.g., Beginner/Intermediate/Advanced or 1-5 rating) that users self-select. Should we display skill levels publicly, or keep them internal for AI matching purposes only?
**Answer:** Beginner/Intermediate/Advanced scale, keep internal for AI matching only (don't display publicly).

**Q5:** The mentor onboarding flow (Item #7) requires additional fields like "areas of expertise," "languages," "timezone," and "years of experience." Should this spec include those mentor-specific profile fields now (stored in the same `profiles` table), or will those be handled in the separate Mentor Onboarding spec?
**Answer:** Yes, include mentor-specific fields (areas of expertise, languages, timezone, years of experience) in this spec.

**Q6:** For work history and education entries, I assume we'll allow users to manually add/edit/delete entries with standard fields (company, title, dates, description for work; institution, degree, dates for education). Should we include a "current" checkbox for ongoing positions/education, or rely on blank end dates?
**Answer:** Yes, manual add/edit/delete with "current" checkbox for ongoing positions.

**Q7:** Is there anything specific we should explicitly NOT include in this spec (e.g., LinkedIn import, AI profile parsing, public profile page rendering) to keep scope focused?
**Answer:** INCLUDE all of the following in this spec:
- LinkedIn import / CV parsing
- Public profile page rendering (`/m/[handle]`)
- Profile completion progress tracking (like the 40% indicator in the visual)

### Existing Code to Reference

No similar existing features identified for reference. This is the foundational profile system being built from scratch.

### Follow-up Questions

No follow-up questions were needed.

## Visual Assets

### Files Provided:
- `Screenshot 2025-12-20 at 9.01.20 PM.png`: Reference UI showing a profile editing interface from "Gridlines UI"

### Visual Analysis:

**Layout Structure (Three-Column Layout):**
- **Left Sidebar**: Profile navigation menu with sections:
  - Profile (Edit Profile highlighted as active)
  - Language
  - Notifications
  - Basic section divider
  - Payments
  - Taxes
  - Transactions
  - Secure section divider
  - Password
  - Access
  - Sessions
  - Delete account (in red, at bottom)

- **Main Content Area**: Profile editing form with:
  - "Edit Profile" page header
  - Circular avatar upload area with placeholder photo
  - "Upload new photo" link with helper text: "At least 800x800 px recommended. JPG or PNG is allowed"
  - Personal Info section with Edit button (fields: Full Name, Email, Phone displayed in read-only view)
  - Location dropdown section with Cancel and "Save changes" buttons (showing "California" selected in blue pill)
  - Bio section with Edit button showing rich text content

- **Right Sidebar**: Profile completion widget:
  - "Complete your profile" header
  - Circular progress indicator showing 40%
  - Checklist items with completion status and point values:
    - Setup account: 10% (checked)
    - Upload your photo: 5% (checked)
    - Personal Info: 10% (unchecked)
    - Location: +20% (unchecked, shown as bonus)
    - Biography: 15% (unchecked)
    - Notifications: +10% (unchecked, shown as bonus)
    - Bank details: +30% (unchecked, shown as bonus)

**Design Patterns Observed:**
- Clean, minimal UI with white card backgrounds
- Section-based editing with inline Edit buttons
- Read-only display mode with edit action triggers
- Blue accent color for primary actions and active states
- Location uses pill/tag selector UI
- Progress tracking with gamified percentage system
- Clear visual hierarchy with section headers

**Fidelity Level:** High-fidelity mockup (polished UI reference)

### Visual Insights:
- Profile editing follows a "view then edit" pattern rather than always-editable forms
- Each section has its own Edit button for focused editing
- Avatar is prominently placed at the top of the form
- Progress completion uses gamification with percentage points per section
- Some items show bonus points (indicated with + prefix)
- Navigation includes both profile-related and account settings in one sidebar
- Save/Cancel actions are contextual to the section being edited

## Requirements Summary

### Functional Requirements

**Profile Management:**
- View and edit personal profile information in section-based layout
- LinkedIn-style multi-section editing experience
- Sections: Avatar, Personal Info, Location, Bio, Work History, Education, Skills
- Each section has "view" mode and "edit" mode with Edit button trigger

**Avatar Upload:**
- Circular avatar display with upload functionality
- Use Supabase Storage for file storage
- 5MB maximum file size limit
- Client-side cropping to 400x400px square
- Accept JPG and PNG formats only
- Display recommendation text: "At least 800x800 px recommended. JPG or PNG is allowed"

**Personal Information:**
- Full name (first name, last name)
- Email (from auth, likely read-only or verified change)
- Phone number
- Location (country, city selection)

**Bio Section:**
- Rich text or plain text biography
- Character limit TBD (suggest 500-1000 characters)

**Work History:**
- Add, edit, delete work experience entries
- Fields: Company name, Job title, Start date, End date, Description
- "Currently working here" checkbox for ongoing positions
- Section-level visibility toggle (all public or all private)

**Education:**
- Add, edit, delete education entries
- Fields: Institution name, Degree/Field of study, Start date, End date
- "Currently studying here" checkbox for ongoing education
- Section-level visibility toggle (all public or all private)

**Skills:**
- Add, edit, delete skills
- Skill level: Beginner/Intermediate/Advanced (internal only, not displayed publicly)
- Section-level visibility toggle
- Skill levels used for AI matching, not shown on public profile

**Mentor-Specific Fields:**
- Areas of expertise (multi-select or tags)
- Languages spoken (multi-select)
- Timezone selection
- Years of experience (numeric or range)
- These fields stored in profiles table for mentor role

**Profile Completion Tracking:**
- Visual progress indicator (circular with percentage)
- Checklist showing completion status of each section
- Point values assigned to each section
- Some sections marked as bonus (+X%)
- Gamified approach to encourage profile completion

**LinkedIn Import:**
- Import profile data from LinkedIn
- OAuth flow for LinkedIn connection
- Map LinkedIn data to profile fields (work history, education, skills, bio)

**CV/Resume Parsing:**
- Upload CV/resume file (PDF, DOCX)
- AI-powered parsing to extract profile data
- Map extracted data to profile fields
- User review/confirmation before saving

**Public Profile Page (`/m/[handle]`):**
- Public-facing mentor profile page
- Display: Avatar, Name, Bio, Location
- Show work history (if section set to public)
- Show education (if section set to public)
- Show skills (if section set to public, without levels)
- Mentor-specific fields: expertise areas, languages, years of experience
- SEO-friendly URL structure with user handle

### Visibility Settings

**Section-Level Controls:**
- Work History: Toggle entire section public/private
- Education: Toggle entire section public/private
- Skills: Toggle entire section public/private
- Individual items within sections not independently toggleable

**Default Visibility:**
- New sections default to private until user explicitly makes public
- Avatar, name, and bio always public on mentor profile

### Reusability Opportunities

- This is the foundational profile system; patterns established here will be reused across the application
- Form components and validation patterns will serve as templates for future features
- Avatar upload component can be reused for goal images, group photos, etc.
- Section-based editing pattern applicable to other multi-section forms

### Scope Boundaries

**In Scope:**
- Profile edit page with all sections (avatar, personal info, bio, work, education, skills)
- LinkedIn-style multi-section editing UX
- Avatar upload with Supabase Storage (5MB max, 400x400px crop)
- Section-level visibility toggles
- Mentor-specific profile fields (expertise, languages, timezone, years of experience)
- Profile completion progress tracking with gamified percentages
- LinkedIn OAuth import flow
- CV/Resume upload and AI parsing
- Public profile page rendering at `/m/[handle]`
- Skill levels (Beginner/Intermediate/Advanced) stored internally for AI matching

**Out of Scope:**
- Account settings (password, sessions, access, delete account)
- Payment/billing settings
- Notification preferences
- Tax information
- Bank details
- AI mentor matching algorithm (uses skill data but separate spec)
- Goal pages `/g/[slug]` (separate spec, will reference profile data)
- Mentor onboarding flow/wizard (separate spec, uses these fields)

### Technical Considerations

**Database:**
- Existing schema: `profiles`, `work_experiences`, `educations`, `skills` tables
- Add section-level visibility fields to profiles table (work_history_public, education_public, skills_public)
- Add mentor-specific fields to profiles table (expertise_areas, languages, timezone, years_of_experience)
- Add profile_completion_percentage computed or stored field

**Storage:**
- Supabase Storage for avatar images
- Supabase Storage for uploaded CV/resume files
- Image optimization/resizing on client side before upload

**Authentication:**
- LinkedIn OAuth for import feature
- Existing Supabase Auth for user sessions

**API Integrations:**
- LinkedIn API for profile data import
- AI service for CV/resume parsing (Claude or similar)

**Frontend Patterns:**
- React Hook Form + Zod for form validation (per tech stack)
- Server Components where possible, Client Components for interactive forms
- Shadcn/ui components for UI elements
- Section-based editing with modal or inline expansion for edit mode

**URL Structure:**
- Profile edit: `/dashboard/profile` or similar authenticated route
- Public profile: `/m/[handle]` (handle from profiles.handle field)
