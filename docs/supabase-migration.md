# Vestige — Supabase Schema Migration Plan

**Status:** PLAN ONLY. No SQL is written or executed by this document. The SQL
lands in Milestone 7 (`supabase/migrations/`); execution happens later, by you,
against a branch first and then production.

**Goal:** Promote the existing **Council of Days** production Supabase project
(`oyalinqyqwztwkqqtmgx`) to be the Vestige platform database, adding the Journal
module's tables and a `modules_enabled` concept — **without renaming, dropping,
or altering any existing table, column, foreign key, policy, or row.** Existing
votes, polls, campaigns, members, and users are preserved exactly.

**Migration philosophy:** additive only. Every change is a `CREATE … IF NOT
EXISTS`, `ADD COLUMN IF NOT EXISTS`, or a brand-new policy/function. Nothing
existing is touched.

---

## 1. Safety inventory — what stays exactly as-is

The migration **must not** rename, drop, re-type, or re-key any of the following.
This is the freeze list. (Source: `apps/calendar/supabase/migrations/0001`–`0005`,
all five currently applied to the live project.)

### Existing tables (frozen — no destructive change)

| Table | Primary key | Notable columns | Used by |
|---|---|---|---|
| `public.profiles` | `id` → `auth.users(id)` | `email`, `character_name`, `display_name`, `avatar_url`, `created_at`, `updated_at` | both |
| `public.campaigns` | `id` | `slug` (unique), `name`, `note`, `creator_id`, `phase`, `viable_weekdays`, `background`, `banner_url`, `created_at` | both |
| `public.campaign_members` | `(campaign_id, user_id)` | `role`, `joined_at`, `is_dm`, `character_name`, `avatar_url` | both |
| `public.invitations` | `id` | `campaign_id`, `user_id`, `email`, `status`, `invited_at` | calendar |
| `public.votes` | `(campaign_id, user_id, date)` | `value`, `updated_at` | calendar |
| `public.campaign_sessions` | `(campaign_id, date)` | `note`, `created_at` | calendar |
| `public.user_images` | `id` | `user_id`, `url`, `created_at` | both |

### Existing enums (frozen)
`campaign_phase`, `member_role` (`creator`/`participant`), `vote_value`,
`invitation_status`, `background_scene`.

### Existing functions / triggers (frozen — reused, not modified)
- `is_campaign_member(uuid)` — `SECURITY DEFINER`, returns whether `auth.uid()`
  is a member. **The Journal RLS reuses this verbatim.**
- `is_campaign_creator(uuid)` — `SECURITY DEFINER`, creator check. Reused for
  Journal write policies.
- `handle_new_user()` + `on_auth_user_created` trigger — auto-creates a profile.
- `slugify()`, `campaigns_set_slug()` + trigger.
- `accept_invitation(uuid)` RPC.

### Existing storage (frozen)
Buckets `avatars`, `banners` and their `storage.objects` policies. The Journal
module reuses `avatars` for character/session portraits (its per-user-folder RLS
already applies); a new `journal` bucket is optional (see §6).

> **Confirmed:** `campaign_members` already exists with exactly the membership
> shape the platform needs (`campaign_id`, `user_id`, `role`, `is_dm`,
> per-campaign `character_name`/`avatar_url`). **It is reused as-is for Journal.**
> No new members table is introduced. The brief's "Member — user × campaign with
> role (DM/player)" maps onto `campaign_members` (`is_dm` distinguishes DM from
> player; `role` tracks ownership).

---

## 2. Additive columns (defaults preserve current behaviour)

All `ADD COLUMN IF NOT EXISTS` — no data rewrite, no lock beyond a fast catalog
update.

### 2.1 `campaigns.modules_enabled`
```
modules_enabled jsonb not null
  default '{"calendar": true, "journal": false}'::jsonb
```
- Every existing CoD campaign **back-fills to Calendar-only**, so current
  behaviour is unchanged — no campaign suddenly gains a Journal.
- `apps/web` already defaults to this exact value in code
  (`@vestige/domain` → `DEFAULT_MODULES_ENABLED`); once the column exists, the
  app reads the stored value instead (see the `TODO(M7)` in
  `apps/web/lib/campaigns.ts`).
- Optional hardening (recommend): a `CHECK` that the jsonb has boolean
  `calendar` and `journal` keys.

### 2.2 `profiles.first_name`
```
first_name text
```
- Nullable, no default → existing rows get `NULL`, no behaviour change.
- **Decision needed (§8, Q3):** `profiles` already has `display_name`. The
  platform's `User.firstName` could either (a) add `first_name` alongside
  `display_name`, or (b) reuse `display_name`. This plan assumes (a) additive
  `first_name`; the app falls back `first_name → display_name → email-local`.

### 2.3 No other shared columns required
Global portrait already exists as `profiles.avatar_url`; per-campaign portrait as
`campaign_members.avatar_url`. The platform `User`/`Member` concepts map onto
existing columns — only `first_name` and `modules_enabled` are genuinely new.

