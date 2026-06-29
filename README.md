# Vestige

A single platform consolidating two D&D companion apps into shared infrastructure:

- **Calendar** — session scheduling & voting (migrated from the **Council of Days** app; live production data)
- **Journal** — session journal & change log (the **Chronicle** concept; *not yet built — scaffolded fresh in this monorepo*)

Both modules sit on a shared platform shell (`apps/web`) that handles auth, the landing
page, and the global header / campaign list.

## Planned structure

```
vestige/
├── apps/
│   ├── web/         # Platform shell: landing, magic-link auth, header, campaign list
│   ├── calendar/    # @vestige/calendar — migrated from Council of Days
│   └── journal/     # @vestige/journal — scaffolded fresh (Chronicle does not exist yet)
├── packages/
│   ├── db/          # Supabase client factory (server + browser) + generated DB types
│   ├── ui/          # Shared React components (VestigeHeader, HeroBand, buttons, …)
│   ├── domain/      # Shared TS types: Campaign, Member, User, ModulesEnabled
│   └── config/      # Shared Tailwind preset, ESLint config, tsconfig base
├── supabase/
│   └── migrations/  # Additive, non-destructive migrations (Milestone 7)
├── docs/
│   └── supabase-migration.md   # Migration plan (Milestone 6)
├── package.json     # Root workspace (private, name "vestige")
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

> Note: `packages/`, `supabase/`, and `docs/` are created in later milestones. The
> structure above is the target; it is built up incrementally (see Roadmap).

## Shared platform concepts

These are consistent across both modules:

- **Campaign** — name, image, description, owner, members, `modules_enabled: { calendar: boolean, journal: boolean }`
- **Member** — user × campaign join with role (DM/player), character name, character portrait
- **User** — Supabase auth user with `first_name` and a global portrait
- **Auth** — magic-link is the only auth method

## Tooling

- **Package manager:** pnpm (workspaces). Do not generate `package-lock.json` or `yarn.lock`.
- **Build orchestration:** Turborepo (`build`, `dev`, `lint`, `typecheck`).
- **TypeScript:** strict mode everywhere, extending `tsconfig.base.json`.

```bash
pnpm install            # install all workspaces
pnpm dev                # run all apps in dev (turbo)
pnpm --filter @vestige/calendar dev   # run a single app
pnpm turbo run typecheck
pnpm turbo run lint
```

## Database

Vestige **promotes the existing Council of Days production Supabase project** to be the
platform database — it is **not** a fresh project. All migrations are **additive and
non-destructive**: existing votes, polls, users, and campaigns are preserved. See
`docs/supabase-migration.md` (Milestone 6) for the full safety inventory and plan.

## Source repos (reference — never modified, never deleted)

- Council of Days: `/Users/Felix.Hoge/CouncilOfDays/`
- Chronicle: *does not exist yet — Journal will be scaffolded fresh*

## Roadmap (milestones)

1. ✅ Initialize the monorepo (this commit)
2. Migrate Calendar (Council of Days) → `apps/calendar`
3. Scaffold Journal → `apps/journal` (fresh; Chronicle not yet built)
4. Scaffold `apps/web` platform shell
5. Extract shared packages (`db`, `ui`, `domain`, `config`)
6. Plan the Supabase schema migration (no execution)
7. Write the migration SQL (no execution)
