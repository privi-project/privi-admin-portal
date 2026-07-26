# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Shared backend

This project reads/writes the **same Supabase project and Stripe account** as `website/`. See `../PRIVI_Backend_Schema_Reference.md` before touching auth, member data, or billing — do not assume a fresh schema.
