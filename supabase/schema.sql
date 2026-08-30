-- Privi Admin Portal schema addition — run this once in the Supabase SQL
-- Editor (Project > SQL Editor > New query, paste, Run), AFTER
-- website/supabase/schema.sql has already been applied to this project.
--
-- This is the SAME Supabase project as website/ (PRIVI_Backend_Schema_Reference.md).
-- This file only ADDS to that schema — it never touches public.profiles,
-- public.return_to_app_tokens, or the handle_new_user() trigger, all of
-- which are website-owned and already deployed.

-- Admin/staff identity table. An auth.users row is only ever treated as an
-- admin if a matching row exists here — RLS grants zero access to anon/
-- authenticated roles (no policies below), so only server-side code using
-- the service_role key can read or write it. Same zero-policy pattern as
-- public.return_to_app_tokens.
--
-- Note: creating the auth.users row for an admin (see README bootstrap
-- steps) still fires website's handle_new_user() trigger and creates an
-- unused public.profiles row alongside this one — harmless, expected, not
-- worth special-casing in a trigger that website owns and depends on.
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  failed_login_count integer not null default 0,
  locked_until timestamptz
);

alter table public.admin_users enable row level security;
-- Intentionally no policies — service_role-only access.

-- Simplified activity log (Admin_Portal_Structure.docx Section 11: "a
-- single chronological activity log — what changed, when, on which record
-- ... No old-value/new-value diffing"). Every admin mutation across the
-- portal (business/location/offer/member/notification changes) writes one
-- row here via src/lib/activity/log.ts. Doubles as Dashboard's "Recent
-- activity" (Section 2.3) once the Dashboard is built.
--
-- admin_email/entity_label are deliberately denormalized snapshots (not
-- joins) so log entries stay readable even if the admin account or the
-- record itself is later deleted/archived/renamed.
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete set null,
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_log enable row level security;
-- Intentionally no policies — service_role-only access, same pattern as
-- admin_users.

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

-- Business categories (Admin_Portal_Structure.docx Section 12: "add/edit/
-- order/activate/deactivate, icon assignment"). Founder-managed — this
-- table is seeded once from category_icons/categories.json (13 initial
-- categories with real commissioned icons), then the admin CRUD screen is
-- the operational source of truth from there. `slug` doubles as the icon
-- filename: /category-icons/svg/{slug}.svg and /category-icons/png/{size}/{slug}.png.
--
-- Unlike admin_users/admin_activity_log, this IS publicly readable — it's
-- non-sensitive reference data the App and Website will need to query
-- directly (with the anon key) to show category browsing to members, per
-- the shared-Supabase-project architecture. Admin mutations still go
-- through the service_role client as usual, regardless of this policy.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Anyone can view active categories"
  on public.categories for select
  using (is_active = true);

-- System-wide config (Admin_Portal_Structure.docx Section 12: "Offer/
-- redemption configuration: default expiry-warning period", "App links",
-- "Support details"). Singleton row (id is always 1) — this is one
-- settings form, not a list. Offer types and redemption methods
-- (Code/Barcode only) are NOT here — they're a fixed list from the product
-- spec, not something the founder edits, so they live as constants in
-- src/lib/offer-config.ts instead.
create table if not exists public.system_settings (
  id integer primary key default 1 check (id = 1),
  default_expiry_warning_days integer not null default 7,
  help_faq_url text,
  privacy_policy_url text,
  terms_url text,
  subscription_terms_url text,
  member_rules_url text,
  app_store_url text,
  google_play_url text,
  support_email text,
  business_contact_email text,
  privacy_contact_email text,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id) values (1) on conflict (id) do nothing;

alter table public.system_settings enable row level security;
-- Intentionally no policies — service_role-only. Unlike categories, these
-- are operational/legal contact points the app can be built to reference
-- via its own server-side code rather than needing direct public read
-- access from client apps.

-- Business Management + Locations (Admin_Portal_Structure.docx Sections 3
-- & 4; Privi_updated.docx Phase 4.1 "Business Onboarding"). Founder-
-- onboarded only — businesses never self-register.
--
-- National businesses use a single business record — identity/contact
-- fields live here ONCE; per-location detail (address, phone,
-- participation status) lives in business_locations below, added via
-- "Add Location" rather than duplicating the business record.
--
-- status reuses the common draft/active/inactive/archived vocabulary from
-- src/lib/status.ts (StatusBadge/STATUS_TONE need no changes). Publicly
-- readable (anon key) for active rows only, same reasoning as
-- public.categories: the future App/Website need to query live businesses
-- directly. Admin mutations still always go through the service_role
-- client regardless of this policy.
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text,
  logo_url text,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  is_accessible boolean not null default false,
  -- Founder-only notes, never surfaced to the App — the "internal admin
  -- fields" item from Admin_Portal_Structure.docx Section 3.
  internal_notes text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "Anyone can view active businesses"
  on public.businesses for select
  using (status = 'active');

create index if not exists businesses_status_idx on public.businesses (status);

-- Many-to-many business <-> category assignment (category_icons/README.md:
-- "a business can be assigned more than one category" — not a single fk
-- column on businesses).
create table if not exists public.business_categories (
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (business_id, category_id)
);

alter table public.business_categories enable row level security;

create policy "Anyone can view categories for active businesses"
  on public.business_categories for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_categories.business_id
        and b.status = 'active'
    )
  );

