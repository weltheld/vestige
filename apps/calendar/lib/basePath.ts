/**
 * Calendar is mounted at /calendar under the Vestige platform's
 * domain (Next.js Multi-Zones — see apps/web/next.config.mjs in the vestige
 * monorepo). Next.js automatically prefixes basePath for <Link>, useRouter,
 * and next/navigation's redirect() — but NOT for manually-built URL/string
 * redirects (route handlers, window.location-based links). Use this in
 * exactly those spots.
 */
export const BASE_PATH = "/calendar";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * The platform's primary domain — NEXT_PUBLIC so it's usable from Client
 * Components (e.g. CampaignSwitcher's dropdown links), not just server code.
 * Cross-zone links (to /app, or explicitly back to /calendar/...) must be
 * absolute: this app's own basePath ("/calendar") gets auto-prepended by
 * Next to any relative <Link>/<a> href, which corrupts a link meant for a
 * different zone or the platform root.
 */
export const PLATFORM_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://vestige-web-pi.vercel.app";
