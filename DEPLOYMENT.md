# Deploying AL-MAKKAH to Vercel

The app is Vercel-ready today: it builds clean and every page is currently
static, so it deploys with or without a database. Database-backed pages arrive
in later phases and need the environment variables below.

## One-time setup

1. **Push the repository to GitHub.** Vercel deploys from a git remote. The repo
   is initialised locally but has no remote yet.

   ```bash
   gh repo create al-makkah --private --source=. --push
   ```

2. **Import the repo at vercel.com/new.** Framework preset is detected as
   Next.js. Leave build and output settings at their defaults — `postinstall`
   already runs `prisma generate`, which Vercel requires because it caches
   `node_modules` between builds.

3. **Add environment variables** in Vercel → Project → Settings →
   Environment Variables. Copy the names from `.env.example`:

   | Variable | Scope | Notes |
   |---|---|---|
   | `DATABASE_URL` | all | Supabase **pooled** connection, port 6543 |
   | `DIRECT_URL` | all | Supabase **direct** connection, port 5432 |
   | `NEXT_PUBLIC_SUPABASE_URL` | all | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | Safe to expose |
   | `SUPABASE_SERVICE_ROLE_KEY` | all | **Server only.** Never prefix with `NEXT_PUBLIC_` |
   | `NEXT_PUBLIC_SITE_URL` | production | The real domain — used for canonical URLs, sitemap and Open Graph |

4. **Node version.** Set Vercel's Node runtime to **22.x** to match `.nvmrc`
   and `engines`.

## Migrations

Migrations are not run by the Vercel build. Run them deliberately from a
machine that has `DIRECT_URL`:

```bash
npm run db:deploy
```

Applying schema changes during a build risks a half-migrated database if the
build fails partway.

## Preview vs production

Vercel gives every branch a preview URL automatically. Keep the placeholder
content on preview deployments until the real branding and business details are
in — a production deployment is publicly reachable and indexable by search
engines.

`/styleguide` is marked `noindex` and is not linked from the site, but it is
still publicly reachable once deployed. Remove it or protect it before the
public launch.
