# Council of Days — Project Context

> Working doc for picking this project up on any machine (incl. Claude desktop).
> Last updated: 2026-06-23. Supersedes the older, stale `HANDOVER.md`.

## What it is

**Council of Days** is a D&D session-scheduling web app.
- A Dungeon Master creates a **campaign poll**.
- Players join via an invite link and vote **yes / maybe / no** on dates.
- The app surfaces the **best day** (most "yes" votes on a viable weekday where every DM is free).
- The DM can mark days as **game sessions** (a struck crest medallion on the tile).
- A user in **multiple campaigns** sees cross-campaign conflicts and can align votes.

- **Repo:** https://github.com/weltheld/council-of-days (push to `main` → Vercel auto-deploys)
- **Supabase project ref:** `oyalinqyqwztwkqqtmgx`
- Internally the entity is called `Group` in `lib/types.ts`, but all UI copy says "campaign".

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript |
| DB / Auth | Supabase (Postgres + Row Level Security + Magic-Link OTP) |
| Storage | Supabase Storage (`avatars`, `banners` buckets) |
| Email | Resend via Supabase custom SMTP |
| Styling | Tailwind CSS 3 + custom CSS variables; Cinzel (display) + Alegreya Sans (body) |
| Icons | lucide-react |
| Deploy | Vercel |

## Local setup

```bash
git clone https://github.com/weltheld/council-of-days.git
cd council-of-days
npm install
# create .env.local (see below), then:
npm run dev          # http://localhost:3000
npm run build        # full prod build — run before pushing if unsure
npm run lint         # ESLint
```

