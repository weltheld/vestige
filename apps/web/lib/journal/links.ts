// Journal used to be its own Multi-Zones app with basePath "/journal" —
// Next auto-prepended the prefix to relative links, and cross-module links
// had to be absolute. Now that everything lives in one app, all routes are
// plain relative paths and the /journal prefix is written out explicitly.

/** Kept for the Familiar ingest URL (lib/journal/familiar.ts), which is
 *  pasted into external Familiar installs and must stay absolute. */
export const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001";

/** The platform campaign overview (where campaigns are discovered). */
export const appHref = () => "/app";

/** This campaign's calendar view. Calendar routes by slug, not id. */
export const calendarCampaignHref = (slug: string) => `/calendar/g/${slug}`;

/** Journal routes. */
export const journal = {
  campaign: (id: string) => `/journal/c/${id}`,
  newSession: (id: string) => `/journal/c/${id}/s/new`,
  session: (id: string, sessionId: string) => `/journal/c/${id}/s/${sessionId}`,
  editSession: (id: string, sessionId: string) => `/journal/c/${id}/s/${sessionId}/edit`,
  settings: (id: string) => `/journal/c/${id}/settings`,
  codex: (id: string) => `/journal/c/${id}/codex`,
  newNpc: (id: string) => `/journal/c/${id}/codex/new`,
  npc: (id: string, npcId: string) => `/journal/c/${id}/codex/${npcId}`,
};

/** Characters routes. A top-level module rather than something nested under
 *  the journal: an imported sheet belongs to a player, not to a session. */
export const characters = {
  campaign: (id: string) => `/characters/c/${id}`,
  /** One sheet. The roster lives behind a switcher on the same page, so a
   *  specific character is a query param rather than its own route. */
  sheet: (id: string, sheetId: string) => `/characters/c/${id}?sheet=${sheetId}`,
};
