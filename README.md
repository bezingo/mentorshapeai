# MentorShape AI

A Next.js application with TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Better Auth authentication.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Supabase** - PostgreSQL database with RLS policies
- **Zustand** - Lightweight state management
- **Better Auth** - Authentication (email/password + Google OAuth)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up here](https://supabase.com))
- Google Cloud Console project (optional, for Google OAuth)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your actual keys:

```env
# Better Auth
BETTER_AUTH_SECRET=your_random_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# Supabase (Postgres + RLS + Storage only)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting Your API Keys

#### Better Auth Setup

1. Generate a random secret key for `BETTER_AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
2. Set `BETTER_AUTH_URL` to your app URL (e.g., `http://localhost:3000` for local dev)

#### Supabase Setup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select an existing one
3. Go to Settings → API
4. Copy your **Project URL** and **anon/public key** (publishable key)
5. Copy your **service_role key** (secret key) - keep this private!

> **Note:** This app uses Supabase as a PostgreSQL database with RLS policies only. Authentication is handled by Better Auth, not Supabase Auth.

#### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to APIs & Services → Credentials
4. Create an OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret

### Running Migrations

Apply the database migrations to set up the schema:

```bash
# Using Supabase CLI
supabase db push

# Or run migrations directly via the Supabase dashboard SQL editor
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication

This app uses Better Auth for authentication:

- **Email/Password** - Works out of the box
- **Google OAuth** - Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Pages

- `/sign-in` - Sign in with email/password or Google
- `/sign-up` - Create a new account

### Server-Side Auth

```typescript
import { getSession, getCurrentProfile } from '@/lib/auth-helpers'

// In a server component or API route
const session = await getSession()
if (!session) {
  redirect('/sign-in')
}

const profile = await getCurrentProfile()
```

### Client-Side Auth

```typescript
import { useSession, signIn, signOut } from '@/lib/auth-client'

function MyComponent() {
  const { data: session } = useSession()
  
  if (!session) {
    return <button onClick={() => signIn.email({ email, password })}>Sign In</button>
  }
  
  return <div>Hello, {session.user.name}!</div>
}
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   ├── api/auth/          # Better Auth API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/             # Auth components (UserMenu)
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions and configurations
│   ├── auth.ts           # Better Auth server config
│   ├── auth-client.ts    # Better Auth client
│   ├── auth-helpers.ts   # Auth helper functions
│   ├── supabase/         # Supabase client setup
│   │   ├── client.ts     # Browser client
│   │   ├── server.ts     # Server client
│   │   └── service.ts    # Service role client
│   └── utils.ts          # Utility functions
├── middleware.ts         # Route protection middleware
└── supabase/migrations/  # Database migrations
```

## Database

The app uses Supabase PostgreSQL with the following key tables:

- `auth_user` - Better Auth users
- `auth_session` - Better Auth sessions
- `auth_account` - OAuth accounts
- `users` - Application users
- `profiles` - User profiles with mentor/mentee info
- `goals` - User goals
- `collaborations` - Mentor-mentee relationships
- `organizations` - School/org tenancy

All authenticated database access goes through server routes using the Supabase service role client. RLS policies restrict client access to public data only.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Better Auth Documentation](https://better-auth.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Make sure to add your environment variables in the Vercel dashboard under Project Settings → Environment Variables:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (set to your production URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SECRET_KEY`
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)
- `NEXT_PUBLIC_APP_URL`