`.env.local` (real values live in the Supabase / Vercel dashboards — see `SUPABASE_SETUP.md`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://oyalinqyqwztwkqqtmgx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase → Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<Supabase → Settings → API>   # server-only, never sent to browser
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Architecture patterns (important)

- **Three Supabase clients**, all in `lib/supabase/server.ts` + `client.ts`:
  - `getBrowserSupabase()` — client components, respects RLS as the signed-in user.
  - `getServerSupabase()` — server components / actions, cookie-based session, respects RLS.
  - `getServiceRoleSupabase()` — **server-only**, bypasses RLS. Used inside server actions that first verify the caller's identity, then write. Never import this into a client component.
- **Writes that RLS would block** (session marks, per-campaign character, banner upload, role changes, membership) go through **server actions** under `app/g/[slug]/*Actions.ts`, using the service role after an explicit membership/creator check.
- **Direct client writes** are used only where RLS already permits them as the user — e.g. casting your own votes in `GroupViewClient` (`votes` table has self-scoped RLS).
- **Optimistic UI**: vote/session toggles update local state immediately and revert on failure.
- **Hand-written DB types**: `lib/supabase/database.types.ts` is maintained by hand (not `supabase gen types`). Update it when you add a table/column.

## Project structure

```
app/
  auth/callback/route.ts     Magic-link handler; claims invites, auto-joins /g/ targets, routes to /profile or /home
  home/page.tsx              Campaign dashboard + pending invites
  new/                       Create-campaign wizard
  profile/                   Global profile (display name, default character, avatar)
  g/[slug]/page.tsx          Campaign calendar (server component) — loads members, votes, sessions, cross-campaign data
  g/[slug]/sessionActions.ts     Creator marks/unmarks a date as a game session (service role)
  g/[slug]/characterActions.ts   Per-campaign character name/portrait + image library (service role)
  g/[slug]/bannerActions.ts      Banner upload/crop (service role)
  g/[slug]/roleActions.ts        Set DM / remove member (service role)
  g/[slug]/invite/               Invite-players page

components/council/
  GroupViewClient.tsx   Main calendar page (client): banner, sidebar, all handlers, cross-campaign overlays
  CalendarPanel.tsx     Month grid + nav; maps days → DayCell; threads session/conflict/align data
  DayCell.tsx           One day tile: vote tint, counts, best-day badge, DM mask, session medallion,
                        cross-campaign conflict (⚔) marker, align pips, hover tooltip
  WaxSeal.tsx           The session marker — a struck crest medallion w/ faceted D20 (gold=upcoming, wine=played)
  BannerParty.tsx       Party avatars in the banner + rich hover card; click own avatar to edit character
  CharacterDialog.tsx   Per-campaign character picker (reuse from image library or upload new)
  QuickFillBar.tsx      Bulk fill votes by weekday + reset
  BestDaySummary.tsx    "Next best day" sidebar summary
  OwnerSettings.tsx     Poll settings (roles, weekdays, banner, background)
  AppHeader.tsx, ProfileDialog/Editor.tsx, ImageCropper.tsx, Avatar.tsx, Crest.tsx, ...

lib/
  supabase/{client,server,env,middleware,database.types}.ts
  calendar.ts           Month grid builder + date helpers (isoDate, etc.)
  types.ts              Shared types (Group, Member, Vote, User, VoteValue, Weekday)
  utils.ts              cn() classname helper

supabase/migrations/    0001 init · 0002 storage+banner · 0003 is_dm · 0004 sessions · 0005 per-campaign character + image library
supabase/email-templates/   magic-link.html, invite.html (paste into Supabase dashboard)
```

## Database (run migrations in the Supabase SQL Editor; idempotent)

Tables: `profiles`, `campaigns`, `campaign_members`, `invitations`, `votes`, `campaign_sessions`, `user_images`.

- `campaign_members.character_name` / `.avatar_url` (nullable) = **per-campaign** identity override; NULL falls back to the global `profiles` row.
- `user_images` = a user's reusable portrait library (files live in the `avatars` bucket under `{user_id}/…`).
- `campaign_sessions(campaign_id, date)` = DM-marked play-dates. Upcoming-vs-played is **derived from the date at render time**, not stored.
- RLS helpers `is_campaign_member(uuid)` / `is_campaign_creator(uuid)` are `SECURITY DEFINER`. Members can read all of their campaigns' members/votes/sessions — this is what makes the cross-campaign features work with no extra policy.

**All 5 migrations are currently applied to the live project.** If you add one, paste it into the SQL Editor and run it.

## Key features & where they live

- **Voting / best day** — `GroupViewClient.handleCycle`, `CalendarPanel.bestDayIso`, `DayCell`.
- **Game-session medallion** — `WaxSeal.tsx` + `DayCell` (owner hovers an empty day → faint gold "+" to stamp; hovers a medallion → "×" overlay to remove); `sessionActions.ts`.
- **Per-campaign character** — `CharacterDialog.tsx` + `characterActions.ts`; identity resolved per-campaign in `g/[slug]/page.tsx` (member override → profile fallback).
- **Cross-campaign conflicts** — `page.tsx` fetches the user's other campaigns' play-dates; conflicting days get a wine ⚔ marker (campaign named in tooltip) and are **auto-set to "no"** once (future, votable, un-voted days only; reversible).
- **Align overlay** — sidebar toggle "Align with other campaigns" overlays the user's own votes from other campaigns as pips (green=yes, amber=maybe, wine=no), campaign names in tooltip. Hidden when there are none.

## Design tokens (`app/globals.css`)

`--color-parchment` (bg) · `--color-surface` (cards) · `--color-ink` / `--color-ink-soft` (text) · `--color-wine` (primary accent, today) · `--color-dm-gold` (DM / best-day) · `--color-hairline` (borders) · `--color-vote-yes` (green) · `--color-vote-maybe` (gold) · `--color-vote-no` (red).

## Conventions / gotchas

- Match surrounding code style. Run `npm run build` before pushing.
- The calendar lives behind magic-link auth, so it can't be driven in a local preview without signing in. Verify visually on the Vercel deploy.
- Cross-campaign features only appear when the account is in **2+ campaigns** with sessions/votes.
- Push is to `main`; Vercel deploys automatically. Vercel env vars mirror `.env.local` but `NEXT_PUBLIC_SITE_URL` is the live URL.

## Where to find secrets

| Secret | Location |
|---|---|
| Supabase URL / anon / service-role keys | Supabase → Project → Settings → API |
| Resend API key | resend.com → API Keys |
| Vercel env vars | Vercel → Project → Settings → Environment Variables |
