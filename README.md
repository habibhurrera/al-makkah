# AL-MAKKAH Real Estate

A property platform for AL-MAKKAH Real Estate, Hyderabad, Sindh.

Not a brochure site. It is four systems sharing one property engine:

| System | What it is |
|---|---|
| Marketing site | Home, about, contact — premium, architectural, trust-first |
| 3D signature experience | Scroll-driven construction sequence on the homepage |
| Public marketplace | Buy and Rent, server-side search and filtering, SEO-indexable property pages |
| Private back office | Seller submissions, verification workflow, lead inbox, admin dashboard |

- **Live:** https://al-makkah-five.vercel.app
- **Repository:** https://github.com/habibhurrera/al-makkah
- **Database:** Supabase (project region `ap-south-1`, Mumbai)

---

## Contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Commands](#commands)
4. [Architecture](#architecture)
5. [Data model](#data-model)
6. [Security model](#security-model)
7. [Admin accounts](#admin-accounts)
8. [How a property reaches the website](#how-a-property-reaches-the-website)
9. [The verification badge](#the-verification-badge)
10. [Media and storage](#media-and-storage)
11. [The 3D hero](#the-3d-hero)
12. [Design system](#design-system)
13. [Deployment](#deployment)
14. [Decisions and why](#decisions-and-why)
15. [What is not built yet](#what-is-not-built-yet)

---

## Quick start

Requires **Node 22 LTS**. The project is developed on Windows with PowerShell.

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
| `DATABASE_URL` | Supabase → Database → Connection string → **Transaction pooler** | Port **6543**, keep `?pgbouncer=true` |
| `DIRECT_URL` | Same page → **Session pooler** | Port **5432** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon / publishable key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role | **Server only.** Bypasses row-level security |
| `SUPABASE_BUCKET_MEDIA` | — | `property-media` |
| `SUPABASE_BUCKET_DOCUMENTS` | — | `property-documents` |
| `SUPABASE_BUCKET_SUBMISSIONS` | — | `submissions` |
| `NEXT_PUBLIC_SITE_URL` | — | Optional. Falls back to the Vercel production URL |

### Two gotchas that cost real time

**The legacy direct host does not resolve.** `db.<ref>.supabase.co` is IPv6-only on new
Supabase projects. On an IPv4 network it fails with `ENOTFOUND`. `DIRECT_URL` must use the
**session pooler** (`aws-0-<region>.pooler.supabase.com:5432`), not the legacy host.

**Do not hand-edit the placeholders.** The connection strings shown in the Supabase dashboard
already contain your project ref and region. Replace the whole line, then swap
`[YOUR-PASSWORD]` for the database password.

---

## Commands

| Command | What it does |
|---|---|
| `npm.cmd run dev` | Development server |
| `npm.cmd run build` | Production build |
| `npm.cmd run db:migrate` | Create and apply a migration (development) |
| `npm.cmd run db:deploy` | Apply migrations (production) |
| `npm.cmd run db:seed` | Seed 42 Hyderabad areas, 20 amenities, site settings |
| `npm.cmd run db:storage` | Create the three storage buckets, idempotent |
| `npm.cmd run db:studio` | Prisma Studio |
| `npm.cmd run admin:create` | Create an admin account |
| `npm.cmd run admin:manage` | List, deactivate, reactivate, rename, change password, delete |

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
│  │   ├─ contact/         Stub
│  │   ├─ property/[slug]/ Property detail page
│  │   └─ styleguide/      Internal design-system review page (noindex)
│  ├─ admin/               Outside the public group, so it never renders public chrome
│  │   ├─ login/
│  │   ├─ submissions/     Review, approve, reject
│  │   ├─ properties/      List, publish, verify, feature
│  │   │   ├─ new/         Create a listing directly
│  │   │   └─ [id]/edit/   Edit a listing
│  │   │   └─ [id]/media/  Gallery manager
│  │   ├─ leads/
│  │   └─ settings/        Contact details shown across the site
│  ├─ api/                 health · inquiries · seller-submissions · admin/property-media
│  ├─ robots.ts sitemap.ts
│  └─ globals.css          Design tokens
├─ components/
│  ├─ ui/                  Primitives — button, badge, card, field, states, layout
│  ├─ property/            Card, filters, results
│  ├─ forms/               Inquiry form, seller form
│  ├─ admin/               Admin-only components
│  ├─ layout/              Header, footer, phase stub
│  └─ three/               The 3D hero
├─ server/                 ALL database access lives here
│  ├─ auth.ts              requireAdmin, audit log
│  ├─ queries/             Read paths
│  └─ actions/             Write paths (server actions)
├─ lib/                    db · supabase · storage · units · validation · rate-limit · env
└─ types/
```

**One rule shapes this layout:** components never import Prisma. Every database call goes
through `src/server/`, which is what stops an authorisation check being bypassed by an
accidental import into a component.

### Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL (Supabase) ·
Zod · three.js / React Three Fiber · Vercel

---

## Data model

14 tables. The important ones:

| Table | Purpose |
|---|---|
| `Property` | The listing. Includes `areaValue` + `areaUnit` as entered, plus a derived `areaSqFt` |
| `Area` | Hyderabad localities, admin-managed |
| `PropertyMedia` | Photos, video, floor plans — storage paths, never binaries |
| `PropertyDocument` | Ownership papers. Private bucket only, never public |
| `Verification` | The record behind the verified badge, with per-check booleans |
| `SellerSubmission` | Raw public submission, kept separate from `Property` |
| `Inquiry` | Every lead — buy, rent, sell, contact, viewing |
| `AdminUser` | Maps to a Supabase Auth user plus a role |
| `AuditLog` | Append-only trail of consequential admin actions |
| `SiteSetting` | Single row: AL-MAKKAH's phone, WhatsApp, email, address |

### Area units

Hyderabad quotes property in square yards, marla, kanal and square feet interchangeably, so
the uploader picks the unit and the site displays it verbatim. Alongside it, `areaSqFt` is
derived on every write.

Without that derived column, "sort by largest" and the area filter would compare 2 kanal
against 400 sq ft as if they were the same scale — a bug that produces wrong results while
the page still looks correct. `areaSqFt` is recomputed on every create and every edit.

---

## Security model

Five independent layers. No single one is trusted alone.

**1. There is no sign-up.** No registration page exists anywhere, and public sign-ups are
disabled in Supabase Auth. Accounts exist only via `npm run admin:create`.

**2. Middleware redirects anonymous visitors** away from `/admin`. This is convenience, not
the security boundary — it runs before the request reaches the handler and cannot be the
only thing standing between a request and privileged data.

**3. `requireAdmin()` runs on every admin query and mutation.** Authenticating with Supabase
is not enough: an active `AdminUser` row must exist for that auth id. A Supabase account on
its own grants nothing. The role is read from the database, never from JWT claims. Sign-in
uses `getUser()` (revalidates the token) not `getSession()` (reads an unverified cookie).

**4. Public input schemas structurally omit privileged fields.** `src/lib/validation/public.ts`
has no field for `status`, `verificationStatus`, `isFeatured`, `adminNotes` or `refNo`, and
the parsed output is the only thing handed to Prisma. A hostile client can send them; they
are stripped before reaching the database. Admin schemas live in a separate file.

**5. Row-level security** at the database. Public reads are limited to `PUBLISHED` rows.
`PropertyDocument`, `SellerSubmission`, `Inquiry`, `AuditLog` and `AdminUser` have **no
public policy at all**, so access is denied by default. The audit log is append-only even
for admins.

Plus: rate limiting and honeypot fields on every public form, login limited to 8 attempts per
15 minutes, security headers (`nosniff`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy,
Permissions-Policy), and the image optimiser locked to the project's own Supabase host.

### Verified by testing, not assumed

- A hostile submission carrying `status: PUBLISHED, verificationStatus: VERIFIED, isFeatured,
  adminNotes, refNo` was stored with **all five stripped**
- `mediaPaths=../../etc` was ignored; uploads get a random UUID name inside the submission's
  own folder
- A valid Supabase account with the correct password but **no `AdminUser` row** was refused
- A `DRAFT` listing returns **404**, indistinguishable from one that never existed
- The service-role key does **not** appear in the deployed HTML or any JavaScript chunk
- Anonymous `POST` to the admin media API returns **403** in production

### Known limitation

Rate limiting is in-memory and per serverless instance. It stops form spam and double
submits, not a distributed attacker. Swap the store for Upstash Redis when volume justifies
it; the call signature does not change.

There is no Content-Security-Policy yet. Next injects inline hydration scripts, so a correct
CSP needs nonce plumbing. A permissive one would give false assurance, so it is deliberately
absent rather than wrong.

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

---

## The verification badge

"AL-MAKKAH VERIFIED" is an earned database state, not a label in the markup.

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

The property page shows only the checks that were actually performed.

> The six checks are a **placeholder for AL-MAKKAH's real procedure**, which has not been
> supplied yet. They should be replaced with what the company actually does before the badge
> is shown to the public.

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

---

## The 3D hero

`src/components/three/`

A scroll-driven construction sequence: empty plot → ground preparation → foundation →
structure → walls → roof → windows and doors → finishing → landscaping → completed home, with
daylight fading to dusk and the interior lighting up in the final stages.

The house is a **premium two-storey bungalow**: pitched roof, floor-to-ceiling glazing in dark
frames, timber cladding, stone feature wall, cantilevered first floor over the entrance,
balcony, stepping-stone approach and garden lighting.

| File | Role |
|---|---|
| `construction-stages.ts` | The ten stages and their scroll ranges — the single source of choreography |
| `house-scene.tsx` | The geometry, materials, camera and lighting |
| `hero-3d.tsx` | Scroll driver, overlay copy, stage caption, fallbacks |
| `use-quality-tier.ts` | Device tiers, reduced motion, WebGL detection |
| `hero.tsx` | Dynamic import wrapper |

### Why procedural rather than a downloaded model

Marketplace GLB houses arrive as one welded mesh, which cannot be built up stage by stage.
Generating the geometry means every slab, column, panel and pane is a separate object whose
appearance is driven by scroll. The trade is photorealism for control — and control is the
point of a sequence that has to run forwards and backwards at whatever speed the visitor
scrolls.

`construction-stages.ts` is the seam. A properly modelled house can implement the same stage
boundaries later without touching the choreography.

### Why no GSAP

The plan called for GSAP ScrollTrigger. Its job here would be mapping scroll position to a
number between 0 and 1. A scroll listener writing to a ref, sampled inside the render loop,
does that in a few lines. Adding a library for it would have been installing blindly.

### Performance

- `dynamic(..., { ssr: false })` keeps three.js out of the shared chunk. **Verified: absent
  from all 17 JavaScript chunks on `/buy`** — marketplace pages never download the 3D code
- Device tiers cap pixel ratio, disable shadows, and reduce geometry detail on phones
- Scroll writes to a ref; the scene samples it inside `useFrame`, so scrolling never
  re-renders the page
- **Reduced motion** and **no WebGL** both fall back to a static hero with identical copy

---

## Design system

`src/app/globals.css`, reviewable at `/styleguide`.

Components reference **semantic tokens** (`--accent`, `--surface`, `--text`, `--border`),
which point at a **brand scale**. When real branding arrives, editing about ten lines in one
file rebrands the entire site — no component changes.

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
5. Redeploy; environment variables only take effect on a new build

Migrations are **not** run by the build. Run them deliberately from a machine that has
`DIRECT_URL`, so a failed build cannot leave a half-migrated database.

`GET /api/health` returns database connectivity and reference-data counts. It returns an
opaque 503 on failure rather than leaking the reason.

---

## Decisions and why

| Decision | Reasoning |
|---|---|
| One Next.js app, not a separate backend | SSR for SEO, API and admin in one deploy; a separate service doubles ops for no benefit at this scale |
| Supabase Data API **disabled** | The app reaches Postgres through Prisma server-side. The auto-generated REST API would expose the schema to anyone holding the anon key, for no gain. Auth and Storage work without it |
| Sub-categories as query params, not routes | `/buy?type=house` and `/buy?type=plot` are one marketplace with a filter — one property engine behind everything |
| Filtering in Postgres, never in the browser | Indexed columns, bounded page sizes; the browser never receives the listing set |
| `refNo` and `slug` immutable after creation | The reference is quoted to buyers by phone; changing the slug breaks every shared link and search result |
| Testimonials array empty | Inventing customer quotes would be a false claim. The section hides itself until real ones exist |
| No fabricated statistics or company history | Placeholder text is labelled as placeholder on the page |
| Admin panel outside the `(public)` route group | It never renders public navigation, and no link leads there from the website |

---

## What is not built yet

**Needs information from AL-MAKKAH:**

- Logo, brand colours, typefaces
- Company description, mission, vision, values
- Office address, phone, WhatsApp, email — add these at Admin → Settings, or property pages
  show no call or WhatsApp buttons
- **The real verification procedure** — the six checks are a guess
- Testimonials
- Privacy policy and terms

**Not implemented:**

- Contact page form (the page is still a stub)
- Image thumbnail generation — large photos load slowly on mobile
- Interactive map on the property page (coordinates are stored, not yet displayed)
- Email or WhatsApp notification when a lead arrives
- Content-Security-Policy
- Public user accounts, favourites, saved searches
- `Project` entity for AL-MAKKAH's own developments — `Property.projectId` is reserved and
  inert

---

## Testing approach

There is no automated test suite. Every feature in this codebase was verified by running it
against the real database and then deleting the test data:

- Submissions, approvals, publishing, verification and media import driven through the actual
  admin UI in a browser
- Attack paths exercised directly with `curl` — privileged-field injection, path traversal,
  honeypots, unauthenticated API access
- Database state inspected with SQL after each step rather than assumed from a green screen
- `next build`, `tsc --noEmit` and `eslint` clean before every commit

A proper test suite is worth adding before the codebase grows further.