---

## 3. New Journal tables

> **Naming decision (§8, Q1):** the brief names the central table `sessions`,
> but **`public.campaign_sessions` already exists** (calendar play-date markers).
> A bare `sessions` table risks confusion and accidental cross-wiring. This plan
> **recommends a `journal_` prefix** for the new module tables and documents both.
> The schema below uses the recommended prefixed names with the brief's name in
> a comment. Confirm before M7 writes SQL.

All new tables: additive `CREATE TABLE IF NOT EXISTS`, RLS enabled, FK
`on delete cascade` to their parent so a deleted campaign/session cleans up its
journal data (and never touches votes/polls).

### 3.1 `journal_sessions`  *(brief: `sessions`)*
A single chronicled session within a campaign.
```
id          uuid pk default gen_random_uuid()
campaign_id uuid not null → campaigns(id) on delete cascade
title       text not null
date        date
summary     text
image_url   text
created_by  uuid not null → auth.users(id)
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()
updated_by  uuid → auth.users(id)
```
Index: `(campaign_id, date desc)`.

### 3.2 `journal_characters`  *(brief: `characters`)*
PCs and NPCs in a campaign. Distinct from the lightweight per-campaign identity
on `campaign_members` (which stays for the calendar). PCs *may* later link to a
member via a nullable `member_user_id` (deferred; see §8, Q2).
```
id           uuid pk default gen_random_uuid()
campaign_id  uuid not null → campaigns(id) on delete cascade
name         text not null
role         text not null check (role in ('PC','NPC'))
portrait_url text
bio          text
created_at   timestamptz not null default now()
```
Index: `(campaign_id)`.

### 3.3 `journal_session_characters`  *(brief: `session_characters`)*
Join: which characters appeared in a session.
```
session_id   uuid not null → journal_sessions(id) on delete cascade
character_id uuid not null → journal_characters(id) on delete cascade
primary key (session_id, character_id)
```

### 3.4 `journal_annotations`  *(brief: `annotations`)*
Inline notes anchored to a point/block in a session.
```
id         uuid pk default gen_random_uuid()
session_id uuid not null → journal_sessions(id) on delete cascade
anchor     text not null      -- text reference or block id
body       text not null
author_id  uuid not null → auth.users(id)
created_at timestamptz not null default now()
```
Index: `(session_id)`.

### 3.5 `journal_comments`  *(brief: `comments`)*
Threaded discussion on a section of a session.
```
id                uuid pk default gen_random_uuid()
session_id        uuid not null → journal_sessions(id) on delete cascade
section_anchor    text
body              text not null
author_id         uuid not null → auth.users(id)
parent_comment_id uuid → journal_comments(id) on delete cascade   -- threading
created_at        timestamptz not null default now()
```
Index: `(session_id)`, `(parent_comment_id)`.

### 3.6 `journal_session_revisions`  *(brief: `session_revisions`)*
Powers the Change Log.
```
id           uuid pk default gen_random_uuid()
session_id   uuid not null → journal_sessions(id) on delete cascade
author_id    uuid not null → auth.users(id)
action       text not null check (action in
               ('created','edited','commented','annotated','image_added','character_added'))
before_value jsonb
after_value  jsonb
created_at   timestamptz not null default now()
```
Index: `(session_id, created_at desc)`.

> `before_value`/`after_value` are `jsonb` (rather than `text` as the brief
> sketched) so structured diffs can be stored and queried — a non-breaking
> choice since the table is brand new. Confirm if you'd prefer `text`.

---

## 4. RLS for all new tables

Every new table gets RLS enabled and policies that **reuse the existing
`SECURITY DEFINER` helpers** so there is exactly one source of truth for
membership. The campaign is resolved directly (`journal_sessions`,
`journal_characters`) or via the parent session (`journal_*` children).

**Pattern A — tables with a direct `campaign_id`** (`journal_sessions`,
`journal_characters`):
- `SELECT`: `is_campaign_member(campaign_id)`
- `INSERT`/`UPDATE`/`DELETE`: members may write (DM-vs-player gating done in the
  app/server action, mirroring how the calendar already does session marks). If
  you want DB-enforced DM-only writes, swap to `is_campaign_creator(campaign_id)`
  or add an `is_dm` check — **decision §8, Q4.**

**Pattern B — child tables keyed by `session_id`** (`journal_session_characters`,
`journal_annotations`, `journal_comments`, `journal_session_revisions`): policies
resolve the campaign through the parent session, e.g.
```
using (
  is_campaign_member(
    (select campaign_id from journal_sessions s where s.id = session_id)
  )
)
```
A `SECURITY DEFINER` helper `journal_session_campaign(session_id uuid) returns uuid`
will be added to keep these policies readable and avoid recursive RLS on
`journal_sessions`.

