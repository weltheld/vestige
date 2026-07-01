// Web is the primary Multi-Zones domain; Journal and Calendar are both
// mounted under it (/journal, /calendar), so the browser only ever sees
// web's origin — that's also what makes one login cover the whole platform.
// Absolute fallback still used when journal is visited directly (dev, or a
// direct hit on its own vercel.app host).
export const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001";

/** The platform campaign overview (where campaigns are discovered). */
export const appHref = () => `${WEB_URL}/app`;

/**
 * This campaign's calendar view, in the Calendar module. Calendar routes by
 * slug, not id — pass `campaign.slug` from a HeaderCampaign. Same-origin
 * relative path (Multi-Zones), not a cross-domain link.
 */
export const calendarCampaignHref = (slug: string) => `/calendar/g/${slug}`;

/** Journal routes (this app). */
export const journal = {
  campaign: (id: string) => `/c/${id}`,
  newSession: (id: string) => `/c/${id}/s/new`,
  session: (id: string, sessionId: string) => `/c/${id}/s/${sessionId}`,
  editSession: (id: string, sessionId: string) => `/c/${id}/s/${sessionId}/edit`,
  settings: (id: string) => `/c/${id}/settings`,
};
