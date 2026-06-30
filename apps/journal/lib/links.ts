// Cross-app URLs. The Journal, Calendar, and platform shell run as separate
// apps; in production they sit behind one domain. Override via env per deploy.
export const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001";
export const CALENDAR_URL =
  process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3000";

/** The platform campaign overview (where campaigns are discovered). */
export const appHref = () => `${WEB_URL}/app`;

/** This campaign's calendar view, in the Calendar module. */
export const calendarCampaignHref = (campaignId: string) =>
  `${CALENDAR_URL}/c/${campaignId}`;

/** Journal routes (this app). */
export const journal = {
  campaign: (id: string) => `/c/${id}`,
  newSession: (id: string) => `/c/${id}/s/new`,
  session: (id: string, sessionId: string) => `/c/${id}/s/${sessionId}`,
  editSession: (id: string, sessionId: string) => `/c/${id}/s/${sessionId}/edit`,
  settings: (id: string) => `/c/${id}/settings`,
};
