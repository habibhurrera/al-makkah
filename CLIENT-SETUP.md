# Setting up a new client

Everything that changes per client, in the order it should be done. A full setup is
configuration and content — no component code should need editing.

Budget roughly half a day, most of which is waiting for the client to send content.

---

## 0. What to collect first

Ask for all of this before starting, because steps 1–7 stall without it.

| Item | Where it ends up | Blocking? |
|---|---|---|
| Company name | `src/lib/brand.ts` | Yes |
| Logo (SVG preferred) | `site-header.tsx`, `site-footer.tsx` | No — a wordmark works |
| Brand colours | `src/app/globals.css` | No — placeholder gold works |
| Typefaces | `src/app/layout.tsx` | No — placeholders work |
| Phone, WhatsApp, email, office address | Admin → Settings | **Yes** — buttons hide without them |
| City and region covered | `src/lib/brand.ts`, `prisma/seed.ts` | Yes |
| Their real verification procedure | `Verification` checks | **Yes** — see step 6 |
| Hero footage they own or have licensed | `../remotion` → `public/hero/` | Yes |
| Privacy policy and terms text | New pages | Before go-live |
| Testimonials, if any | `src/lib/placeholder-content.ts` | No — section self-hides |

Everything marked "No" has a working placeholder, so the site can be stood up and demoed
before the client has finished sending content.

---

## 1. Name and market

Edit `src/lib/brand.ts`. This is the only file that carries the company name.

```ts
export const BRAND = {
  name: 'Acme Estates',
  descriptor: 'Real Estate',
  tagline: 'Buy, sell and rent verified property in <city>.',
  city: 'Hyderabad',
  region: 'Sindh',
} as const;
```

That propagates to the wordmark, the footer, page titles, the admin panel and the verified
badge. **Do not** go looking for the name elsewhere — body copy is written in the first
person ("we verify", "our team") precisely so it never needs rewriting.

If the client covers a different city, also replace the locality list in `prisma/seed.ts`
before running `npm run db:seed`. Areas are curated, not free text.

---

## 2. Colours and type

`src/app/globals.css` has two blocks that matter:

- `@theme { ... }` — the raw brand scale (`--color-brand-*`, `--color-ink-*`)
- `:root { ... }` — the semantic tokens (`--accent`, `--surface`, `--text`, `--border`)

Change the brand scale and the semantic tokens follow. Roughly ten lines rebrands the whole
site. Check the result at `/styleguide` before going further — it renders every primitive on
one page.

Typefaces are loaded in `src/app/layout.tsx` via `next/font/google`. Swap the two families
and the tokens `--font-sans` / `--font-display` carry them everywhere. Self-hosted at build
time, so no `font-src` CSP change is needed for Google Fonts.

---

## 3. Logo

`src/components/layout/site-header.tsx` and `site-footer.tsx` each render a text wordmark.
Replace with an `<Image>` or inline SVG. These are the only two places, and both are marked
with a `PLACEHOLDER WORDMARK` comment.

Keep the header logo under about 40px tall or the sticky header grows and eats the hero.

---

## 4. Infrastructure

Each client gets **their own** Supabase project and Vercel project. Do not share a database
between clients — this is single-tenant by design, and the row-level security policies assume
one agency per database.

```bash
cp .env.example .env.local          # fill in from the new Supabase project
npm.cmd run db:deploy               # apply migrations
psql "$DIRECT_URL" -f prisma/sql/rls-policies.sql
npm.cmd run db:seed                 # areas, amenities, settings row
npm.cmd run db:storage              # the three buckets
npm.cmd run admin:create            # first admin account
```

Then confirm with `GET /api/health` — it reports database connectivity, reference-data
counts, the active rate-limit store and whether lead notifications are configured.

Disable public sign-ups in Supabase Auth. There is no registration page, but the setting is
the actual guarantee.

---

## 5. Contact details

Sign in at `/admin`, go to **Settings**, and enter phone, WhatsApp, email and office address.

Until this is done the property pages show no call or WhatsApp buttons and the contact page
shows only the form. That is deliberate — a dead `tel:` link is worse than no link — but it
means an empty Settings page looks like a half-finished site.

---

## 6. The verification procedure

**This is the one step that cannot be skipped or guessed.**

The six checks behind the verified badge are a placeholder. Three of them currently gate the
badge: ownership documents seen, location confirmed, price confirmed with owner.

Replace them with what the agency actually does, and make sure the gating set matches. The
badge is a public trust claim; if it means something different from what the client tells
buyers it means, that is a problem for them and eventually for you.

The checks live in the `Verification` model and the gating logic in
`src/server/actions/admin.ts`.

---

## 7. The hero film

The client must supply footage they own or have licensed. Then:

```bash
cp <their-clip>.mp4 ../remotion/public/hero-source.mp4
cd ../remotion
npx remotion studio                 # dial in trimBefore against their footage
npx remotion render HeroLoop out/construction.mp4 --muted --crf=30
npx remotion still  HeroLoop out/construction.jpg --frame=20
```

Copy both outputs to `public/hero/` in the app. That directory is **gitignored**, so upload
them to the deployment directly, or host them on the client's Supabase storage and set
`NEXT_PUBLIC_HERO_VIDEO_URL` / `NEXT_PUBLIC_HERO_POSTER_URL`.

Do not ship footage whose rights the client cannot evidence. Watermarks and logo cards are
composited into frames and cannot be trimmed out.

---

## 8. Optional services

Both degrade to a sane default, so neither blocks launch.

**Lead email** — set `RESEND_API_KEY` and `LEAD_NOTIFY_TO`. Leads are always written to the
database and visible at `/admin/leads`; email is a convenience on top.

**Shared rate limiting** — set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Worth
doing once the site gets real traffic; without it, limits are per serverless instance.

---

## 9. Legal pages

Privacy policy and terms are not written — they are legal documents specific to the client's
jurisdiction and business, and boilerplate would be worse than nothing. Get the text from the
client and add two routes under `src/app/(public)/`, then link them from the footer.

---

## Go-live checklist

- [ ] `src/lib/brand.ts` updated
- [ ] Colours and fonts applied, `/styleguide` reviewed
- [ ] Logo in header and footer
- [ ] Own Supabase project, migrations applied, RLS policies applied
- [ ] Public sign-ups disabled in Supabase Auth
- [ ] Seeded areas match the client's actual coverage
- [ ] Admin account created, password handed over securely
- [ ] Contact details entered at Admin → Settings
- [ ] Verification checks replaced with the client's real procedure
- [ ] Licensed hero film rendered and uploaded
- [ ] Privacy policy and terms published and linked
- [ ] `SUPABASE_SERVICE_ROLE_KEY` confirmed absent from the client bundle
- [ ] `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` all clean
- [ ] `GET /api/health` returns `ok`
- [ ] At least one listing published end to end, then deleted
