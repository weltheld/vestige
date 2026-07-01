# Deploying Vestige to Vercel

Two apps are deployed separately (the Calendar module, `apps/calendar`, is the
pre-existing `council-of-days` Vercel project and isn't managed here). Journal
is mounted **under web's domain** at `/journal` (Next.js Multi-Zones) so there
is one shared origin, and therefore **one shared Supabase auth session**
across web + journal.

| App | Vercel project | Reachable at |
|---|---|---|
| `apps/web` | `vestige-web` | https://vestige-web-pi.vercel.app (primary — this is the domain users see) |
| `apps/journal` | `vestige-journal` | https://vestige-web-pi.vercel.app/journal (proxied) |

`vestige-journal.vercel.app` still exists as a deployment target but should not
be visited directly — hitting it at bare `/` now 404s, because the app's
`basePath` is `/journal`; it only resolves correctly when requested at
`/journal/...` (which is exactly what the web-side rewrite sends it).

Both are on the same Vercel team (`felixs-projects-377db6ad`) and read the same
Supabase project.

## Why Multi-Zones (single sign-on)

Two apps on two different `*.vercel.app` hostnames cannot share a cookie —
there's no common parent domain. Rather than buying a custom domain, Next.js
supports mounting a second Next.js app at a path prefix under a first app's
domain, via rewrites. The **browser never navigates to journal's own
domain** — every request the user sees stays on `vestige-web-pi.vercel.app`,
so the Supabase auth cookie (scoped to that one host) is available to both
apps' server code.

- `apps/journal/next.config.mjs` sets `basePath: "/journal"`.
- `apps/web/next.config.mjs` rewrites `/journal` and `/journal/:path*` to
  `${JOURNAL_ZONE_URL}/journal` / `.../journal/:path*` — i.e. journal's own
  deployment, hit server-side, response streamed back through web's edge.
- `apps/web`'s campaign-redirect (`/app/c/[campaignId]`) sends users to the
  **same-origin, relative** `/journal/c/${campaign.id}` for journal-enabled
  campaigns, instead of a cross-domain redirect.
- Inside journal, all navigation goes through `next/link` / `next/navigation`
  (never a raw `<a href>` or `window.location`), so Next applies the
  `basePath` prefix automatically — no hardcoded `/journal/...` paths needed
  in journal's own route helpers (`lib/links.ts`).

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

**Deploy order when both change:** journal first, then web (web's rewrite
destination is journal's live deployment, so journal must already be up to
date; a stale journal behind a fresh web rewrite still works, just serves the
older journal build).

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

### Turborepo hides env vars from the build unless allow-listed

Any env var a build actually needs — including ones only read inside
`next.config.mjs`, like `JOURNAL_ZONE_URL` — must be listed in the root
`turbo.json`'s `globalEnv`, or Turborepo strips it from the build environment
silently. Symptom: the rewrite falls back to its `localhost` default in
production, and the response header shows
`x-vercel-error: DNS_HOSTNAME_RESOLVED_PRIVATE`. `vercel deploy` also prints a
`[warn] environment variables set on Vercel but missing from turbo.json` line
in the build log when this happens — easy to miss, worth grepping for.

## Environment variables (Project → Settings → Environment Variables)

| Name | `apps/web` | `apps/journal` |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ |
| `NEXT_PUBLIC_SITE_URL` | `https://vestige-web-pi.vercel.app` | `https://vestige-journal.vercel.app` (direct-visit fallback only) |
| `NEXT_PUBLIC_WEB_URL` | — | `https://vestige-web-pi.vercel.app` |
| `NEXT_PUBLIC_CALENDAR_URL` | ✓ (`https://council-of-days-lovat.vercel.app`) | ✓ (same) |
| `JOURNAL_ZONE_URL` | `https://vestige-journal.vercel.app` (server-only, used by the `/journal` rewrite) | — |

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

Only **web's** callback URL is needed — journal has no sign-in flow of its
own; it relies entirely on the session set by web's callback, which now works
because both are the same origin in production (see Multi-Zones above).

> Sign-ins hit the **live** Council of Days Supabase project and (with
> `shouldCreateUser: true` on `/signup`) create real auth users.

## Local dev

```bash
pnpm --filter @vestige/web dev       # http://localhost:3001
pnpm --filter @vestige/journal dev   # http://localhost:3002
```

`apps/web/.env.local` should include `JOURNAL_ZONE_URL=http://localhost:3002`
so `pnpm --filter @vestige/web dev` also proxies `/journal` locally — visiting
`http://localhost:3001/journal` exercises the same Multi-Zones path as
production, and (since it's one origin) the auth cookie is shared locally too.
