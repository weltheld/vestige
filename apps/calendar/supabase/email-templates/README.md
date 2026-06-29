# Council of Days — Auth email templates

These match the "Area Transactional Emails" design in `D&D Planner.pen`.
Supabase renders auth emails from templates stored in the **dashboard**, not
in this repo, so apply them by pasting the HTML below into each template at:

**Supabase Dashboard → Authentication → Email Templates**

## Mapping (design → template → what triggers it)

| Template in Supabase | Paste this file | Headline | Triggered by |
|---|---|---|---|
| **Magic Link** | `magic-link.html` | "Return to the table." | Login form — `supabase.auth.signInWithOtp` ([app/login/page.tsx](../../app/login/page.tsx)) |
| **Invite user** | `invite.html` | "Take your seat at the table." | Campaign launch invites — `admin.inviteUserByEmail` ([app/new/actions.ts](../../app/new/actions.ts), [app/g/[slug]/invite/actions.ts](../../app/g/%5Bslug%5D/invite/actions.ts)) |
| **Confirm signup** | `invite.html` | "Take your seat at the table." | New-user email confirmation |

Suggested **Subject** lines (set in the same dashboard screen):

- Magic Link: `Your sign-in link — Council of Days`
- Invite user: `You're invited to the table — Council of Days`
- Confirm signup: `Confirm your seat — Council of Days`

## Notes

- The only template variable used is `{{ .ConfirmationURL }}` (the action link).
  Supabase substitutes it server-side.
- The logo (Gold Table Mark) is referenced by absolute URL
  (`https://council-of-days-lovat.vercel.app/images/table-mark.png`) — a PNG
  raster of the in-app SVG logo, since email clients don't reliably render
  SVG. If the production domain changes, update that URL in each template.
- Fonts (Cinzel / Alegreya Sans) are loaded via Google Fonts with serif /
  sans-serif fallbacks, since many email clients strip web fonts.
