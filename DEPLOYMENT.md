# Privi Admin Portal — Deployment & Domain Setup

**Current Production Setup**
- Domain: `founder.privi.info`
- Hosting: Vercel
- DNS: Cloudflare
- Email service: Resend (custom domain: `noreply@privi.info`)
- Shared backend: Supabase (same instance as website)

## Infrastructure

### Domain Structure
```
privi.info                 → Website (https://privi.info)
founder.privi.info         → Admin Portal (https://founder.privi.info)
```

### Hosting
- **Website**: Vercel (auto-deploys from GitHub on push)
- **Admin Portal**: Vercel (auto-deploys from GitHub on push)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Payments**: Stripe (test keys in use)
- **Email**: Resend (custom SMTP for branded emails)

## Supabase Email Configuration

Members receive emails from `noreply@privi.info` via Resend.

**SMTP Settings** (in Supabase → Auth → Email Templates):
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: (Resend API key — see below)
- From email: `noreply@privi.info`
- From name: `Privi`

**Resend Setup:**
1. Create account at resend.com
2. Add custom domain `privi.info` and verify DNS
3. Get SMTP password (API key)
4. Configure in Supabase Email Templates

## Environment Variables

Both projects share these Supabase credentials and Stripe keys (see `.env.local`):

```
# Supabase (same instance for website + admin)
NEXT_PUBLIC_SUPABASE_URL=https://vucejhfyevybvbjtidzx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe (shared test account)
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID_MONTHLY=...
STRIPE_PRICE_ID_ANNUAL=...

# Google Maps (admin portal only)
GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Resend (new — for email)
RESEND_API_KEY=... (not currently used in admin portal code)
```

## Build & Deployment

**GitHub Repos:**
- Website: `privi-project/privi-website`
- Admin Portal: `privi-project/privi-admin-portal`

**Vercel Deployment:**
1. Connected to GitHub repos
2. Auto-deploys on push to main
3. Environment variables configured in Vercel project settings

## Checklist for Claude Code Sessions

When working on this project, verify:
- [ ] Domain: `founder.privi.info`
- [ ] Email service: Resend (noreply@privi.info)
- [ ] Backend: Shared Supabase instance with website
- [ ] Stripe: Using test keys (pk_test_*, sk_test_*)
- [ ] Google Maps: API key configured for business map features

## Next Steps (If Not Yet Done)

1. **Push repos to GitHub** (if not already)
2. **Deploy to Vercel**:
   - Connect GitHub org/repos
   - Set environment variables (see `.env.example`)
   - Deploy
3. **Cloudflare DNS**:
   - Add CNAME records pointing to Vercel
   - Verify SSL/TLS
4. **Resend Setup**:
   - Create account and get API key
   - Add `privi.info` domain
   - Configure SMTP in Supabase
5. **Supabase Email**:
   - Update Auth → Email Templates with Resend SMTP
   - Test email sending

---

Last updated: 2026-07-26
