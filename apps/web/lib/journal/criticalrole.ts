import "server-only";

/**
 * Description enrichment from the Critical Role Fandom wiki
 * (https://criticalrole.fandom.com) via its MediaWiki API. Covers Exandria /
 * Wildemount lore — people, places, events, items, creatures — which no SRD
 * source has, since that setting is proprietary. Content is CC-BY-SA, so we
 * surface it with attribution.
 *
 * Fandom disables the TextExtracts (`prop=extracts`) module and dropped its
 * legacy /api/v1, so we take the two-step route: `list=search` to resolve the
 * page, then `action=parse` (section 0) and lift the lead <p> paragraphs out
 * of the rendered HTML. Best-effort and read-only.
 *
 * Every failure path returns a REASON rather than null. That distinction is
 * the whole point of this module's shape: the previous version collapsed a
 * blocked request, a timeout, a malformed response and a genuinely missing
 * article into the same empty result, so the form told people "nothing found
 * for X" about articles that plainly exist — which is indistinguishable, from
 * the outside, from the button doing nothing at all.
 */

import { cleanLead } from "./criticalrole-lead";

const API = "https://criticalrole.fandom.com/api.php";
// Fandom's API is friendlier with a descriptive UA than the default fetch one.
const UA = "VestigeCodex/1.0 (https://vestige-web-pi.vercel.app; D&D campaign journal)";

export type WikiMatch = {
  /** The wiki page title we matched. */
  name: string;
  /** Clean plain-text lead, ready to drop into the summary field. */
  description: string;
  /** Canonical article URL, for attribution. */
  url: string;
  source: string;
};

export type WikiLookup =
  | { ok: true; match: WikiMatch }
  | { ok: false; reason: string };

type Fetched<T> = { ok: true; data: T } | { ok: false; reason: string };

/** MediaWiki reports its own failures in the body with a 200, so the error
 *  object is checked here alongside the transport-level ones. */
type ApiError = { error?: { code?: string; info?: string } };

async function getJson<T>(url: string, what: string): Promise<Fetched<T & ApiError>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: controller.signal,
      // Wiki lore changes rarely — let the platform cache it for a day.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      // 403/429 here means the wiki refused US, not that the article is
      // missing, and saying so is the difference between a bug report about a
      // broken button and one we can act on.
      return {
        ok: false,
        reason:
          res.status === 403 || res.status === 429
            ? `the Critical Role wiki refused the request (HTTP ${res.status}) — it rate-limits automated lookups, so try again in a minute`
            : `the Critical Role wiki returned HTTP ${res.status} for the ${what} step`,
      };
    }
    const data = (await res.json()) as T & ApiError;
    if (data.error) {
      return {
        ok: false,
        reason: `the wiki rejected the ${what} request (${data.error.code ?? "unknown error"})`,
      };
    }
    return { ok: true, data };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      reason: aborted
        ? `the Critical Role wiki timed out on the ${what} step`
        : `the Critical Role wiki could not be reached for the ${what} step`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

type SearchResp = { query?: { search?: Array<{ title: string }> } };
type ParseResp = { parse?: { title?: string; text?: { "*"?: string } } };

/** Pick the best page title for a name: exact (case-insensitive), then
 *  name-contains, then the search engine's top hit. */
function pickTitle(titles: string[], query: string): string | null {
  if (titles.length === 0) return null;
  const q = query.trim().toLowerCase();
  return (
    titles.find((t) => t.trim().toLowerCase() === q) ??
    titles.find((t) => t.toLowerCase().includes(q)) ??
    titles[0]
  );
}

/** Fetch and clean one article's lead section by exact page title. */
async function leadOf(title: string): Promise<WikiLookup> {
  const parsed = await getJson<ParseResp>(
    `${API}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=0&redirects=1&format=json&origin=*`,
    "article",
  );
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  const html = parsed.data.parse?.text?.["*"];
  const resolvedTitle = parsed.data.parse?.title ?? title;
  if (!html) {
    return { ok: false, reason: `the wiki returned no article body for “${resolvedTitle}”` };
  }

  const description = cleanLead(html);
  if (!description) {
    return {
      ok: false,
      reason: `“${resolvedTitle}” has no summary paragraph to lift — it may be a disambiguation or list page`,
    };
  }

  return {
    ok: true,
    match: {
      name: resolvedTitle,
      description,
      url: `https://criticalrole.fandom.com/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, "_"))}`,
      source: "Critical Role Wiki",
    },
  };
}

/** Look up an Exandria/Wildemount entry by name on the Critical Role wiki. */
export async function lookupCriticalRole(rawName: string): Promise<WikiLookup> {
  const name = rawName.trim();
  if (!name) return { ok: false, reason: "no name was given" };

  const search = await getJson<SearchResp>(
    `${API}?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=5&format=json&origin=*`,
    "search",
  );

  // A failed search doesn't end the attempt: plenty of entries are named
  // exactly as their article is titled, so the title is tried directly. That
  // covers both a refused search step and a search index that simply misses.
  if (!search.ok) {
    const direct = await leadOf(name);
    return direct.ok ? direct : { ok: false, reason: search.reason };
  }

  const titles = (search.data.query?.search ?? []).map((s) => s.title);
  const title = pickTitle(titles, name);
  if (!title) {
    const direct = await leadOf(name);
    return direct.ok
      ? direct
      : { ok: false, reason: `no article matches “${name}”` };
  }

  return leadOf(title);
}
