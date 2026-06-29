# Council of Days — Project Handover

**Date:** 2026-06-18  
**Handing over from:** Mac (Felix.Hoge)  
**Continuing on:** Windows + GitHub access  

---

## What Is This?

**Council of Days** is a D&D session scheduling web app.  
- A Dungeon Master creates a **campaign poll**.  
- Players receive an invite link and vote on available dates.  
- The app finds the **best day** (most yes votes, with DM marked as available).

**Live URL:** Deployed on Vercel (check Vercel dashboard for the exact URL).  
**GitHub Repo:** https://github.com/weltheld/council-of-days  

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (React 19) |
| Database & Auth | Supabase (PostgreSQL + Row Level Security + Magic Link OTP) |
| Storage | Supabase Storage (avatars + campaign banners) |
| Email | Resend (via Supabase custom SMTP) |
| Deployment | Vercel |
| Styling | Tailwind CSS 3 + custom CSS variables |
| Icons | Lucide React |
| Image processing | Canvas API (client cropper) + sharp (favicon raster) |

---

## First-Time Windows Setup

### 1. Clone & Install

```bash
git clone https://github.com/weltheld/council-of-days.git
cd council-of-days
npm install
```

### 2. Create `.env.local`

Create the file `council-of-days/.env.local` with these values.  
**Get the real secrets from Felix or the Supabase/Vercel dashboards.**

```env
NEXT_PUBLIC_SUPABASE_URL=https://oyalinqyqwztwkqqtmgx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase → Project Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Project Settings → API>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never expose it to the browser.

### 3. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Supabase Setup (already done — for reference)

The Supabase project is live. The three migrations below have already been applied:

| File | What it does |
|---|---|
| `supabase/migrations/0001_init.sql` | Full schema: users, campaigns, members, votes, invitations |
| `supabase/migrations/0002_storage_and_banner.sql` | Storage buckets (avatars, banners) + banner_url column |
| `supabase/migrations/0003_member_dm_role.sql` | `is_dm` boolean on `campaign_members` |

**If you ever need to re-apply a migration:** paste the SQL into the Supabase SQL Editor and run it.

### Email Templates

Two custom HTML email templates live in `supabase/email-templates/`:
- `magic-link.html` — the sign-in OTP email
- `invite.html` — the campaign invitation email

These need to be pasted into **Supabase → Authentication → Email Templates** in the dashboard. (They use a logo image hosted at `/public/images/table-mark.png` — this is a 192px PNG.)

### Custom SMTP

Email is sent via **Resend** configured as Supabase custom SMTP. Sender address: `council-of-days@felixhoge.de` on domain `send.felixhoge.de`.

---

## Project Structure

```
app/
  auth/callback/route.ts    ← Magic link handler; auto-enrolls users; routes to /home or /profile
  home/page.tsx             ← Campaign list dashboard
  home/inviteActions.ts     ← Accept / Decline invitation server actions
  g/[slug]/page.tsx         ← Campaign calendar page (server component)
  g/[slug]/bannerActions.ts ← Banner upload server action (service role)
  g/[slug]/roleActions.ts   ← Set DM / Remove member server actions
  g/[slug]/invite/          ← Invite players page
  new/page.tsx              ← Create new campaign
  profile/page.tsx          ← User onboarding / profile edit
  login/page.tsx            ← Magic link sign-in

components/council/
  GroupViewClient.tsx    ← Main calendar page (client). Banner layout, sidebar, handlers.
  CalendarPanel.tsx      ← Month grid + color legend + month navigation
  DayCell.tsx            ← Individual day tile: vote color, counts, best-day badge, hover tooltip
  QuickFillBar.tsx       ← Bulk vote fill + reset (collapsible on mobile)
  RosterPanel.tsx        ← Member list in sidebar (DMs first, mask icon)
  OwnerSettings.tsx      ← Poll settings panel: roles, weekdays, banner, background
  AppHeader.tsx          ← Top bar: logo/wordmark, profile chip, sign-out
  ProfileEditor.tsx      ← Avatar + character name + display name form (shared)
  ProfileDialog.tsx      ← Profile editor as an overlay dialog (opened from header chip)
  ImageCropper.tsx       ← Canvas-based pan/zoom image cropper (avatar + banner)
  Avatar.tsx             ← User avatar with Gold Table Mark fallback
  Crest.tsx              ← Inline SVG Gold Table Mark logo (ring + 8 seat dots)
  PendingInvites.tsx     ← Accept/Decline cards on home page

