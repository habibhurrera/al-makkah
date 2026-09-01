-- ============================================================================
-- AL-MAKKAH — Row Level Security
-- ----------------------------------------------------------------------------
-- Defence in depth. The application already refuses unauthorised writes
-- (src/server/auth.ts) and strips privileged fields from public input
-- (src/lib/validation/public.ts). These policies mean that even a bug in that
-- code, or a leaked anon key, cannot expose or alter data from the database
-- side.
--
-- The app's own connection uses the Postgres role that owns these tables and is
-- NOT subject to RLS. These policies constrain the Supabase anon/authenticated
-- roles — that is, anyone holding the publishable anon key.
--
-- Apply AFTER the first `prisma migrate deploy`:
--   psql "$DIRECT_URL" -f prisma/sql/rls-policies.sql
-- ============================================================================

-- ---------------------------------------------------------------- helpers

-- True when the current Supabase user maps to an active AdminUser row.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from "AdminUser" a
    where a."authUserId" = auth.uid()::text
      and a."isActive" = true
  );
$$;

-- ---------------------------------------------------------------- enable RLS

alter table "Property"          enable row level security;
alter table "PropertyMedia"     enable row level security;
alter table "PropertyDocument"  enable row level security;
alter table "PropertyAmenity"   enable row level security;
alter table "Amenity"           enable row level security;
alter table "Area"              enable row level security;
alter table "Verification"      enable row level security;
alter table "SellerSubmission"  enable row level security;
alter table "Inquiry"           enable row level security;
alter table "Testimonial"       enable row level security;
alter table "AdminUser"         enable row level security;
alter table "AuditLog"          enable row level security;
alter table "SiteSetting"       enable row level security;

-- ------------------------------------------------------------ public reads
-- Anonymous visitors may read published listings and nothing else. Note this
-- covers rows, not columns: adminNotes and rejectionReason are excluded at the
-- query layer, which selects explicit column lists.

create policy "public reads published properties"
  on "Property" for select
  to anon, authenticated
  using (status = 'PUBLISHED');

create policy "public reads media of published properties"
  on "PropertyMedia" for select
  to anon, authenticated
  using (
    exists (
      select 1 from "Property" p
      where p.id = "PropertyMedia"."propertyId"
        and p.status = 'PUBLISHED'
    )
  );

create policy "public reads amenities of published properties"
  on "PropertyAmenity" for select
  to anon, authenticated
  using (
    exists (
      select 1 from "Property" p
      where p.id = "PropertyAmenity"."propertyId"
        and p.status = 'PUBLISHED'
    )
  );

create policy "public reads verification of published properties"
  on "Verification" for select
  to anon, authenticated
  using (
    exists (
      select 1 from "Property" p
      where p.id = "Verification"."propertyId"
        and p.status = 'PUBLISHED'
    )
  );

create policy "public reads active areas"
  on "Area" for select to anon, authenticated using ("isActive" = true);

create policy "public reads amenities"
  on "Amenity" for select to anon, authenticated using (true);

create policy "public reads published testimonials"
  on "Testimonial" for select to anon, authenticated using ("isPublished" = true);

create policy "public reads site settings"
  on "SiteSetting" for select to anon, authenticated using (true);

-- ------------------------------------------------------- deliberately closed
-- No policy is created for anon/authenticated on these tables, so with RLS
-- enabled every access is denied by default:
--
--   PropertyDocument  ownership papers and CNICs - admin only, ever
--   SellerSubmission  contains a member of the public's contact details
--   Inquiry           lead data
--   AuditLog          who did what, when
--   AdminUser         the admin roster
--
-- Public forms write through server routes on the privileged connection after
-- validation and rate limiting - never directly from the browser.

-- ---------------------------------------------------------------- admin access

create policy "admins read everything"        on "Property"         for select to authenticated using (public.is_active_admin());
create policy "admins write properties"       on "Property"         for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage media"           on "PropertyMedia"    for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage documents"       on "PropertyDocument" for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage propertyamenity" on "PropertyAmenity"  for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage amenities"       on "Amenity"          for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage areas"           on "Area"             for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage verification"    on "Verification"     for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage submissions"     on "SellerSubmission" for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage inquiries"       on "Inquiry"          for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage testimonials"    on "Testimonial"      for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage site settings"   on "SiteSetting"      for all    to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins read the roster"        on "AdminUser"        for select to authenticated using (public.is_active_admin());

-- The audit log is append-only even for admins: readable, never updated or
-- deleted through the API. A trail that can be edited is not a trail.
create policy "admins read audit log"   on "AuditLog" for select to authenticated using (public.is_active_admin());
create policy "admins append audit log" on "AuditLog" for insert to authenticated with check (public.is_active_admin());