create index if not exists business_categories_category_id_idx
  on public.business_categories (category_id);

-- Per-location detail for a business (Admin_Portal_Structure.docx Section
-- 4). A national business adds many rows here under one businesses row
-- instead of duplicating identity fields. location_type is a fixed list
-- from the product spec (same pattern as src/lib/offer-config.ts's
-- OFFER_TYPES/REDEMPTION_METHODS — constants in src/lib/locations/config.ts,
-- not admin-editable).
--
-- Coordinates are nullable — online_only/national locations may have no
-- single pin. geocode_status records how lat/lng were obtained, surfaced
-- in the admin UI as an invalid-coordinate warning — it never blocks save.
create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text,
  location_type text not null
    check (location_type in (
      'physical', 'online_only', 'national', 'regional', 'mobile', 'service_area'
    )),
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postcode text,
  country text,
  formatted_address text,
  latitude double precision,
  longitude double precision,
  geocode_status text not null default 'pending'
    check (geocode_status in ('pending', 'ok', 'failed', 'manual')),
  phone text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_locations enable row level security;

create policy "Anyone can view active locations of active businesses"
  on public.business_locations for select
  using (
    status = 'active'
    and exists (
      select 1 from public.businesses b
      where b.id = business_locations.business_id
        and b.status = 'active'
    )
  );

create index if not exists business_locations_business_id_idx
  on public.business_locations (business_id);
create index if not exists business_locations_status_idx
  on public.business_locations (status);

-- Storage bucket for business logos, uploaded via the admin portal (not a
-- URL field — businesses hand over an image file, not a hosted link).
-- Public read (the App/Website need to display logos directly); all writes
-- go through the service_role client from Server Actions, which bypasses
-- Storage RLS entirely, so no insert/update policy is needed here.
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy "Public read access to business logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

-- Offer Management (Admin_Portal_Structure.docx Section 5; Privi_updated.docx
-- Phase 4.3/3.5). "Scheduled" and "expired" are never stored — they're
-- computed at read time in src/lib/offers/queries.ts from status +
-- start_date/expiry_date, so no background job is needed to flip anything.
-- value_summary/terms/availability are deliberately free text rather than
-- structured per-offer-type fields — see the task #6 plan for reasoning.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  value_summary text,
  offer_type text not null
    check (offer_type in (
      'percentage_discount', 'fixed_amount_discount', 'fixed_member_price',
      'bundle', 'bogo', 'free_item', 'upgrade'
    )),
  terms text,
  availability text,
  redemption_method text not null
    check (redemption_method in ('discount_code', 'barcode')),
  redemption_value text,
  location_scope text not null default 'all'
    check (location_scope in ('all', 'selected', 'online', 'national', 'regional')),
  start_date date,
  expiry_date date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offers enable row level security;

-- Publicly readable once actually live AND not past its own expiry date —
-- computed-expired offers should stop appearing to the App/Website even
-- though the admin portal still shows them (as history) until archived.
create policy "Anyone can view active, unexpired offers of active businesses"
  on public.offers for select
  using (
    status = 'active'
    and (expiry_date is null or expiry_date >= current_date)
    and (start_date is null or start_date <= current_date)
    and exists (
      select 1 from public.businesses b
      where b.id = offers.business_id and b.status = 'active'
    )
  );

create index if not exists offers_business_id_idx on public.offers (business_id);
create index if not exists offers_status_idx on public.offers (status);

-- Used only when location_scope = 'selected'. For all/online/national/
-- regional, eligible locations are computed from the business's own
-- locations by location_type at read time — nothing to denormalise here.
create table if not exists public.offer_locations (
  offer_id uuid not null references public.offers(id) on delete cascade,
  location_id uuid not null references public.business_locations(id) on delete cascade,
  primary key (offer_id, location_id)
);

alter table public.offer_locations enable row level security;

create policy "Anyone can view offer_locations for visible offers"
  on public.offer_locations for select
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_locations.offer_id and o.status = 'active'
    )
  );

-- Member Management (Admin_Portal_Structure.docx Section 6) — additive
-- columns only on the EXISTING, website-owned public.profiles table (see
-- PRIVI_Backend_Schema_Reference.md). Never touches first_name/last_name/
-- preferred_area/stripe_customer_id/subscription_status/subscription_plan
-- or the handle_new_user() trigger.
--
-- is_suspended is a denormalized display cache of Supabase Auth's real
-- ban state (auth.admin.updateUserById ban_duration) — actual sign-in
-- enforcement is the real ban, this column just avoids an admin-API round
-- trip per row on the member list.
alter table public.profiles
  add column if not exists is_complimentary boolean not null default false,
  add column if not exists complimentary_reason text,
  add column if not exists complimentary_expires_at timestamptz,
  add column if not exists admin_notes text,
  add column if not exists is_suspended boolean not null default false;

