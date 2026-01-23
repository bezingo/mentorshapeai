# Deployment Guide

## Overview

This guide covers deploying Mentorshape to production, including environment setup, database migrations, and deployment checklist.

---

## Environment Variables

### Required Variables

#### Clerk Authentication

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

**Getting Keys:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to API Keys section
4. Copy Publishable Key and Secret Key
5. Go to Webhooks section
6. Create webhook endpoint: `https://yourdomain.com/api/webhook/clerk`
7. Copy Webhook Signing Secret

#### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Getting Keys:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy Project URL and anon/public key
5. Copy service_role key (keep secret!)

#### Stripe (for Mentor Payouts Only)

**Note:** Clerk Billing handles user and organization subscriptions. Stripe is only needed for mentor payouts via Stripe Connect.

```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Getting Keys:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle to Live mode
3. Go to Developers → API keys
4. Copy Secret key and Publishable key
5. Go to Developers → Webhooks
6. Create webhook endpoint: `https://yourdomain.com/api/webhook/stripe`
7. Select events: `payment_intent.succeeded`, `payout.paid`, `payout.failed` (for mentor payouts only)
8. Copy Webhook signing secret

**Clerk Billing Setup:**
1. Go to Clerk Dashboard → Billing
2. Connect your Stripe account (Clerk handles subscription billing)
3. Define subscription plans (Free, Pro, Starter, Enterprise)
4. Configure plan features and limits
5. Clerk automatically handles subscription management

#### AI Services

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=mentorshape-production
```

**Getting Keys:**
1. **OpenAI**: [API Keys](https://platform.openai.com/api-keys)
2. **Anthropic**: [API Keys](https://console.anthropic.com/settings/keys)
3. **LangSmith**: [API Keys](https://smith.langchain.com/settings)

#### Email Service (Resend)

```env
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@mentorshape.com
```

**Getting Keys:**
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create API key
3. Verify domain: `mentorshape.com`

#### Calendar APIs

```env
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

