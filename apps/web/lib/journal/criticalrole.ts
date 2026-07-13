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
 */

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

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: controller.signal,
      // Wiki lore changes rarely — let the platform cache it for a day.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Strip a rendered-HTML lead section down to clean paragraph prose. */
function cleanLead(htmlText: string, max = 600): string {
  let t = htmlText;
  // Drop infoboxes, figures, captions, tables — they aren't prose.
  t = t.replace(/<(table|aside|figure|figcaption|style)\b[\s\S]*?<\/\1>/gi, "");
  // Keep only paragraph text.
  const paras = [...t.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  let text = paras
    .map((p) =>
      p
        .replace(/<[^>]+>/g, "") // tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .trim(),
    )
    .join(" ");
  text = text
    .replace(/\[\d+\]/g, "") // [1] reference markers
    .replace(/Cite error:[\s\S]*$/i, "") // MediaWiki ref-group error trailer
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
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

/** Look up an Exandria/Wildemount entry by name on the Critical Role wiki.
 *  Returns null when nothing matches or the wiki is unreachable. */
export async function lookupCriticalRole(rawName: string): Promise<WikiMatch | null> {
  const name = rawName.trim();
  if (!name) return null;
  const q = encodeURIComponent(name);

  const search = await getJson<SearchResp>(
    `${API}?action=query&list=search&srsearch=${q}&srlimit=5&format=json&origin=*`,
  );
  const titles = (search?.query?.search ?? []).map((s) => s.title);
  const title = pickTitle(titles, name);
  if (!title) return null;

  const parsed = await getJson<ParseResp>(
    `${API}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=0&redirects=1&format=json&origin=*`,
  );
  const html = parsed?.parse?.text?.["*"];
  const resolvedTitle = parsed?.parse?.title ?? title;
  if (!html) return null;

  const description = cleanLead(html);
  if (!description) return null;

  return {
    name: resolvedTitle,
    description,
    url: `https://criticalrole.fandom.com/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, "_"))}`,
    source: "Critical Role Wiki",
  };
}
