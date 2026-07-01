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
