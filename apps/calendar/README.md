# Council of Days

A local-first D&D scheduling app. Build from your `D&D Planner.pen` designs (Pencil app).

> Gather your party. Choose your day.

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> &mdash; you'll be redirected to `/login`. Any email works; the magic link is mocked and shown on-page so you can click straight through.

The app ships pre-seeded with **The Emberfall Company** so the calendar lights up immediately. Visit `/g/emberfall` to skip auth and see the main view.

### Useful URLs

| Path                            | What you see                                         |
| ------------------------------- | ---------------------------------------------------- |
| `/login`                        | Sign-in (mocked magic link)                          |
| `/profile`                      | Character + display name + portrait                  |
| `/new`                          | Found a new company (you become DM)                  |
| `/g/emberfall`                  | Main view: roster + month calendar                   |
| `/g/emberfall/invite`           | Magic invite link + party list                       |
| `/g/emberfall/d/2026-06-19`     | Day detail side panel (calendar stays mounted)       |

### Reset demo data

Open DevTools &rarr; `localStorage.clear()` and refresh.

## What's inside

```
app/
  layout.tsx        Cinzel + Alegreya Sans via next/font, design tokens
  login/            Magic link form
  profile/          Character setup (Filled + Error states from pen)
  new/              Create a new company
  g/[slug]/
    layout.tsx      Shell with parallel @panel slot
    page.tsx        Roster + calendar (renders <GroupView />)
    default.tsx     Same view, used as fallback when day panel is open
    invite/         Invite players
    @panel/
      default.tsx   No-op
      d/[date]/     Day Detail side sheet
components/council/  ParchmentCard, Crest, Avatar, VoteChip, etc.
lib/
  types.ts          User, Group, Member, Vote
  store.ts          Zustand + localStorage (single source of truth)
  calendar.ts       Month grid + best-day computation
  seed.ts           The Emberfall Company demo data
public/images/      SVG portrait placeholders (one per seeded character)
```

## Design tokens

Lifted verbatim from `D&D Planner.pen` &rarr; `variables`:

| Token              | Value     | Used for                          |
| ------------------ | --------- | --------------------------------- |
| `--parchment`      | `#EDE4D3` | Card surfaces                     |
| `--surface`        | `#F6EFE0` | Body background                   |
| `--ink`            | `#2B2118` | Primary text                      |
| `--ink-soft`       | `#5A4A38` | Secondary text                    |
| `--hairline`       | `#D8C8AC` | Dividers, borders                 |
| `--wine`           | `#6B2230` | Primary buttons (wax stamp)       |
| `--gold` / soft    | `#B68A2E` | Accents, legend, focus rings      |
| `--dm-gold`        | `#7A5A12` | DM-only UI (crown, "Best Day")    |
| `--vote-yes/no/maybe` | parchment-toned greens/reds/golds | Vote chips |

Display font: **Cinzel** &middot; Body font: **Alegreya Sans** (both Google Fonts).

## Deploying to Vercel

This is a plain Next.js app &mdash; push to a GitHub repo, click "Import Project" on Vercel, done. No env vars required.

### Swapping localStorage for Vercel Postgres

Everything that touches storage goes through `lib/store.ts`. To migrate:

1. Add `@vercel/postgres` and run migrations for the schema in `lib/types.ts`.
2. Replace the Zustand `persist` middleware with API-route fetchers (each mutation in the store becomes a `POST /api/...` call).
3. Add proper auth (NextAuth with the existing magic-link UX flow already wired in `/login`).

Because every component reads through the same store hook, no component code needs to change.

## Notes on the designs

The 10 screens in `D&D Planner.pen` collapse into 6 routes &mdash; phone and desktop variants share components and respond to breakpoints, and the Profile "Filled" / "Error" pen variants are toggled via form validation in a single page.

The 9 image assets referenced in the pen file (`BG Parchment`, `Crest`, character avatars, `BG Tavern`) live in Pencil's local cache rather than alongside the `.pen` file. This build uses themed SVG placeholders. To swap in real exports, drop your PNG/JPG files into `public/images/` and point the `avatarUrl` fields in `lib/seed.ts` at them &mdash; or export from Pencil with **File &rarr; Export Assets**.
