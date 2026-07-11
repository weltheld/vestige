/**
 * Calendar used to be its own Multi-Zones app with basePath "/calendar",
 * where Next auto-prefixed relative <Link>/redirect() paths. Now it lives
 * in this app under app/calendar/, so nothing is auto-prefixed — every
 * calendar-internal path must carry the prefix explicitly. withBasePath()
 * remains the single place that writes it.
 */
export const BASE_PATH = "/calendar";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * Same-app now — platform links (e.g. /app) are plain relative paths.
 * Kept as a constant because many call sites template it into URLs.
 */
export const PLATFORM_URL = "";
