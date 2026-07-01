# Journal — screenshots

Each screen below was built and visually verified during its milestone (rendered
against sample data at 1280–1440px width, since local dev has no auth session on
the journal origin). The captures were delivered inline in the build review.

| Screen | Route | Milestone |
|---|---|---|
| Campaign selector (header dropdown) | header, any `/c/[id]` | M3 |
| Session list | `/c/[campaignId]` | M4 |
| Session detail (read mode, with annotations) | `/c/[campaignId]/s/[sessionId]` | M5 |
| Session edit mode | `…/s/new`, `…/s/[id]/edit` | M6 |
| Comments tab | detail → Comments | M7 |
| Change Log tab | detail → Change Log | M7 |
| Campaign settings | `/c/[campaignId]/settings` | M8 |

> Note: binary PNGs are not committed here — the preview tooling returns images
> to the reviewer inline rather than writing files to disk. To regenerate real
> PNGs, sign in on the journal origin (or seed a test session) and screenshot the
> live routes, saving them into this folder.
