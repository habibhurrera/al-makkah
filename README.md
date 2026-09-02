# Real Estate Platform

A white-label property platform for a single agency, built to be branded per client and deployed per client.

Not a brochure site. Four systems sharing one property engine:

| System | What it is |
|---|---|
| Marketing site | Home, contact — premium, architectural, trust-first |
| Video hero | A construction film rendered by a Remotion pipeline |
| Public marketplace | Buy and Rent, server-side search and filtering, SEO-indexable property pages |
| Private back office | Seller submissions, verification workflow, lead inbox, admin dashboard |

**Branding is data, not code.** One file — `src/lib/brand.ts` — carries the company name. Body copy is written in the first person throughout, so it reads correctly for any client without rewriting. See [CLIENT-SETUP.md](CLIENT-SETUP.md) for the onboarding runbook.

---

## Contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Commands](#commands)
4. [Architecture](#architecture)
5. [Data model](#data-model)
6. [Security model](#security-model)
7. [Tests](#tests)
8. [Admin accounts](#admin-accounts)
9. [How a property reaches the website](#how-a-property-reaches-the-website)
10. [The verification badge](#the-verification-badge)
11. [Media and storage](#media-and-storage)
12. [The hero film](#the-hero-film)
13. [The location map](#the-location-map)
14. [Design system](#design-system)
15. [Deployment](#deployment)
16. [Decisions and why](#decisions-and-why)
17. [What is not built yet](#what-is-not-built-yet)

---

## Quick start

Requires **Node 22 LTS**. Developed on Windows with PowerShell.

```bash
npm.cmd install
npm.cmd run dev
```

> **Windows note.** PowerShell 5.1 does not support `&&` as a command separator, and its
> execution policy usually blocks `npm.ps1`. Use `npm.cmd` rather than `npm`, and put each
> command on its own line or separate them with `;`.

The app runs at `http://localhost:3000`. The public site works without a database; anything
that reads or writes property data needs the environment configured below.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is gitignored and must never
be committed.

| Variable | Where it comes from | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Database → **Transaction pooler** | Port **6543**, keep `?pgbouncer=true` |
| `DIRECT_URL` | Same page → **Session pooler** | Port **5432** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role | **Server only.** Bypasses row-level security |
| `SUPABASE_BUCKET_MEDIA` | — | `property-media` |
| `SUPABASE_BUCKET_DOCUMENTS` | — | `property-documents` |
| `SUPABASE_BUCKET_SUBMISSIONS` | — | `submissions` |
| `NEXT_PUBLIC_SITE_URL` | — | Optional. Falls back to the Vercel production URL |
| `UPSTASH_REDIS_REST_URL` | Upstash → REST API | Optional. Without it, rate limits are per-instance |
| `UPSTASH_REDIS_REST_TOKEN` | Same page | Optional. Both must be set together |
| `RESEND_API_KEY` | Resend → API keys | Optional. Without it, no lead email is sent |
| `LEAD_NOTIFY_TO` | — | Optional. Comma-separated recipients |
| `LEAD_NOTIFY_FROM` | — | Optional. Must be a verified sending domain |
| `NEXT_PUBLIC_HERO_VIDEO_URL` | — | Optional. Defaults to `/hero/construction.mp4` |
| `NEXT_PUBLIC_HERO_POSTER_URL` | — | Optional. Defaults to `/hero/construction.jpg` |

Every optional group degrades to a working default. Nothing in the second half of that table
is required to run the site.

### Two gotchas that cost real time

**The legacy direct host does not resolve.** `db.<ref>.supabase.co` is IPv6-only on new
Supabase projects. On an IPv4 network it fails with `ENOTFOUND`. `DIRECT_URL` must use the
**session pooler** (`aws-0-<region>.pooler.supabase.com:5432`), not the legacy host.

**Do not hand-edit the placeholders.** The connection strings in the Supabase dashboard
already contain the project ref and region. Replace the whole line, then swap
`[YOUR-PASSWORD]` for the database password.

---

## Commands

| Command | What it does |
|---|---|
| `npm.cmd run dev` | Development server |
| `npm.cmd run build` | Production build |
| `npm.cmd test` | Run the test suite |
| `npm.cmd run test:watch` | Tests in watch mode |
| `npm.cmd run typecheck` | `tsc --noEmit` |
| `npm.cmd run lint` | ESLint |
| `npm.cmd run db:migrate` | Create and apply a migration (development) |
| `npm.cmd run db:deploy` | Apply migrations (production) |
| `npm.cmd run db:seed` | Seed 42 Hyderabad areas, 20 amenities, site settings |
| `npm.cmd run db:storage` | Create the three storage buckets, idempotent |
| `npm.cmd run db:studio` | Prisma Studio |
| `npm.cmd run admin:create` | Create an admin account |
| `npm.cmd run admin:manage` | List, deactivate, reactivate, rename, change password, delete |
| `npm.cmd run media:thumbnails` | Generate missing thumbnails for already-published images |

Row-level security policies are applied separately, after the first migration:

```bash
psql "$DIRECT_URL" -f prisma/sql/rls-policies.sql
```

---

## Architecture

```
src/
├─ app/
│  ├─ (public)/            Public site — its own layout with header and footer
│  │   ├─ page.tsx         Homepage
│  │   ├─ buy/ rent/       Marketplace, server-side filtered
│  │   ├─ sell/            Public property submission
│  │   ├─ contact/         Enquiry form plus configured contact channels
│  │   ├─ property/[slug]/ Property detail page
│  │   └─ styleguide/      Internal design-system review page (noindex)
│  ├─ admin/               Outside the public group, so it never renders public chrome
│  │   ├─ login/
│  │   ├─ submissions/     Review, approve, reject
│  │   ├─ properties/      List, publish, verify, feature
│  │   │   ├─ new/         Create a listing directly
│  │   │   ├─ [id]/edit/   Edit a listing
│  │   │   └─ [id]/media/  Gallery manager
│  │   ├─ leads/
│  │   └─ settings/        Contact details shown across the site
│  ├─ api/                 health · inquiries · seller-submissions · admin/property-media
│  ├─ robots.ts sitemap.ts
│  └─ globals.css          Design tokens
├─ components/
│  ├─ ui/                  Primitives — button, badge, card, field, states, layout
│  ├─ property/            Card, filters, results, location map
│  ├─ hero/                Video hero and its browser-only video layer
│  ├─ forms/               Inquiry form, seller form
│  ├─ admin/               Admin-only components
│  └─ layout/              Header, footer
├─ server/                 ALL database access lives here
│  ├─ auth.ts              requireAdmin, audit log
│  ├─ queries/             Read paths
│  ├─ actions/             Write paths (server actions)
│  └─ services/            Media upload and thumbnails, lead notifications
├─ lib/                    brand · db · supabase · storage · images · units ·
│                          validation · rate-limit · security/csp · hero-config · env
├─ proxy.ts                CSP nonce, session refresh, /admin redirect
└─ types/

tests/                     Vitest — validation, units, CSP, storage, rate limiting
../remotion/               Separate project that renders the hero film
```

**One rule shapes this layout:** components never import Prisma. Every database call goes
through `src/server/`, which is what stops an authorisation check being bypassed by an
accidental import into a component.

### Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL (Supabase) ·
Zod · Leaflet · Vitest · Vercel

---

## Data model

14 tables. The important ones:

| Table | Purpose |
|---|---|
| `Property` | The listing. Includes `areaValue` + `areaUnit` as entered, plus a derived `areaSqFt` |
| `Area` | Localities, admin-managed |
| `PropertyMedia` | Photos, video, floor plans — storage paths and thumbnail paths, never binaries |
| `PropertyDocument` | Ownership papers. Private bucket only, never public |
| `Verification` | The record behind the verified badge, with per-check booleans |
| `SellerSubmission` | Raw public submission, kept separate from `Property` |
| `Inquiry` | Every lead — buy, rent, sell, contact, viewing |
| `AdminUser` | Maps to a Supabase Auth user plus a role |
| `AuditLog` | Append-only trail of consequential admin actions |
| `SiteSetting` | Single row: the agency's phone, WhatsApp, email, address |

### Area units

Property here is quoted in square yards, marla, kanal and square feet interchangeably, so
the uploader picks the unit and the site displays it verbatim. Alongside it, `areaSqFt` is
derived on every write.

Without that derived column, "sort by largest" and the area filter would compare 2 kanal
against 400 sq ft as if they were the same scale — a bug that produces wrong results while
the page still looks correct. `areaSqFt` is recomputed on every create and every edit, and
the conversion table is covered by tests.

---

## Security model

Six independent layers. No single one is trusted alone.

**1. There is no sign-up.** No registration page exists anywhere, and public sign-ups are
disabled in Supabase Auth. Accounts exist only via `npm run admin:create`.

**2. The proxy redirects anonymous visitors** away from `/admin`. This is convenience, not
the security boundary — it runs before the request reaches the handler and cannot be the
only thing standing between a request and privileged data.

**3. `requireAdmin()` runs on every admin query and mutation.** Authenticating with Supabase
is not enough: an active `AdminUser` row must exist for that auth id. The role is read from
the database, never from JWT claims. Sign-in uses `getUser()` (revalidates the token) not
`getSession()` (reads an unverified cookie).

**4. Public input schemas structurally omit privileged fields.** `src/lib/validation/public.ts`
has no field for `status`, `verificationStatus`, `isFeatured`, `adminNotes` or `refNo`, and
the parsed output is the only thing handed to Prisma. A hostile client can send them; they
are stripped before reaching the database. **Covered by tests.**

**5. Row-level security** at the database. Public reads are limited to `PUBLISHED` rows.
`PropertyDocument`, `SellerSubmission`, `Inquiry`, `AuditLog` and `AdminUser` have **no
public policy at all**, so access is denied by default. The audit log is append-only even
for admins.

**6. A nonce-based Content-Security-Policy.** `src/proxy.ts` mints a fresh nonce per request
and Next stamps it onto every script it emits, so an injected `<script>` — inline or remote —
has no nonce and does not run. `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`
and `form-action 'self'` close the neighbouring holes. Every allowed origin is named; there
are no wildcards. **Covered by tests.**

Plus: rate limiting and honeypot fields on every public form, login limited to 8 attempts per
15 minutes, security headers (`nosniff`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy,
Permissions-Policy), and the image optimiser locked to the project's own Supabase host.

### Two things the CSP deliberately does not do

**`style-src` keeps `'unsafe-inline'`.** React writes inline `style` attributes during server
rendering and a style attribute cannot carry a nonce. A documented exception beats a policy
that is quietly wrong. Injected CSS is a far weaker primitive than injected script.

**Nonces cost the full route cache.** A page prerendered at build time would carry a nonce
from a request that never happened, so the browser would refuse to run its own hydration
scripts. The root layout awaits a connection and every route renders per request. Search
engines see identical HTML and the queries behind them are indexed and bounded — but this is
a real trade, made deliberately.

### Rate limiting has two stores

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and counters are shared by every
serverless instance, so the configured budget is the real budget. Leave them unset and the
limiter falls back to an in-memory counter that is per-instance — enough for form spam and
accidental double submits, not for a distributed attacker.

Redis is reached over its REST API with plain `fetch`; there is no SDK dependency. If Redis
is unreachable the limiter falls back to memory rather than failing the request, which is the
right failure direction for a contact form. `GET /api/health` reports which store is live.

---

## Tests

```bash
npm.cmd test
```

37 tests across five files, run with Vitest. They deliberately target the claims this README
makes rather than chasing a coverage number:

| File | What it pins down |
|---|---|
| `tests/validation.test.ts` | Privileged fields are stripped from public input; honeypot rejects; coordinates bounded to the region; search pagination capped |
| `tests/storage.test.ts` | A crafted filename cannot escape its folder; every upload key is unique; extensions are sanitised |
| `tests/csp.test.ts` | Nonce and `strict-dynamic` present; no `unsafe-eval` in production; hosts named not wildcarded; dev and prod policies differ correctly |
| `tests/rate-limit.test.ts` | The budget is exactly the budget; callers counted separately; windows expire |
| `tests/units.test.ts` | Every unit converts correctly, so filtering and sorting compare like with like |

These are pure-function tests and need no database, so they run in under a second and are
safe in CI. `server-only` is aliased to an empty module in `vitest.config.ts` — that package
exists to fail a build if server code reaches a client bundle, and there is no such bundle
under a node test runner.

The workflows that genuinely need a database — submission, approval, publishing, verification,
media import — are exercised by hand through the admin UI against a real database, with the
test data deleted afterwards.

---

## Admin accounts

```bash
npm.cmd run admin:create
```

Prompts for email, display name, password (minimum 12 characters) and role. It creates both
the Supabase Auth user and the `AdminUser` row, and rolls back the auth user if the database
row fails, so a half-created account cannot linger.

**It also self-heals.** If the database row exists but its auth user is missing — deleted
from the Supabase dashboard, or by a script — the account looks present while being
impossible to sign into. Re-running `admin:create` detects that and recreates the login
rather than dead-ending on "already exists".

```bash
npm.cmd run admin:manage
```

| Option | Effect |
|---|---|
| Deactivate | Access revoked immediately, live sessions ended, **audit trail intact** |
| Reactivate | Undoes it |
| Delete | Permanent. Requires typing the email again |
| Rename | Changes the display name |
| Set a new password | Also ends any signed-in session |

Deactivating is almost always the right choice for staff who leave; deleting orphans their
audit entries. The script **refuses to remove the last active admin**, because one wrong
keystroke would otherwise lock everyone out.

---

## How a property reaches the website

Two routes in. Both end as an unpublished draft.

**Public submission**

```
Seller fills in /sell with photos and video
        ↓
SellerSubmission row, status SUBMITTED, files in a PRIVATE bucket
        ↓
Admin → Submissions → Approve
        ↓
Creates a Property as DRAFT and UNVERIFIED — still not public
        ↓
Admin → Properties → edit details, add photos, Publish
```

**Walk-in seller**

```
Admin → Properties → Add a property
        ↓
Enter details → redirected straight to the photo page
        ↓
Upload photos → Publish
```

Approving a submission **copies** it into a listing. The seller's original submission stays
untouched as a record of exactly what they sent, which matters if there is ever a
disagreement about a price or a claim.

Publishing and verifying are separate decisions with separate buttons and separate audit
entries, so an ordinary text edit can never quietly publish or verify a property.

When `RESEND_API_KEY` and `LEAD_NOTIFY_TO` are set, a new enquiry or submission also sends an
email. The lead is written to the database first and the notification cannot fail the
request — a mail outage costs a notification, never a lead.

---

## The verification badge

"Verified" is an earned database state, not a label in the markup.

The admin records six checks. Three are **required**:

- Ownership documents seen
- Location confirmed
- Price confirmed with owner

The other three — supporting documents, photos and video checked, site visited — are recorded
and shown on the listing but do not by themselves grant the badge. If the three required
checks are not all ticked, the status stays `IN_PROGRESS` and the badge does not appear.

The `VerifiedBadge` component takes a boolean derived server-side from
`Property.verificationStatus`. The client never receives the raw status, so there is no code
path that renders the badge without a backing verification record.

> The six checks are a **placeholder for the client's real procedure**. They should be
> replaced with what the agency actually does before the badge is shown to the public.

---

## Media and storage

Three Supabase buckets, created by `npm run db:storage`:

| Bucket | Access | Limit |
|---|---|---|
| `property-media` | **Public** | 50 MB — published photos and video |
| `property-documents` | Private | 20 MB — ownership papers, never public |
| `submissions` | Private | 50 MB — raw seller uploads |

A seller's upload never becomes public on its own. Moving a file from the private submissions
bucket into the public media bucket is an explicit, per-file admin decision, recorded in the
audit log. That is what stops an unverified photo — or someone's ownership document —
appearing on the website.

Admins view private files through **10-minute signed URLs** minted per request, so a browser
tab left open on a shared machine stops showing them.

The import action only accepts paths belonging to that listing's own submission. Without that
check, a crafted request could name any object in the private bucket and copy it into public
view.

Cross-bucket copying is a download-then-upload, because Supabase can only copy within a
bucket. The original submission file is left in place.

### Thumbnails

Every image entering a listing's gallery — by admin upload or by importing an approved
submission — gets a WebP thumbnail generated beside it, capped at 800px wide, in
`<propertyId>/thumbs/`. Both routes go through `src/server/services/media-upload.ts`, so
neither can drift from the other.

Cards, gallery tiles and the admin grid render the thumbnail; the detail-page hero renders the
original. Without this, a results page showing twelve listings makes the image optimiser fetch
twelve full-size originals — 3–8 MB each straight off a phone — before it can resize anything.

A failed thumbnail is a slower card, not a failed upload: the gallery falls back to the
original, and `npm run media:thumbnails` fills the gap later. Deleting a file removes its
thumbnail too. The resize also strips EXIF, which on a phone photo carries GPS coordinates.

---

## The hero film

The homepage hero is a looping, muted video behind the headline. The film is dimmed and
desaturated in CSS and covered by two scrim layers: a flat wash that guarantees a contrast
floor whatever frame is on screen, and a directional gradient for depth behind the copy —
bottom-to-top on phones, left-to-right from `md` up.

The poster is server-rendered and is the LCP element, so the section is never empty. The video
layer mounts in the browser and fades in once it can play. Three visitors never get the video:
reduced-motion, Save-Data, and 2G-class connections. Those are read through
`useSyncExternalStore`, so the server snapshot is simply "no video".

### Rendering the film

The asset is produced by a **separate Remotion project** at `../remotion`, composition
`HeroLoop`. Remotion is the authoring step, not a runtime dependency — the site plays a plain
`<video>` file. Putting a React video runtime on the page to play what `<video>` plays for
free would be a poor trade.

```bash
npx remotion render HeroLoop out/construction.mp4 --muted --crf=30
npx remotion still  HeroLoop out/construction.jpg --frame=20
```

The composition trims to the useful segment, normalises to 1280×720 at 25 fps, strips audio,
and fades from and to black at both ends so the browser's `loop` has no visible seam. It takes
`src`, `trimBefore` and `fadeSeconds` as props and knows nothing about the footage, so a client
supplies their own clip and re-renders.

720p rather than 1080p, and CRF 30 rather than 26: at hero size behind a scrim the two are
visually indistinguishable, and it halves the bytes on mobile data.

> **The committed placeholder is not licensed footage.** `public/hero/` is gitignored for
> exactly that reason. Supply a clip the client owns before shipping.

---

## The location map

`src/components/property/property-map.tsx`

A property page with stored coordinates shows a Leaflet map: OpenStreetMap tiles, a marker,
and a shaded circle around it, with a "Get directions" link to Google Maps.

The circle is not decoration. Coordinates come either from the seller's phone at submission
time or from an admin typing them in — both accurate to a plot, not a doorstep. A sharp pin
would claim precision the data does not have.

Leaflet loads through `dynamic(..., { ssr: false })`, so marketplace pages never download it.
The marker is a `CircleMarker` drawn as SVG, so there are no marker image assets to break, and
its colour is read from the `--accent` token at render time.

> **Changing tile provider.** `TILE_URL` in `property-map.tsx` is the one line to change.
> OpenStreetMap's public tiles are free and keyless, but their usage policy is written for
> modest traffic. A busy deployment should move to a provider with an SLA and add that host to
> `img-src` in `src/lib/security/csp.ts`. Changing one without the other shows a grey map.

---

## Design system

`src/app/globals.css`, reviewable at `/styleguide`.

Components reference **semantic tokens** (`--accent`, `--surface`, `--text`, `--border`),
which point at a **brand scale**. Editing about ten lines in one file rebrands the entire site
— no component changes.

- 11-step warm neutral scale, deliberately not blue-grey
- Major-third type scale, body line-height 1.65 for long property descriptions
- Restrained radii (2–12px); heavy rounding makes listings look like consumer app cards
- One easing curve, three durations, nothing over 400ms on interface elements
- Global `:focus-visible` ring and a global `prefers-reduced-motion` override

> **Branding is a placeholder.** The gold accent and the Geist / Playfair Display typefaces
> are stand-ins, labelled as such on the styleguide page.

---

## Deployment

Vercel, deploying from `main`. Every push deploys automatically; a build takes about a minute.

1. Import the repository at vercel.com/new
2. Settings → General → **Node.js Version → 22.x**
3. Settings → Environment Variables → paste the contents of `.env.local`
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` did **not** get a `NEXT_PUBLIC_` prefix — that would
   inline it into the browser bundle and hand every visitor full database access
5. Upload the hero film and poster, since `public/hero/` is gitignored
6. Redeploy; environment variables only take effect on a new build

Migrations are **not** run by the build. Run them deliberately from a machine that has
`DIRECT_URL`, so a failed build cannot leave a half-migrated database.

`GET /api/health` returns database connectivity, reference-data counts, which rate-limit store
is active and whether lead notifications are configured. It returns an opaque 503 on failure
rather than leaking the reason.

---

## Decisions and why

| Decision | Reasoning |
|---|---|
| One Next.js app, not a separate backend | SSR for SEO, API and admin in one deploy; a separate service doubles ops for no benefit at this scale |
| Supabase Data API **disabled** | The app reaches Postgres through Prisma server-side. The auto-generated REST API would expose the schema to anyone holding the anon key, for no gain |
| Brand name in one module, body copy in first person | Copy that says "we" reads correctly for every client and never needs rewriting; onboarding is one file, not an audit of forty components |
| Sub-categories as query params, not routes | `/buy?type=house` and `/buy?type=plot` are one marketplace with a filter — one property engine behind everything |
| Filtering in Postgres, never in the browser | Indexed columns, bounded page sizes; the browser never receives the listing set |
| `refNo` and `slug` immutable after creation | The reference is quoted to buyers by phone; changing the slug breaks every shared link and search result |
| Remotion for authoring, `<video>` for playback | Remotion earns its place trimming, normalising and de-seaming the asset; shipping its player to play a static file would not |
| Thumbnails generated on write, not on read | An on-demand resizer needs a cache, a cache key and an eviction story. Generating once at upload is a single write path and no runtime moving parts |
| Leaflet over an embedded map iframe | An iframe is a third-party frame reading the visitor's IP on every property page. Leaflet renders locally and only fetches tile images |
| CSP nonces over experimental hash-based SRI | SRI would have kept the route cache, but it is an experimental flag. That is a liability in code someone else maintains |
| Notifications optional, database first | A fresh deployment has no mailbox. A hard dependency on one would make the enquiry form fail for a client who has not configured it |
| Testimonials array empty | Inventing customer quotes would be a false claim. The section hides itself until real ones exist |
| Admin panel outside the `(public)` route group | It never renders public navigation, and no link leads there from the website |

---

## What is not built yet

**Needs information from the client** — see [CLIENT-SETUP.md](CLIENT-SETUP.md):

- Logo, brand colours, typefaces
- Company name and description
- Office address, phone, WhatsApp, email — added at Admin → Settings
- **The real verification procedure** — the six checks are a placeholder
- Testimonials
- Licensed hero footage
- Privacy policy and terms

**Not implemented:**

- Picking a listing's location by clicking a map in the admin form — coordinates are still
  typed by hand
- Public user accounts, favourites, saved searches
- `Project` entity for an agency's own developments — `Property.projectId` is reserved and
  inert
- Integration tests against a live database; the workflows that need one are still verified
  by hand