**Getting Keys:**
1. **Google**: [Google Cloud Console](https://console.cloud.google.com)
2. **Microsoft**: [Azure Portal](https://portal.azure.com)

#### Firecrawl (LinkedIn Scraping)

```env
FIRECRAWL_API_KEY=fc-...
```

**Getting Keys:**
1. Go to [Firecrawl Dashboard](https://firecrawl.dev)

#### Monitoring

```env
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
VERCEL_ANALYTICS_ID=...
```

**Getting Keys:**
1. **Sentry**: [Sentry Dashboard](https://sentry.io)
2. **Vercel Analytics**: Enabled in Vercel dashboard

### Optional Variables

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://mentorshape.com
NODE_ENV=production

# Feature Flags
NEXT_PUBLIC_ENABLE_SMS=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Rate Limiting
RATE_LIMIT_REDIS_URL=redis://...
```

---

## Database Migrations

### Migration Process

#### 1. Local Development

```bash
# Create new migration
supabase migration new migration_name

# Edit migration file in supabase/migrations/
# Apply migration locally
supabase db reset
```

#### 2. Test Migration

```bash
# Test on staging database
supabase link --project-ref staging-project-ref
supabase db push
```

#### 3. Production Migration

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy migration SQL
3. Run in SQL Editor
4. Verify migration succeeded

**Option B: Supabase CLI**
```bash
# Link to production
supabase link --project-ref production-project-ref

# Push migration
supabase db push

# Verify
supabase db diff
```

**Option C: Migration File**
1. Copy migration file to Supabase Dashboard → Database → Migrations
2. Click "Run migration"
3. Verify in SQL Editor

### Migration Checklist

- [ ] Migration tested on staging
- [ ] Backup production database (Supabase auto-backups)
- [ ] Migration is reversible (or rollback plan exists)
- [ ] RLS policies updated (if schema changed)
- [ ] Indexes created (if new tables/columns)
- [ ] Foreign keys added (if relationships changed)
- [ ] Migration run during low-traffic window
- [ ] Verify migration succeeded
- [ ] Test application functionality
- [ ] Monitor for errors

### Rollback Procedure

If migration fails:

1. **Stop deployment** (if in progress)
2. **Restore from backup** (if needed)
3. **Run rollback migration** (if created)
4. **Verify database state**
5. **Investigate failure**
6. **Fix migration**
7. **Retry migration**

### Migration Best Practices

- **Always backup** before production migrations
- **Test on staging** first
- **Keep migrations small** (one logical change per migration)
- **Make migrations idempotent** (safe to run multiple times)
- **Document breaking changes**
- **Coordinate with team** before running migrations

---

## Deployment Process

### Vercel Deployment

#### Initial Setup

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Import Git repository
   - Select framework: Next.js

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables (see above)
   - Set for Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Verify deployment

#### Continuous Deployment

- **Automatic**: Pushes to `main` branch deploy to production
- **Preview**: Pull requests get preview deployments
- **Manual**: Can deploy specific commits

### Deployment Checklist

#### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] API keys rotated (if needed)
- [ ] Documentation updated
- [ ] Changelog updated

#### Deployment Steps

1. [ ] **Merge to main branch**
2. [ ] **Wait for CI/CD to pass**
3. [ ] **Run database migrations** (if any)
4. [ ] **Deploy to Vercel** (automatic or manual)
5. [ ] **Verify deployment** (check Vercel dashboard)
6. [ ] **Test critical paths**:
   - [ ] Sign up flow
   - [ ] Sign in flow
   - [ ] Goal creation
   - [ ] Payment flow (test mode)
   - [ ] Webhook endpoints
7. [ ] **Monitor error logs** (Sentry)
8. [ ] **Check analytics** (Vercel Analytics)

#### Post-Deployment

- [ ] **Monitor error rates** (should be < 1%)
- [ ] **Check performance** (response times)
- [ ] **Verify webhooks** (test events)
- [ ] **Test email delivery** (send test email)
- [ ] **Check database** (query performance)
- [ ] **Monitor costs** (AI API usage, Stripe fees)

---

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- Use test Stripe keys
- Use Supabase local instance (optional)
- Mock external APIs (optional)
- Enable verbose logging

### Staging

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.mentorshape.com
```

- Use test Stripe keys
- Use separate Supabase project
- Real external APIs
- Production-like configuration

### Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://mentorshape.com
```

- Use live Stripe keys
- Production Supabase project
- All external APIs live
- Full monitoring enabled

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Secrets Required

- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

---

## Monitoring & Observability

### Error Tracking (Sentry)

- **Setup**: Add Sentry DSN to environment variables
- **Monitoring**: Check [Sentry Dashboard](https://sentry.io)
- **Alerts**: Configure alerts for critical errors

### Performance Monitoring (Vercel Analytics)

- **Setup**: Enabled in Vercel dashboard
- **Monitoring**: View in Vercel dashboard → Analytics
- **Metrics**: Page views, response times, errors

### Database Monitoring (Supabase)

- **Dashboard**: Supabase Dashboard → Database
- **Metrics**: Query performance, connection pool, storage
- **Alerts**: Configure alerts for high query times

### Logs

- **Vercel Logs**: View in Vercel dashboard → Logs
- **Supabase Logs**: View in Supabase dashboard → Logs
- **Application Logs**: Use structured logging (JSON)

---

## Rollback Procedure

### Quick Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Verify rollback succeeded

### Database Rollback

1. Identify problematic migration
2. Create rollback migration (reverse changes)
3. Run rollback migration
4. Verify database state

### Full Rollback

1. **Revert code** (Git revert)
2. **Rollback database** (if needed)
3. **Redeploy** previous version
4. **Verify** application works
5. **Investigate** root cause

---

## Security Checklist

- [ ] All API keys are secrets (not in code)
- [ ] Environment variables set in Vercel (not `.env` files)
- [ ] Webhook secrets configured
- [ ] RLS policies enabled on all tables
- [ ] HTTPS enabled (Vercel default)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user input)

---

## Performance Optimization

### Build Optimization

- **Next.js**: Enable production optimizations
- **Images**: Use Next.js Image component
- **Fonts**: Use next/font for font optimization
- **Code Splitting**: Automatic with Next.js

### Runtime Optimization

- **Caching**: Use Vercel Edge Caching
- **Database**: Use indexes (see `supabase-migrations.sql`)
- **API**: Cache responses where appropriate
- **CDN**: Vercel Edge Network (automatic)

### Monitoring Performance

- **Core Web Vitals**: Monitor in Vercel Analytics
- **API Response Times**: Monitor in Sentry
- **Database Query Times**: Monitor in Supabase
- **AI API Latency**: Monitor in LangSmith

---

## Troubleshooting

### Common Issues

#### Build Fails

- Check build logs in Vercel
- Verify all dependencies installed
- Check for TypeScript errors
- Verify environment variables set

#### Database Connection Fails

- Verify Supabase URL and keys
- Check network connectivity
- Verify RLS policies allow access
- Check connection pool limits

#### Webhooks Not Working

- Verify webhook URLs are correct
- Check webhook signatures
- Verify webhook secrets match
- Check webhook logs in Stripe/Clerk

#### Payments Failing

- Verify Stripe keys are live (not test)
- Check Stripe dashboard for errors
- Verify webhook events are received
- Check transaction logs

---

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs, check costs
- **Monthly**: Review performance metrics, update dependencies
- **Quarterly**: Security audit, dependency updates

### Updates

- **Dependencies**: Update regularly (`npm audit`)
- **Next.js**: Update to latest stable version
- **Supabase**: Keep client libraries updated
- **Stripe**: Keep SDK updated

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Stripe Docs**: https://stripe.com/docs

