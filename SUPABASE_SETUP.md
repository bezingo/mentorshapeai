# Supabase Setup Instructions

## Issue: DNS Resolution Error

The error `getaddrinfo ENOTFOUND ithnypkfhpkpjbvlhxet.supabase.co` means the Supabase project URL cannot be resolved.

## Steps to Fix:

### 1. Check Your Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project (or create a new one if needed)

### 2. Get the Correct Project URL

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Find the **Project URL** - it should look like:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
3. Copy this URL

### 3. Get Your API Keys

In the same **Settings** → **API** page:

1. **Publishable Key** (anon/public key):
   - Look for "Publishable key" or "anon public" key
   - Copy this value

2. **Service Role Key** (secret key):
   - Look for "service_role" key (⚠️ Keep this secret!)
   - Copy this value

### 4. Update `.env.local`

Update your `.env.local` file with the correct values:

```bash
#SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key_here
SUPABASE_SECRET_KEY=your_service_role_key_here
```

**Important:**
- Replace `YOUR_PROJECT_REF` with your actual project reference ID
- Make sure there are no extra spaces or quotes
- The URL should start with `https://` and end with `.supabase.co`

### 5. Restart Your Dev Server

After updating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 6. Verify Connection

If you're still having issues, verify the URL is correct:

```bash
curl -I https://YOUR_PROJECT_REF.supabase.co
```

This should return HTTP headers, not a DNS error.

## Common Issues:

1. **Project Paused**: Free tier projects pause after inactivity. Check your Supabase dashboard and resume if needed.

2. **Wrong Project**: Make sure you're using the correct project URL from your active Supabase project.

3. **Environment Variables Not Loaded**: Make sure `.env.local` is in the root directory and restart the dev server after changes.

4. **Network Issues**: Check your internet connection and DNS settings.
