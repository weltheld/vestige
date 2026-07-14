# Vestige — Native App Draft Brief

> Handoff context for drafting a native-app version of Vestige. Written 2026-07-14.
> Read this first; verify anything load-bearing against the code.

## What Vestige is

A D&D campaign platform for groups: **one Next.js 15 app** (`apps/web` in this
repo, pnpm/Turborepo) live at https://vestige-web-pi.vercel.app. Supabase
(project `oyalinqyqwztwkqqtmgx`) for Postgres + RLS + auth + storage.

### Modules (all inside apps/web)
| Module | Routes | What it does |
|---|---|---|
| **Platform home** | `/app` | Campaign list, upcoming sessions rail (with player availability avatars), recent activity, pending invites, join-code redeem |
| **Calendar** (Council of Days) | `/calendar/g/[slug]` | Session-date polls: yes/maybe/no votes per day, best-day surfacing, DM marks play-dates, cross-campaign conflict markers |
| **Journal** | `/journal/c/[id]`, `/s/[sessionId]` | Session chronicle: markdown write-ups (summary/PCs/NPCs/notes), annotations/comments, revisions |
| **Codex** | `/journal/c/[id]/codex` | Campaign reference: entries of kind person/place/event/item/creature, images, AI summaries with session footnotes, @-mention crosslinks (codex + session links), "Appears in" provenance |
| **Settings** | `/journal/c/[id]/settings` | Tabbed dialog: campaign (name/cover/modules), players & invites (email/magic-link/join-code, remove member, member "Leave campaign"), Familiar connection, AI keys |

### Companion ecosystem
- **Familiar** (`~/dnd-recap-bot`, Electron): records Discord D&D sessions,
  transcribes locally, POSTs recaps + first-pass codex entities to
  `/journal/api/familiar/ingest` with a per-campaign token.

## Tech facts a native draft must respect

- **Auth is magic-link OTP only** (Supabase, no passwords). Emails via Resend,
  sender `council-of-days@send.felixhoge.de`. Native implication: deep-link /
  universal-link handling for the callback, or switch to Supabase's native
  OTP-code flow (6-digit) on mobile — decide in the draft.
- **All authorization is Postgres RLS** on `campaign_members` /
  `is_campaign_member` / `is_campaign_creator`. A native client using
  `supabase-js` inherits this for free — no custom API needed for reads and
  most writes. Privileged flows (invites, ingest) are Next server actions /
  routes today; native would call new thin API routes or reuse Supabase
  directly where RLS allows.
- **Types**: hand-maintained DB types in `packages/db/src/types.ts` —
  shareable with a TS-based native app (Expo/React Native could import
  `@vestige/db` and `@vestige/domain` from this monorepo).
- **Storage buckets**: `avatars`, `banners`, `journal-images` (public URLs).
- **Markdown conventions**: journal/codex text stores crosslinks as
  `[Name](codex:<uuid>)` and `[Title](session:<uuid>)`; codex summaries carry
  footnote markers `[n]` with a trailing legend after `—`. Any native renderer
  must handle these two link protocols + footnotes.

## Design language

Parchment/ink fantasy theme, multiple color themes (light/dark variants).
Tokens live in `packages/ui/src/styles/tokens.css` and Calendar's
`globals.css`: `--color-parchment` (bg), `--surface` (cards), `--ink`/
`--ink-soft` (text), `--wine` (primary), `--gold`/`--dm-gold` (accents),
`--hairline` (borders), vote colors (yes green / maybe gold / no red).
Fonts: **Cinzel** (display, small-caps headers) + **Lora** / Alegreya Sans
(body). Signature elements: crest medallion ("wax seal") for marked play
dates, gold pipe + small-caps section labels, quiet text-only status labels.

## Why native (assumed motivations — verify with Felix)

- Push notifications (new session date set, recap ingested, invite received,
  "vote on dates" nudges) — the single biggest capability the web app lacks.
- Home-screen presence for players who only vote + read recaps.
- Possibly offline reading of journal/codex at the table.

## Open decisions the draft should settle

1. **Platform strategy**: Expo/React Native (shares TS + monorepo packages,
   one codebase, push via Expo) vs. Capacitor wrap of the existing web app
   (fastest, but webview feel) vs. Swift/Kotlin (most work). Felix is a UX
   designer; DX with hot-reload previews matters.
2. **Scope of v1**: player-focused companion (vote, read recaps/codex, get
   notified) vs. full parity incl. DM/manage flows. Recommendation seed:
   players-first; DMs already live on desktop.
3. **Auth UX on mobile**: magic-link deep link vs. 6-digit email OTP code
   (Supabase `signInWithOtp` supports both; code avoids mail-app roundtrip).
4. **Editor**: the journal/codex tiptap editor does not port to native —
   read-only first? Simplified native editor later?
5. **Monorepo placement**: `apps/mobile` in this repo (shares packages) vs.
   separate repo.

## Key files to read when drafting

- `apps/web/app/app/page.tsx` — platform home (what a mobile home distills)
- `apps/web/lib/upcoming.ts` — upcoming-session/availability logic
- `apps/web/components/council/GroupViewClient.tsx` + `DayCell.tsx` — voting UX
- `apps/web/lib/journal/sessions.ts`, `session-detail.ts` — journal data shapes
- `apps/web/lib/journal/npcs.ts` — codex data shapes
- `packages/db/src/types.ts` — the whole DB surface
- `packages/ui/src/styles/tokens.css` — design tokens

## Working conventions (from prior sessions)

- Multi-machine: always `git fetch` + rebase before pushing.
- "Deploy" = push to `master`, Vercel auto-deploys.
- Never start localhost dev servers unless explicitly asked.
- German-speaking user; UI copy is English.
