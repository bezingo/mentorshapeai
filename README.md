# MentorShape AI

A Next.js application with TypeScript, Tailwind CSS, shadcn/ui, Supabase, Zustand, and Clerk authentication.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Supabase** - Backend as a service (database, auth, storage)
- **Zustand** - Lightweight state management
- **Clerk** - Authentication and user management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Clerk account ([sign up here](https://clerk.com))
- Supabase account ([sign up here](https://supabase.com))

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
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Getting Your API Keys

#### Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select an existing one
3. Copy your **Publishable Key** and **Secret Key** from the API Keys section

#### Supabase Setup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select an existing one
3. Go to Settings → API
4. Copy your **Project URL** and **anon/public key**

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with ClerkProvider
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions and configurations
│   ├── supabase/         # Supabase client setup
│   │   ├── client.ts     # Browser client
│   │   └── server.ts     # Server client
│   ├── store/            # Zustand stores
│   │   └── useStore.ts   # Example store
│   └── utils.ts          # Utility functions
├── middleware.ts         # Clerk middleware for route protection
└── components.json       # shadcn/ui configuration
```

## Usage Examples

### Using Supabase Client

**Client Component:**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('table').select()
```

**Server Component:**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('table').select()
```

### Using Zustand Store

```typescript
import { useStore } from '@/lib/store/useStore'

function MyComponent() {
  const { count, increment, decrement } = useStore()
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  )
}
```

### Using Clerk Authentication

```typescript
import { useUser } from '@clerk/nextjs'

function Profile() {
  const { user } = useUser()
  
  return <div>Hello, {user?.firstName}!</div>
}
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Clerk Documentation](https://clerk.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Make sure to add your environment variables in the Vercel dashboard under Project Settings → Environment Variables.