- Authors may always edit/delete their own `annotations`/`comments`
  (`author_id = auth.uid()`), matching the calendar's self-scoped vote pattern.
- `journal_session_revisions` is **append-only**: `INSERT` for members,
  `SELECT` for members, **no UPDATE/DELETE policy** (immutability for the log).

All policies are scoped `to authenticated`.

---

## 5. Rollback plan

Fully reversible with no impact on existing data. Drop children before parents
(FK order); drop the additive columns last.

```
-- new tables (children → parents)
drop table if exists public.journal_session_revisions;
drop table if exists public.journal_comments;
drop table if exists public.journal_annotations;
drop table if exists public.journal_session_characters;
drop table if exists public.journal_characters;
drop table if exists public.journal_sessions;

-- helper added for child RLS
drop function if exists public.journal_session_campaign(uuid);

-- additive columns
alter table public.campaigns drop column if exists modules_enabled;
alter table public.profiles  drop column if exists first_name;
```
`drop table` cascades only the Journal tables' own policies/indexes/FKs. Because
nothing references the dropped columns from existing tables, the column drops are
safe. **No existing votes/polls/users/campaigns rows are affected by any step.**

---

## 6. Staging plan — run on a Supabase branch first

Use Supabase's database branching so the migration is validated against a copy of
the production schema before it ever touches prod.

> Prerequisite: branching requires the project on a plan that supports it and a
> linked repo. Confirm in the dashboard first.

```
# from the repo root, with the CLI installed and authed
supabase login
supabase link --project-ref oyalinqyqwztwkqqtmgx

# create a persistent branch (gets its own ephemeral Postgres)
supabase branches create vestige-journal

# the M7 SQL lives in supabase/migrations/. Push it to the branch:
supabase db push --branch vestige-journal

# smoke-test against the branch:
#  - confirm all 7 existing tables + their row counts are intact
#  - confirm the 6 new journal_* tables exist with RLS enabled
#  - run the app suites pointed at the branch's connection string
supabase branches list        # grab the branch's API URL + anon key for testing
```
Validation checklist on the branch:
- `select count(*)` on `votes`, `campaigns`, `campaign_members`, `profiles`
  matches production (no row loss — branches copy schema, not prod rows, so this
  is really a "did anything in the migration error" check).
- `\d+ public.campaigns` shows `modules_enabled` with the expected default.
- Every existing policy/function still present (`\df`, `\dp`).
- Inserting a `journal_sessions` row as a non-member is rejected by RLS.

If anything is wrong, fix the SQL and re-push to the branch. Delete the branch
when done: `supabase branches delete vestige-journal`.

---

## 7. Production cutover (ordered)

1. **Apply the migration to production** only after the branch passes — via
   `supabase db push` (linked to prod) or by pasting the M7 SQL into the SQL
   Editor (it is idempotent, matching the CoD migration style).
2. **Verify** the safety inventory on prod (counts unchanged; new tables present;
   `modules_enabled` defaulted on all existing campaigns).
3. **Point the apps at the one project.** All three apps read the same vars
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`):
   - `apps/calendar` — **already** points at this project. **No change.**
   - `apps/web` — set its env (currently the gitignored local `.env.local` copy)
     to the same project in its deployment.
   - `apps/journal` — set the same env vars when its data layer is built (it has
     none yet; today it's a placeholder shell).
4. **Flip a campaign's Journal on** by setting
   `modules_enabled = '{"calendar":true,"journal":true}'` for that campaign —
   purely additive, reversible, and per-campaign.
5. Keep the rollback script (§5) ready; it is safe to run at any time.

---

## 8. Decisions to confirm before Milestone 7 writes SQL

1. **Table naming — `journal_` prefix?** Recommend `journal_sessions`,
   `journal_characters`, etc. (avoids collision with existing
   `campaign_sessions` and namespaces the module). Or keep the brief's bare
   `sessions`/`characters`/`comments`/`annotations`. **Recommended: prefix.**
2. **Link journal PCs to members?** Add a nullable
   `journal_characters.member_user_id → auth.users(id)` now, or defer? This plan
   defers it (additive later, no risk). **Recommended: defer.**
3. **`profiles.first_name` vs reuse `display_name`?** Plan adds `first_name`
   additively. Confirm, or map `User.firstName` onto existing `display_name`.
4. **Journal write authorization in RLS:** members-write (app gates DM-only) vs
   DB-enforced creator/DM-only writes. Plan assumes members-write for
   flexibility, matching the calendar's existing approach.
5. **`before_value`/`after_value` type:** `jsonb` (recommended) vs `text`.
6. **Separate `journal` storage bucket** for session images, or reuse `avatars`?
   Plan reuses `avatars` unless you want isolation.

Nothing here is executed. On your confirmation of the above, Milestone 7 writes
`supabase/migrations/<timestamp>_vestige_journal_init.sql` and a matching
`_rollback.sql`.
