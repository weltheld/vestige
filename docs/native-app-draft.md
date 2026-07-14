# Vestige Mobile — Native App Draft

> Drafted 2026-07-14 from `native-app-brief.md`, verified against the code.
> Status: **proposal** — decisions below are recommendations, marked ✅ where
> the brief seeded them and the code confirms feasibility.

## The one-line pitch

A players-first companion app: **vote on dates, read the chronicle, browse the
codex, get notified** — the four things players do between sessions, on the
device they actually have at hand.

---

## Decisions (settling the brief's five open questions)

### 1. Platform: Expo / React Native ✅

`apps/mobile` built with Expo (SDK 53+), TypeScript, expo-router.

Why, in order of weight:

- **The monorepo pays off immediately.** `packages/db/src/types.ts` is the
  whole DB surface, framework-free. `@vestige/db` and `@vestige/domain` import
  cleanly into RN. The server-side `lib/journal/*.ts` query modules are
  `server-only` but small and Supabase-client-generic — their query logic
  ports to shared `packages/queries` functions taking a `SupabaseClient<Database>`
  (the web's server components and the app can then share them).
- **Push is the raison d'être** and Expo Push Notifications is the lowest-ops
  path (one API, no direct APNs/FCM plumbing).
- **DX for a UX designer**: Expo Go / dev-client hot reload on a real phone
  beats every alternative. EAS handles builds/signing without Xcode ceremony.
- Capacitor is rejected: the webview feel undermines the main UX motivation,
  and push would still need native work. Swift/Kotlin rejected: two codebases,
  no type sharing, slowest iteration.

### 2. Scope v1: player companion ✅ (no DM/manage flows)

DMs already live on desktop; every management surface (settings, invites,
session editing, AI keys, Familiar) stays web-only. v1 is read + vote + notify:

| Screen | Distills (web) | Interactions |
|---|---|---|
| **Home** | `/app` platform home | Campaign switcher, upcoming-session card w/ availability avatars (`getUpcomingSlots` logic), recent activity, pending-invite accept, join-code redeem |
| **Calendar** | `/calendar/g/[slug]` | Month grid, tap-to-cycle yes/maybe/no vote, best-day + wax-seal set dates, cross-campaign conflict dots. **No** DM date-setting, no member management |
| **Journal** | `/journal/c/[id]` + session detail | Session list, full read view (summary/PCs/NPCs/notes, gallery, characters), annotations shown inline. Plain-text **comments allowed** (they're simple text bodies — no tiptap needed) |
| **Codex** | `/journal/c/[id]/codex` | Kind-filtered entry grid, detail w/ AI summary + footnotes, "Appears in" list, tappable crosslinks |
| **Profile** | header account chip | Display/character name, avatar, theme picker, notification prefs, sign out |

Explicitly out of v1: campaign creation, settings tabs, invite sending,
session/codex *editing*, Familiar management, DM vote-nudging tools.

### 3. Auth: 6-digit email OTP code, magic link as fallback ✅

`signInWithOtp({ email })` → user types the 6-digit code → `verifyOtp`.
No mail-app roundtrip, no universal-link infrastructure for v1.

- **Action item**: the Resend-delivered Supabase email template must include
  `{{ .Token }}` alongside the magic link so one template serves web (link)
  and mobile (code). Verify in the Supabase dashboard.
- Same `council-of-days@send.felixhoge.de` sender; no new email infra.
- Universal links can come later for invite deep-links, not needed for auth.

### 4. Editor: read-only v1, comments as the pressure valve ✅

The tiptap editor doesn't port and shouldn't. What players actually do on a
phone is *react*, and `journal_comments.body` is plain text — a native
`TextInput` covers it. Annotations render read-only (tap paragraph marker →
sheet). A simplified native editor is a v2+ question, likely never needed if
DM authorship stays on desktop.

### 5. Monorepo placement: `apps/mobile` in this repo ✅

Type sharing is the whole platform argument (see #1). Turborepo + pnpm handle
Expo fine (needs `node-linker` hoisting config — known pattern). Separate repo
would fork `types.ts` by hand within a month.

---

## Architecture

### Data access: supabase-js straight to Postgres, RLS does the auth

No new backend for reads/votes/comments — the existing RLS policies
(`is_campaign_member` etc.) are the API:

- Reads: campaigns, votes, sessions, journal, codex — direct `supabase-js`
  selects, mirroring the query modules already in `apps/web/lib`.
- Writes in v1: `votes` upsert (RLS-covered today — the web client already
  votes from the browser), `journal_comments` insert, profile/member updates,
  `accept_invitation` RPC, join-code redeem.
- Server-only flows (invite emails, Familiar ingest, AI summaries) are not in
  v1 scope, so **zero new API routes needed** except push registration (below).

State/caching: TanStack Query + AsyncStorage persistence. That gives
read-your-cache offline (journal/codex readable at the table on bad wifi)
without building sync. Full offline-first is explicitly out of scope.

### Push notifications — the only new backend work

New table + one delivery path:

```
push_tokens (user_id, expo_token, platform, updated_at)   -- RLS: owner-only
```

Events → recipients:

| Event | Trigger point | Recipients |
|---|---|---|
| Session date set | `setSessionAction` (web) | campaign members minus actor |
| Recap ingested | `/journal/api/familiar/ingest` | campaign members |
| Invite received | invite server action | invitee (if has account) |
| "Vote on dates" nudge | v1.1 — needs a scheduler | non-voters |

Delivery: a small `sendPush()` helper in the Next app (it already hosts every
trigger point) calling the Expo Push API with tokens read via service role.
No edge functions, no queues — volumes are D&D-group-sized.

### Rendering the two link protocols + footnotes

One shared markdown renderer (react-native-markdown-display + custom rules):

- `[Name](codex:<uuid>)` → navigates to codex entry (regex already exists:
  `CODEX_LINK_RE` in `lib/journal/npcs.ts` — lift into a shared package).
- `[Title](session:<uuid>)` → navigates to session detail.
- Codex summary footnotes `[n]` + trailing `—` legend → superscript markers,
  tap → source session.

### Design language on native

- Port `packages/ui/src/styles/tokens.css` to a typed theme object in
  `packages/ui-native` (or a `tokens.ts` next to the CSS, generated from one
  source so they can't drift). All five themes (parchment, midnight, nebula,
  ember, slate) come along for free.
- Fonts via `expo-font`: Cinzel (display/small-caps headers), Lora (body).
- Signature elements translate directly: wax-seal crest on set dates, gold
  pipe + small-caps section labels, quiet text status labels, vote tints.
- Navigation: bottom tab bar (Home / Calendar / Journal / Codex) + campaign
  switcher in the header — mirrors the web header's mental model.

---

## Milestones

1. **M0 — Scaffold**: `apps/mobile` in the monorepo, Expo + expo-router,
   `@vestige/db` imports type-checking, tokens ported, fonts loaded, OTP
   sign-in working against the live Supabase project.
2. **M1 — Read**: Home + Journal + Codex read views incl. link protocols and
   footnotes. (App is already useful at the table.)
3. **M2 — Vote**: Calendar month grid + vote cycling + conflict markers.
4. **M3 — Notify**: `push_tokens`, `sendPush()` in the web app, the three
   v1 events wired, notification prefs on Profile.
5. **M4 — Polish & ship**: comments, invite accept / join code, theme picker,
   EAS build → TestFlight for the group.

## Open questions for Felix

1. iOS-only for the group at first, or Android too from day one? (Expo makes
   both cheap, but TestFlight-only simplifies M4.)
2. Should the DM's "mark play date" action sneak into v1 Calendar after all?
   It's one RLS-covered write and DMs are players too.
3. App name/icon: "Vestige" with the crest medallion? App Store presence vs.
   internal distribution changes how much this matters.
