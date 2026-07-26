Privi Admin Portal — v1 build per `../Admin_Portal_Structure.docx`.

Shares one Supabase project and one Stripe account with `../website/` — see
`../PRIVI_Backend_Schema_Reference.md` before touching auth, member data or
billing.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` to `.env.local` and fill in the same Supabase/Stripe
values used by `website/.env.local` (same project, same account).
