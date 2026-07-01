# @vestige/journal

The **Journal** module of Vestige — session notes, annotations, comments, and a
change log, one living book per campaign. Runs as its own Next.js app inside the
Vestige monorepo and shares the platform header, Supabase database, and design
system.

```bash
pnpm --filter @vestige/journal dev   # http://localhost:3002
```

Requires `apps/journal/.env.local` (gitignored) with the same Supabase vars as
`apps/web` plus optional cross-app URLs:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_WEB_URL=http://localhost:3001
NEXT_PUBLIC_CALENDAR_URL=http://localhost:3000
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Entry — redirects to the user's most recent campaign, or to `apps/web` `/app` |
| `/c/[campaignId]` | Session list (Journal home for a campaign) |
| `/c/[campaignId]/s/new` | Create a session (edit mode) |
| `/c/[campaignId]/s/[sessionId]` | Session detail (read mode) — Recap / Comments / Change Log |
| `/c/[campaignId]/s/[sessionId]/edit` | Edit an existing session |
| `/c/[campaignId]/settings` | Campaign settings (name, cover, members, modules, danger zone) |

The `/c/[campaignId]` **layout** renders the persistent `VestigeHeader`
(`currentModule="journal"` + the campaign selector) and **guards membership** —
non-members and signed-out users are redirected to `apps/web` `/app`.

## Data flow

All reads/writes go through the shared Supabase project (`@vestige/db`). Writes
are **server actions** (`app/c/[campaignId]/s/actions.ts`,
`.../settings/actions.ts`) and run under the signed-in user's RLS (campaign
membership; campaign edits are creator-only).

| Page | Reads | Writes |
|---|---|---|
| Session list | `journal_sessions`, `campaign_members` (hero avatars), `profiles` | — |
| Session detail | `journal_sessions`, `journal_session_characters`+`journal_characters`, `journal_annotations`, `journal_comments`/`journal_session_revisions` (counts), `campaigns.modules_enabled`, `profiles` | `journal_annotations` (+ `journal_session_revisions`) via the read-mode "+" composer |
| Session edit | `journal_sessions`, characters | `journal_sessions` (create/save), `journal_session_revisions`, `journal_characters`+`journal_session_characters` |
| Comments tab | `journal_comments`, `profiles` | `journal_comments` (+ `commented` revision) |
| Change Log tab | `journal_session_revisions`, `profiles` | — |
| Settings | `campaigns`, `campaign_members`+`profiles` | `campaigns` (name/modules/delete), `campaign_members` (role/remove), `invitations` (invite) |

Notes are stored as **Markdown** across four columns
(`journal_sessions.summary` / `player_characters` / `npcs` / `notes`), edited
with **Tiptap**. Annotations anchor to a paragraph via `anchor = "${section}:${index}"`.

## The campaign selector

Lives in the shared header (`@vestige/ui` → `CampaignSelector`, a Radix
dropdown). The `/c/[campaignId]` layout fetches the user's campaigns
(`getMyCampaigns`) and passes them — each with a precomputed `href` — to
`VestigeHeader`. Clicking a campaign navigates to `/c/[thatId]`, so the user can
switch campaigns from anywhere in the Journal. "View all campaigns →" links to
the platform overview in `apps/web` `/app`; "Manage this campaign" → settings.
(Hrefs are precomputed server-side because functions can't cross the
server→client component boundary.)

## Known scoping (see the Vestige migration docs)

- **Image upload to storage** is UI-only (cover / session image / section images
  render but don't persist yet — needs a storage bucket).
- **Comment image attachments** aren't stored (`journal_comments` has no image
  column — additive migration needed).
- **Autosave revision throttle** is simplified: explicit Save logs an `edited`
  revision; autosave persists the draft silently.
- Local dev on `:3002` has **no auth session** (cross-origin cookie); sign in on
  the journal origin or run behind one domain in production.