-- Notifications (Admin_Portal_Structure.docx Section 8b — in-app only;
-- Section 8a transactional emails are fully automatic and never touch the
-- admin portal). "Send" here computes and snapshots the target audience —
-- there's no App yet to actually deliver anything to; this table is the
-- shared contract the App will read from once it exists. "Schedule" is
-- informational only (no cron/background job exists to auto-trigger it,
-- same constraint already solved for offers in task #6).
--
-- Service-role-only, unlike categories/businesses/offers — matching a
-- notification to the right subset of members (audience type, radius,
-- individual target) is real server-side logic, not a simple "is this row
-- active" boolean the anon key could safely filter on.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  notification_type text not null default 'general'
    check (notification_type in ('new_business', 'new_offer', 'offer_ending_soon', 'general', 'new_location')),
  linked_business_id uuid references public.businesses(id) on delete set null,
  linked_offer_id uuid references public.offers(id) on delete set null,
  audience_type text not null
    check (audience_type in ('all', 'monthly', 'annual', 'complimentary', 'area', 'individual')),
  audience_member_id uuid references auth.users(id) on delete set null,
  audience_radius_miles integer default 20,
  audience_reference_business_id uuid references public.businesses(id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sent', 'cancelled', 'failed')),
  sent_at timestamptz,
  targeted_count integer,
  sent_count integer,
  failed_count integer,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
-- Intentionally no policies — service_role-only access.

create index if not exists notifications_status_idx on public.notifications (status);

-- 2026-08-13: existing production tables predate 'new_location' — this
-- table's own `create table if not exists` above is a no-op once the
-- table already exists, so the constraint needs updating explicitly too.
-- Default Postgres-generated name for an unnamed column check constraint.
alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check
  check (notification_type in ('new_business', 'new_offer', 'offer_ending_soon', 'general', 'new_location'));

-- Which specific location(s) a 'new_location' notification targets —
-- mirrors offer_locations exactly (same table shape, same reasoning: a
-- business can have several locations, and a "new branch opened" or "new
-- offer here" notification/offer should only match members near the
-- SPECIFIC location(s) involved, not every branch the business has).
-- Added 2026-08-13 after confirming live that area-targeting a whole
-- business (audience_reference_business_id) matches ALL its locations —
-- correct for "new business"/general announcements, wrong for "this one
-- new branch opened".
create table if not exists public.notification_locations (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  location_id uuid not null references public.business_locations(id) on delete cascade,
  primary key (notification_id, location_id)
);

alter table public.notification_locations enable row level security;
-- Same service-role-only pattern as notifications itself — no policies.

-- PRIVI_Backend_Schema_Reference.md's "time-constraint/expiry field" — for
-- GPS-only members (no stored preferred_area), the future App checks active
-- campaigns live at next app-open and is expected to skip delivering
-- anything past this timestamp rather than showing stale/expired deals.
-- Members with a stored preferred_area get an immediate server-side radius
-- check instead (already unaffected by this field). Nullable/optional —
-- not every notification is time-sensitive (e.g. a new-business
-- announcement has no natural expiry).
alter table public.notifications add column if not exists expires_at timestamptz;

-- 2026-08-20: Account Alerts refinement. 'general' had no App toggle to
-- map to and no destination on tap — replaced by 'account_alert' (legal/
-- price/security, always delivered, App's locked "Account Alerts"
-- toggle) and 'announcement' (app updates etc., also always delivered,
-- no dedicated toggle). 'general' itself stays valid here (existing rows
-- keep working, RPC still returns them unfiltered) but is retired from
-- the admin form's own type list — nothing new gets created with it.
alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check
  check (notification_type in
    ('new_business', 'new_offer', 'offer_ending_soon', 'general', 'new_location', 'account_alert', 'announcement'));

-- Account Alerts sometimes need the member to actually do something, not
-- just read something — a failed payment needs an "Update Payment
-- Method" button, a T&Cs change needs an explicit "I Accept" the founder
-- can point to as evidence rather than silent acceptance from opening a
-- popup. One optional action button covers both: requires_acknowledgement
-- decides whether tapping it records acceptance (via
-- acknowledge_notification() below) or just navigates to
-- action_destination. document_url is independent of both — any Account
-- Alert can optionally link out to something to read (opened via the
-- App's existing expo-web-browser pattern, not an in-app copy of the
-- content).
alter table public.notifications add column if not exists requires_acknowledgement boolean not null default false;
alter table public.notifications add column if not exists document_url text;
alter table public.notifications add column if not exists action_label text;
alter table public.notifications add column if not exists action_destination text;

-- Fixed set of known in-app routes, not a free-text URL — matches how
-- every router.push(...) call in the App is a plain string literal, never
-- a dynamic/admin-supplied path. 'personal_information' is the only
-- destination that exists right now (there's no dedicated Billing
-- screen — Personal Information is where "Manage Subscription" already
-- lives); extend this list, not the field's shape, when a second real
-- destination shows up.
alter table public.notifications drop constraint if exists notifications_action_destination_check;
alter table public.notifications add constraint notifications_action_destination_check
  check (action_destination is null or action_destination in ('personal_information'));

-- Acknowledgement audit trail — a deliberate, scoped exception to
-- notificationReads.ts's "no server-side tracking of what a member does
-- with a notification" design (App repo). Everything else about a
-- notification tap stays exactly as local-only as it's always been; this
-- table only ever records the acceptance event itself (who, which
-- notification, when) for account_alert rows that require it, nothing
-- about what else the member does. Member-writable via the
-- security-definer RPC below rather than a direct RLS policy, matching
-- notifications' own service-role-only philosophy.
create table if not exists public.notification_acknowledgements (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (notification_id, member_id)
);
alter table public.notification_acknowledgements enable row level security;
-- No policies — writes go through acknowledge_notification() only.

create or replace function public.acknowledge_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_acknowledgements (notification_id, member_id)
  values (p_notification_id, auth.uid())
  on conflict (notification_id, member_id) do nothing;
end;
$$;
grant execute on function public.acknowledge_notification(uuid) to authenticated;

-- Task #10 (Dashboard). Deletion requests aren't a self-service in-app
-- flow (Section 9 removed ticket-raising entirely) — they arrive as an
-- email to the privacy contact address, outside any table. This is a
-- manual flag the admin sets on the member record on receiving one, so it
-- surfaces on the Dashboard's Action Centre as a to-do until actioned
-- (delete/anonymise, both already built in task #7).
alter table public.profiles add column if not exists deletion_requested_at timestamptz;

-- Task #11 (Settings) — makes the previously-hardcoded security constants
-- (src/lib/auth/constants.ts) admin-editable, per Section 13's "session
-- timeout, security settings". Time zone/date format were deliberately
-- NOT added — nothing in the app currently renders dates per-timezone or
-- per-format (everything uses browser-local formatting), so stored-but-
-- inert settings fields would be worse than not having them.
alter table public.system_settings add column if not exists session_timeout_minutes integer not null default 30;
alter table public.system_settings add column if not exists max_failed_login_attempts integer not null default 5;
alter table public.system_settings add column if not exists lockout_minutes integer not null default 15;

-- Admin_Portal_Structure.docx Section 12: member-facing search is scoped to
-- match "business name, category, and the description/search-keyword tags
-- assigned per business" — this column is that missing keyword-tags field
-- (task #4/#5 built categories and short_description but never actually
-- added this). Free-text, comma-separated, admin-authored — e.g. a golf
-- venue might carry "golf, driving range, mini golf, family fun" so a
-- member searching "golf" finds it even though "golf" isn't in the
-- business name. The future App's search should match against this column
-- (ILIKE/full-text) alongside name and category — no fuzzy matching per
-- spec, just literal substring matching across a wider field.
alter table public.businesses add column if not exists search_keywords text;

-- New feature, founder-requested (2026-07-27): season/announcement banner,
-- shown at the top of the App's home feed. Public-read (App members read
-- this with the anon key, same "Anyone can view active X" pattern as
-- categories/businesses/offers) — unlike notifications this has no
-- per-member targeting logic, it's the same content for everyone.
create table if not exists public.season_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  is_active boolean not null default false,
  action_type text not null default 'none'
    check (action_type in ('none', 'categories', 'external_link')),
  -- Only used when action_type = 'external_link' — opened in the App's
  -- in-app browser (same mechanism as the Help Centre link), not limited
  -- to legal pages even though that's the common case.
  action_url text,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.season_banners enable row level security;

create policy "Anyone can view active season banners"
  on public.season_banners for select
  using (is_active = true);

-- Only used when action_type = 'categories' — which category/categories
-- tapping the banner should filter to. Same join-table shape as
-- business_categories.
create table if not exists public.season_banner_categories (
  banner_id uuid not null references public.season_banners(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (banner_id, category_id)
);

alter table public.season_banner_categories enable row level security;

create policy "Anyone can view season_banner_categories for visible banners"
  on public.season_banner_categories for select
  using (
    exists (
      select 1 from public.season_banners b
      where b.id = season_banner_categories.banner_id and b.is_active = true
    )
  );

-- New feature, founder-requested (2026-07-27): pin a business to the top
-- of the App's business list. Two tiers: 'category' pins it only within
-- lists filtered to a category it belongs to; 'global' pins it everywhere
-- regardless of category filter. featured_at is set only when
-- featured_level actually changes (see updateBusinessAction) — not on
-- every edit — so multiple featured businesses have a stable "most
-- recently featured first" order without needing a separate manual
-- ordering field.
alter table public.businesses add column if not exists featured_level text not null default 'none'
  check (featured_level in ('none', 'category', 'global'));
alter table public.businesses add column if not exists featured_at timestamptz;

-- App's Business Page (12 Busines Page Screen mockup, 2026-07-29) needs
-- an ABOUT paragraph that short_description doesn't cover —
-- short_description is the one-line descriptor shown right under the
-- business name ("Italian coffee house"), about_description is the
-- longer paragraph shown further down under its own "ABOUT" heading.
alter table public.businesses add column if not exists about_description text;

-- Per-location website and opening hours — a national business can have
-- a different site (and different hours) per location, so both live on
-- business_locations, not businesses. website_url briefly lived on
-- businesses instead (2026-07-29) but moved here before any real
-- business data used it, once it became clear every business adds at
-- least one location anyway and multi-location businesses genuinely can
-- have distinct per-site websites. opening_hours is structured per
-- weekday (jsonb keyed 'mon'..'sun', each {open:"HH:MM", close:"HH:MM",
-- closed:boolean}) rather than free text, so the App can compute "Open
-- today 7:00am – 8:00pm" / "Closed today" itself instead of the admin
-- having to keep that phrasing in sync by hand every day. Both nullable —
-- a location missing either just doesn't show that row on the Business
-- Page.
alter table public.businesses drop column if exists website_url;
alter table public.business_locations add column if not exists website_url text;
alter table public.business_locations add column if not exists opening_hours jsonb;

-- Same reasoning as website_url/opening_hours above, found 2026-08-14: a
-- national business can have SOME accessible locations and some that
-- aren't (e.g. 2 of 5 branches) — a single whole-business is_accessible
-- flag can't represent that without being actively misleading either way
-- (ticking it implies every location is accessible; leaving it unticked
-- hides the genuinely accessible branches from the App's "Accessible"
-- filter entirely). Moves to business_locations so each location states
-- its own truth. The App's accessibility filter now checks the SPECIFIC
-- location a member would actually be matched to (nearest one), not a
-- blanket business-wide value — see app/src/services/businesses.ts.
alter table public.businesses drop column if exists is_accessible;
alter table public.business_locations add column if not exists is_accessible boolean not null default false;

-- Found 2026-08-17: redemption_method (discount_code/barcode) says HOW a
-- code is presented, but nothing said WHERE it can be used — a business
-- with a physical location can still take bookings/orders online, and a
-- member should be able to tell that from the offer without emailing to
-- ask. Deliberately separate from redemption_method (which the original
-- spec scoped to exactly 2 system values, see offer-config.ts comment) —
-- this is a new, distinct axis, not an extension of that one. Defaults to
-- 'in_store' so every existing offer keeps behaving exactly as it does
-- today (in-person redemption, as the App has always assumed).
alter table public.offers add column if not exists redeem_where text not null default 'in_store'
  check (redeem_where in ('in_store', 'online', 'both'));

-- Featured placement is now a real paid product (2026-08-19), not just a
-- founder-flipped flag — featured_level/featured_at alone had no way to
-- represent a PAID TERM (1 or 3 months) ending. featured_expires_at is
-- the term's end date; NULL means "not on a term" (shouldn't happen once
-- a business is actually featured via the dedicated Featured control, but
-- kept nullable rather than adding a not-null constraint that would break
-- any business already featured before this column existed). Computed
-- read-time expiry (same pattern as offers' effectiveStatus — see
-- src/lib/businesses/queries.ts effectiveFeaturedLevel) means a lapsed
-- term naturally stops boosting the business in the App even if nobody
-- manually resets featured_level back to 'none' — the founder doesn't
-- have to remember on the exact day.
alter table public.businesses add column if not exists featured_expires_at timestamptz;

-- Permanent ledger for accounting/invoice cross-referencing (2026-08-19)
-- — businesses.featured_level/featured_expires_at only ever hold the
-- CURRENT state, so clearing a business's featured placement loses the
-- record entirely (exactly the moment the founder needs it, to
-- reconcile what was actually paid). This is append-only: a new row per
-- set/renew, never updated or deleted, independent of whatever the
-- business's live featured status is now.
create table if not exists public.featured_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  featured_level text not null check (featured_level in ('category', 'global')),
  duration_months integer not null,
  amount_charged numeric(10,2),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.featured_history enable row level security;
-- Intentionally no policies — service_role-only, same pattern as
-- admin_users/admin_activity_log/system_settings/notifications.

create index if not exists featured_history_business_idx on public.featured_history (business_id);

-- Business Applications (2026-08-19) — a restricted-field alternative to
-- an open "contact us" box, so businesses can approach Privi directly
-- without it becoming a support/complaints inbox. The public website
-- form (not built yet) will insert here; this schema + the Admin
-- Portal's tracking board are built first. Pipeline stages are
-- deliberately just labels on a text column, not a rigid state machine —
-- easy to rename/reorder later without a migration.
create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  category_id uuid references public.categories(id) on delete set null,
  location_type text not null default 'single'
    check (location_type in ('single', 'multi')),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  message text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'contacted', 'signed_up', 'declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_applications enable row level security;

-- Public can INSERT (the eventual website form submits without being
-- logged in) but never read/update/delete — same shape as offer_locations
-- style public-write-only tables. Admin Portal reads/writes via the
-- service_role client, which bypasses RLS entirely, same as everywhere
-- else in this project.
create policy "Anyone can submit a business application"
  on public.business_applications for insert
  with check (true);

create index if not exists business_applications_status_idx on public.business_applications (status);

-- Business Application Statuses (2026-08-18) — turns the Kanban board's
-- pipeline columns from a hardcoded list into an admin-editable one,
-- same pattern as categories (own table, display_order, is_active soft-
-- remove — never a hard delete of something that might be referenced).
-- No RLS policies: service_role-only, same as notifications/system_settings
-- — this is internal board config, nothing public-facing ever reads it.
create table if not exists public.business_application_statuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_application_statuses enable row level security;

insert into public.business_application_statuses (slug, label, display_order) values
  ('new', 'New', 1),
  ('reviewing', 'Reviewing', 2),
  ('contacted', 'Contacted', 3),
  ('signed_up', 'Signed up', 4),
  ('declined', 'Declined', 5)
on conflict (slug) do nothing;

-- Swap the fixed check constraint for a real foreign key against the new
-- table, so status can be any admin-defined slug, not just the original 5.
alter table public.business_applications
  drop constraint if exists business_applications_status_check;

alter table public.business_applications
  add constraint business_applications_status_fkey
  foreign key (status) references public.business_application_statuses (slug);

-- Featured Payment Tracking (2026-08-18) — a simple "invoiced, waiting to
-- be paid" tracker for Featured Placement deals. Deliberately separate
-- from featured_history (the real earnings ledger): that table only ever
-- records money for a placement actually switched on for a real business,
-- while this one exists precisely because there's a gap between agreeing
-- a deal/sending an invoice and the business actually paying. Never rolled
-- into any revenue total for the same reason MRR/ARR were split earlier
-- this session — pending and collected money must never blend into one
-- figure. business_name is free text (not a businesses FK) since a deal
-- can be invoiced before the business is even a record in this portal.
create table if not exists public.featured_payment_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  -- Optional — set when the business already exists as a real record, so
  -- "Mark paid" can also activate Featured in one click instead of
  -- re-entering the same tier/duration/amount a second time on the
  -- business's own edit page. Null is fine (and expected) when a deal is
  -- agreed before the business has been added to the portal yet.
  business_id uuid references public.businesses (id) on delete set null,
  featured_level text not null
    check (featured_level in ('category', 'global')),
  duration_months integer not null
    check (duration_months in (1, 3)),
  amount_gbp numeric(10, 2) not null,
  invoice_number text,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.featured_payment_requests enable row level security;
-- No policies — service_role-only, same pattern as notifications/
-- business_application_statuses. Purely internal, nothing public reads it.

create index if not exists featured_payment_requests_status_idx
  on public.featured_payment_requests (status);

-- App search: fuzzy/typo tolerance (2026-08-23) — the App's search bar
-- (HomeScreen.tsx) matches business name, its own admin-tagged
-- search_keywords, the town of any of its active locations, and its
-- category's label. Exact substring matching already covers "does the
-- term appear somewhere in there" (unchanged, still the app's own first
-- pass); this adds a real typo-tolerance layer on top — e.g. "helth"
-- still finding "Health & Fitness" — using pg_trgm's word_similarity(),
-- built specifically for "does this short search term approximately
-- match a WORD within a longer field," unlike plain trigram
-- similarity() which compares whole-string closeness and penalises
-- length mismatches (a 4-letter term against a 20-letter business name
-- would score low even for an exact substring match).
--
-- Deliberately does NOT attempt synonym matching ("car" finding
-- "Automotive," "shops" finding "Retail") — fuzzy matching only closes
-- typo-distance between similar-LOOKING words, it can't connect two
-- genuinely different words that happen to mean the same thing. That's
-- what businesses.search_keywords already exists for, per-business (tag
-- a business "car, vehicle, motor" and "car" finds it) — confirmed with
-- the founder 2026-08-23 to rely on that rather than build a separate
-- category-level synonym feature for now.
--
-- Runs as the calling role (no security definer) — all four tables
-- already have public "Anyone can view..." SELECT policies (same ones
-- the App's own direct queries already rely on), so this needs no
-- elevated privilege.
--
-- 0.4 word_similarity threshold is a reasonable starting point (0=no
-- match, 1=exact), not a final tuned value — same "best-effort, revisit
-- once seen for real" caveat as every other exact numeric choice in this
-- codebase. Loosen it if real typos are still slipping through; tighten
-- it if irrelevant results start showing up.
create extension if not exists pg_trgm;

create or replace function public.search_businesses(search_term text)
returns table (business_id uuid)
language sql
stable
as $$
  select distinct b.id as business_id
  from public.businesses b
  left join public.business_locations bl
    on bl.business_id = b.id and bl.status = 'active'
  left join public.business_categories bc
    on bc.business_id = b.id
  left join public.categories c
    on c.id = bc.category_id
  where b.status = 'active'
    and (
      b.name ilike '%' || search_term || '%'
      or b.search_keywords ilike '%' || search_term || '%'
      or bl.city ilike '%' || search_term || '%'
      or c.label ilike '%' || search_term || '%'
      or word_similarity(search_term, b.name) > 0.4
      or word_similarity(search_term, coalesce(b.search_keywords, '')) > 0.4
      or word_similarity(search_term, coalesce(bl.city, '')) > 0.4
      or word_similarity(search_term, coalesce(c.label, '')) > 0.4
    );
$$;

grant execute on function public.search_businesses(text) to anon, authenticated;

-- Trigram indexes — not critical at current business counts (fetchBusinesses'
-- own comment already notes "modest number of businesses expected at
-- launch"), but cheap to add now and will matter once the table grows
-- large enough for a sequential scan per search to be felt.
create index if not exists businesses_name_trgm_idx
  on public.businesses using gin (name gin_trgm_ops);
create index if not exists businesses_search_keywords_trgm_idx
  on public.businesses using gin (search_keywords gin_trgm_ops);
create index if not exists business_locations_city_trgm_idx
  on public.business_locations using gin (city gin_trgm_ops);
create index if not exists categories_label_trgm_idx
  on public.categories using gin (label gin_trgm_ops);

-- Per-location Featured pricing (2026-08-23). Founder invoices Featured
-- Placement per site for a multi-location business (e.g. 10 branches ×
-- rate), so the admin needs to record WHICH of a business's locations are
-- actually the featured ones, not just a business-wide flag. Mirrors
-- offer_locations/notification_locations exactly (same shape, same
-- reasoning) — featured_location_scope is the businesses-row equivalent
-- of offers.location_scope ('all' | 'selected'; no online/national/
-- regional here, those are offer-redemption concepts, not applicable to
-- Featured). Both live on the business's CURRENT term, same as
-- featured_level/featured_at/featured_expires_at — activateFeaturedPlacement
-- and clearFeaturedAction (src/lib/featured/activate.ts,
-- src/app/(admin)/featured/actions.ts) reset them on every renew/clear, the
-- same as those columns, so a stale selection never leaks into an
-- unrelated later term.
alter table public.businesses
  add column if not exists featured_location_scope text not null default 'all'
    check (featured_location_scope in ('all', 'selected'));

create table if not exists public.featured_locations (
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid not null references public.business_locations(id) on delete cascade,
  primary key (business_id, location_id)
);

alter table public.featured_locations enable row level security;

create policy "Anyone can view featured_locations for featured businesses"
  on public.featured_locations for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = featured_locations.business_id and b.featured_level <> 'none'
    )
  );

create index if not exists featured_locations_business_id_idx
  on public.featured_locations (business_id);

-- Season banner scheduling (2026-08-23). Previously the only control was
-- a manual is_active on/off — no way to pre-load the year's recurring
-- dates (Easter, Mother's Day, Father's Day, Christmas...) and have each
-- one switch itself on and off automatically. starts_at/ends_at are
-- optional (a banner with neither behaves exactly as before — on
-- whenever is_active is true, until someone flips it off by hand).
-- Whether a banner is CURRENTLY effectively active is computed here in
-- the RLS policy itself, the same "check against now() at read time"
-- approach featured_expires_at already uses — no scheduled job needed,
-- and the App's own query (src/services/banners.ts, unchanged) doesn't
-- need to know anything changed.
alter table public.season_banners
  add column if not exists starts_at date,
  add column if not exists ends_at date;

drop policy if exists "Anyone can view active season banners" on public.season_banners;

create policy "Anyone can view active season banners"
  on public.season_banners for select
  using (
    is_active = true
    and (starts_at is null or starts_at <= current_date)
    and (ends_at is null or ends_at >= current_date)
  );

-- App Data → Settings gains one more app-link field, same pattern as
-- subscription_terms_url/member_rules_url above — the App's Referrals
-- screen (website/supabase/schema.sql owns the actual referral
-- programme tables/logic) links out to this URL for the full terms,
-- exactly like every other legal document the App itself never hosts.
alter table public.system_settings
  add column if not exists referral_terms_url text;

-- 2026-08-24: the App's own links (Help Centre, Referral Terms, etc.)
-- were hardcoded in its source instead of reading these fields live —
-- a Settings change here had no effect in the App until a new build.
-- system_settings itself stays service-role-only (session_timeout_
-- minutes/max_failed_login_attempts/lockout_minutes are Admin Portal
-- security config, never meant to be public), so a narrow view exposes
-- just the fields the App is actually allowed to read — a plain view
-- (not security_invoker) runs as its owner, which is how it can read
-- through system_settings' RLS while the App's own anon key still can't
-- query the base table directly.
create or replace view public.app_links as
select
  help_faq_url,
  privacy_policy_url,
  terms_url,
  subscription_terms_url,
  member_rules_url,
  referral_terms_url,
  support_email
from public.system_settings
where id = 1;

grant select on public.app_links to anon, authenticated;

-- Offer misuse reporting (2026-08-27, Procedures Manual §6 follow-up).
-- Members have no other line to Privi (see that section's "businesses
-- only" complaint scoping) — this is the one narrow exception, and it's
-- deliberately NOT a raw one-tap "report" button: the App only ever
-- calls report_offer() after the member picks a specific reason from a
-- short list, which is real friction against an idle/malicious tap.
--
-- No location_id here — deliberate. Redemption codes/barcodes are shown
-- to the business with nothing else tracked around their use (founder's
-- original design intent, so nothing ever impedes actually using a
-- code), so there's no record of which of a multi-location business's
-- sites a member was even at. Reports are scoped to the business as a
-- whole, not a specific location, for the same reason there's no
-- redemption-volume data to rate a threshold against — a flat count is
-- what the data actually supports (founder's original "5 strikes" idea,
-- kept as-is rather than a rate this data can't compute).
--
-- Service-role-only, same shape as notification_acknowledgements: no
-- select/insert policy for anon/authenticated, the security-definer RPC
-- below is the one sanctioned write path, and the Admin Portal (service
-- role) is the one sanctioned reader.
create table if not exists public.offer_reports (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  reason text not null
    check (reason in ('not_honoured', 'not_as_described', 'already_expired', 'other')),
  note text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_notes text,
  resolved_at timestamptz,
  resolved_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.offer_reports enable row level security;
-- Intentionally no policies — service_role-only reads (Admin Portal),
-- same pattern as admin_activity_log/admin_users. Writes go through
-- report_offer() only.

create index if not exists offer_reports_business_id_idx on public.offer_reports (business_id);
create index if not exists offer_reports_status_idx on public.offer_reports (status);

-- One open report per member per offer at a time — stops a single member
-- inflating the count by tapping repeatedly (they'd have to leave and
-- come back after a real admin review, not just retap). Only applies
-- while status = 'open'; once resolved, the same member could report
-- again if a genuinely new incident happened later.
create unique index if not exists offer_reports_member_offer_open_idx
  on public.offer_reports (member_id, offer_id) where status = 'open';

create or replace function public.report_offer(
  p_offer_id uuid,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id
  from public.offers
  where id = p_offer_id and status = 'active';

  if v_business_id is null then
    raise exception 'Offer not found or not active';
  end if;

  if p_reason not in ('not_honoured', 'not_as_described', 'already_expired', 'other') then
    raise exception 'Invalid reason';
  end if;

  insert into public.offer_reports (offer_id, business_id, member_id, reason, note)
  values (p_offer_id, v_business_id, auth.uid(), p_reason, nullif(trim(p_note), ''))
  on conflict (member_id, offer_id) where status = 'open' do nothing;
end;
$$;
grant execute on function public.report_offer(uuid, text, text) to authenticated;

-- Admin-editable flag threshold, same pattern as
-- default_expiry_warning_days — how many OPEN reports a business needs
-- before it surfaces on the Dashboard's Action Centre as worth a look.
-- Never an automatic suspension/removal at any count — purely a signal
-- into the same manual review process every other complaint goes through
-- (Procedures Manual §6 / Ops Manual §8).
alter table public.system_settings
  add column if not exists offer_report_flag_threshold integer not null default 5;

-- Pre-launch waitlist (2026-08-30). Sign-up is gated behind
-- NEXT_PUBLIC_SIGNUP_OPEN (website/src/lib/launch.ts) until the App and
-- Stripe are actually live — this is where /signup collects an email
-- instead of creating a real account while that flag is off. Same
-- public-write-only shape as business_applications: anyone can insert,
-- nobody but service_role (Admin Portal / a future export) can read.
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist_signups for insert
  with check (true);

-- Case-insensitive uniqueness — resubmitting the same address (typos in
-- casing aside) should never create duplicate rows to email later.
create unique index if not exists waitlist_signups_email_lower_idx
  on public.waitlist_signups (lower(email));

-- Anniversary reward (2026-08-30). subscription_started_at marks the
-- start of the member's CURRENT unbroken paid stretch — set by the
-- website's Stripe webhook on every genuine first payment (see that
-- file's own comment), which naturally resets on a cancel-then-
-- resubscribe rather than counting from the original account creation
-- date. Complimentary time never touches this field, so it never counts
-- toward the 12 months either — both were explicit founder requirements.
-- last_anniversary_reward_at records when a credit was last actually
-- given, so the reward can recur every 12 months of continued paid
-- tenure without double-firing on the same anniversary.
alter table public.profiles
  add column if not exists subscription_started_at timestamptz,
  add column if not exists last_anniversary_reward_at timestamptz;

-- Admin-editable, OFF by default — the reward mechanism is built and
-- ready but must not actually fire (no credits, no emails) until the
-- founder has reviewed and approved the email/notification copy. Same
-- "ship the plumbing, flip it on later" pattern as offer_report_flag_
-- threshold.
alter table public.system_settings
  add column if not exists anniversary_rewards_enabled boolean not null default false;
