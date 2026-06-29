# Deploying Vestige (apps/web) to Vercel

`apps/web` is the only deployable app (the Calendar and Journal modules are
separate). It is deployed from GitHub (`weltheld/vestige`) via Vercel.

**Live:** https://vestige-web-pi.vercel.app

## Vercel project settings

- **Repository:** `weltheld/vestige`
- **Root Directory:** `apps/web` (with "Include source files outside of the
  Root Directory" enabled — required so Vercel installs the `@vestige/*`
  workspace packages).
- **Framework:** Next.js (auto-detected). Default install/build commands.
  `next build` transpiles `@vestige/{ui,db,domain}` via `transpilePackages`, so
  no separate package build step is needed.

## Environment variables (Project → Settings → Environment Variables)

Set for all environments. Values from Supabase → Settings → API. Never commit them.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oyalinqyqwztwkqqtmgx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server only) |
| `NEXT_PUBLIC_SITE_URL` | `https://vestige-web-pi.vercel.app` |

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
pnpm --filter @vestige/web dev   # http://localhost:3001
```
Requires `apps/web/.env.local` (gitignored) with the same four vars.
