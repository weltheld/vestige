# Deploying Vestige to Vercel

Two apps are deployed separately (the Calendar module, `apps/calendar`, is the
pre-existing `council-of-days` Vercel project and isn't managed here):

| App | Vercel project | Live URL |
|---|---|---|
| `apps/web` | `vestige-web` | https://vestige-web-pi.vercel.app |
| `apps/journal` | `vestige-journal` | https://vestige-journal.vercel.app |

Both are on the same Vercel team (`felixs-projects-377db6ad`) and read the same
Supabase project.

## Vercel project settings (both apps)

- **Repository:** `weltheld/vestige` (public)
- **Root Directory:** `apps/web` / `apps/journal` respectively — with "Include
  source files outside of the Root Directory" enabled, required so Vercel
  installs the `@vestige/*` workspace packages.
- **Framework:** Next.js. `next build` transpiles `@vestige/{ui,db,domain}`
  via `transpilePackages`, so no separate package build step is needed.

### One `.vercel` link per app

Each app's local link lives in its **own** directory —
`apps/web/.vercel/project.json` and `apps/journal/.vercel/project.json` — not
at the repo root. `vercel deploy` resolves `rootDirectory` **relative to the
cwd it's run from**, so:

```bash
# Deploy web — from repo root, with .vercel/project.json copied there
# temporarily (or symlinked) so cwd = repo root but the link points at web.
cd apps/web && vercel link --yes --project vestige-web   # one-time
cd /path/to/vestige && cp apps/web/.vercel/project.json .vercel/project.json
vercel deploy --prod --yes

# Deploy journal — same pattern, swap the root link to vestige-journal first.
cp apps/journal/.vercel/project.json .vercel/project.json
vercel deploy --prod --yes
```

Running `vercel deploy` **from inside** `apps/journal` (with its own
`.vercel` there) double-applies the Root Directory setting
(`apps/journal/apps/journal` — fails). Always deploy from the **repo root**
with the target app's project linked there.

### Projects created via CLI need two settings set manually

A project created by `vercel link` (rather than imported through the
dashboard) does **not** auto-detect the framework. Before the first deploy,
set both via the Vercel API (or dashboard → Settings):

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<projectId>?teamId=<teamId>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"rootDirectory":"apps/journal","framework":"nextjs"}'
```
Omitting `framework` causes `No Output Directory named "public" found` even
though the Next.js build itself succeeds.

## Environment variables (Project → Settings → Environment Variables)

Both apps need the same Supabase vars. `apps/journal` additionally needs the
cross-app URLs (it runs on its own origin/domain).

| Name | `apps/web` | `apps/journal` |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ |
| `NEXT_PUBLIC_SITE_URL` | `https://vestige-web-pi.vercel.app` | `https://vestige-journal.vercel.app` |
| `NEXT_PUBLIC_WEB_URL` | — | `https://vestige-web-pi.vercel.app` |
| `NEXT_PUBLIC_CALENDAR_URL` | — | `https://council-of-days-lovat.vercel.app` |

Values from Supabase → Settings → API. Never commit them — set via the
dashboard or `vercel env add <name> <environment>` (reads from stdin, doesn't
echo the value).

## Supabase auth config (required for magic links)

Supabase dashboard → Authentication → URL Configuration:

- **Site URL:** `https://vestige-web-pi.vercel.app`
- **Redirect URLs:**
  - `https://vestige-web-pi.vercel.app/auth/callback`
  - `https://*-weltheld.vercel.app/auth/callback` (preview deploys)
  - `http://localhost:3001/auth/callback` (local dev)

The sign-in/up forms derive the redirect from the live origin
(`window.location.origin + /auth/callback`), so once the callback URL is
whitelisted, magic links complete into `/app`.

> Sign-ins hit the **live** Council of Days Supabase project and (with
> `shouldCreateUser: true` on `/signup`) create real auth users.

## Local dev

```bash
pnpm --filter @vestige/web dev       # http://localhost:3001
pnpm --filter @vestige/journal dev   # http://localhost:3002
```
Each app needs its own gitignored `.env.local` with the vars above. Note: the
Supabase auth cookie doesn't cross the `:3001`/`:3002` origins in local dev, so
signing in on one doesn't authenticate the other — only production (one shared
domain per app, same Supabase project) has a consistent session across them
via the redirect chain.