lib/
  supabase/
    client.ts            ← Browser Supabase client
    server.ts            ← Server Supabase client (cookie-based)
    service.ts           ← Service-role client (bypasses RLS — server only)
    middleware.ts        ← Redirect /login and / → /home if logged in
  calendar.ts            ← Month grid builder, date utils
  types.ts               ← Shared TypeScript types

public/images/
  table-mark.png         ← 192px Gold Table Mark PNG (used in emails)
```

---

## Key Architecture Patterns

### Service-Role Pattern (IMPORTANT)

All writes that hit Supabase Row Level Security (storage uploads, membership inserts, invitations) go through **server actions** that use `getServiceRoleSupabase()` from `lib/supabase/service.ts`. The action manually verifies the user's identity first, then uses the service role to write.

Never use the service role client in client components or expose it to the browser.

### Auth Flow

1. User enters email → Supabase sends magic link OTP email.
2. Link redirects to `/auth/callback?token_hash=...&next=...`.
3. `route.ts` exchanges the OTP, then:
   - Claims any email-addressed invitations.
   - If `next` starts with `/g/`, auto-joins that campaign.
   - If profile is incomplete → `/profile`.
   - Otherwise → most recent campaign or `/home`.

### Banner Storage

- Cropped JPEG stored at: `banners/{campaignId}/banner.jpg`
- Full original stored at: `banners/{campaignId}/original` (for re-cropping)
- "Adjust crop" in Poll Settings fetches the original, re-opens the cropper.
- Cropper aspect ratio: **12:1** to match the slim mobile band.

---

## Design System

Fonts (via next/font):
- **Cinzel** — display font (headings, labels, buttons)
- **Alegreya Sans** — body font

Key CSS variables (defined in `app/globals.css`):

| Variable | Use |
|---|---|
| `--color-parchment` | Main warm background |
| `--color-surface` | Card/panel surfaces |
| `--color-ink` | Primary text |
| `--color-ink-soft` | Secondary text |
| `--color-wine` | Primary accent (buttons, today marker) |
| `--color-dm-gold` | DM / best-day accent |
| `--color-hairline` | Borders and dividers |
| `--color-vote-yes` | Yes vote (deep green) |
| `--color-vote-maybe` | Maybe vote (dark gold) |
| `--color-vote-no` | No vote (red) |

---

## Current State (as of 2026-06-18)

### What's Working
- Sign-up, login (magic link), profile setup
- Create campaigns + invite players by email
- Auto-join via invite link + accept/decline for existing users
- Calendar voting (yes/maybe/no), bulk fill, reset
- Best day calculation (most yes votes where DM is free)
- Campaign banner: upload → crop → store original for re-crop
- Poll settings: member roles (DM/Player), remove member, viable weekdays, background
- Color-coded day tiles with counts + hover tooltips + color legend
- DMs sorted first in roster with mask icon
- Mobile-responsive layout (calendar first on mobile, sidebar below)

### Banner Layout (Option A — last implemented)
- **Mobile:** slim full-width band at top of page (h-[72px])
- **Desktop:** tall banner (h-44) at the top of the LEFT sidebar column, campaign name overlaid with gradient scrim
- Poll settings button is in the sidebar, not on the banner

### Last Git Commit
`e8922c0` — Sidebar banner (Option A); simplify day tiles + color legend

---

## What Still Needs Work (Known TODOs)

1. **Banner height** — Felix asked for more height on the desktop sidebar banner. The current value is `h-44` (176px). The font size of the campaign name overlay should also be made smaller to match. This was the **last open request** and has NOT been implemented yet — start here.

2. **Email templates** — if the Supabase email templates haven't been pasted into the dashboard yet, do that (copy from `supabase/email-templates/*.html`).

3. **Migration 0003** — if the `is_dm` column is missing, run `supabase/migrations/0003_member_dm_role.sql` in the Supabase SQL Editor.

---

## Deployment

- **Vercel** project connected to `weltheld/council-of-days` on GitHub.
- Push to `main` → auto-deploys.
- Environment variables are set in Vercel dashboard (same keys as `.env.local`, but `NEXT_PUBLIC_SITE_URL` points to the live Vercel URL, not localhost).

---

## Where to Find Credentials

| Secret | Where to find it |
|---|---|
| Supabase URL + Anon Key | Supabase → Project → Settings → API |
| Supabase Service Role Key | Same page (scroll down) |
| Resend API Key | resend.com → API Keys |
| Vercel env vars | Vercel → Project → Settings → Environment Variables |

---

## Quick Command Reference

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (run before pushing if unsure)
npm run lint         # ESLint check
git push origin main # Deploy to Vercel
```
