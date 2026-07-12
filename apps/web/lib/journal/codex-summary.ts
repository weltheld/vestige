import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NpcKindDb, AiProviderDb } from "@vestige/db";
import { getNpcMentions } from "./npcs";

type SB = SupabaseClient<Database>;

const KIND_NOUN: Record<NpcKindDb, string> = {
  person: "character (NPC)",
  place: "place",
  event: "event",
};

const SYSTEM_PROMPT =
  "You are the campaign's loremaster, keeping the codex of a Dungeons & Dragons journal — the chronicle the players consult between sessions. " +
  "You will receive numbered session excerpts that mention one entity, and you write that entity's codex chronicle.\n" +
  "Content rules (strict):\n" +
  "- Record ONLY concrete facts the excerpts state outright: who did what, where, with whom, what was said, what was found. Every sentence must contain checkable information.\n" +
  "- NO interpretation of any kind. Forbidden: statements about significance, importance, or roles ('made significant discoveries', 'moved into a central role', 'plays a key part'); words like 'apparently', 'evidently', 'seemingly'; motives, feelings, or conclusions the excerpts don't state. If a sentence tells the reader what to think instead of what happened, cut it.\n" +
  "- Order facts chronologically. If the excerpts reveal little, a shorter chronicle is better than padding — never fill space with commentary.\n" +
  "Structure & citations:\n" +
  "- Write 1-3 short paragraphs separated by a blank line — typically one paragraph per session or per phase of the story.\n" +
  "- Cite with inline [n] markers (the excerpt numbers), but at most ONE citation per paragraph when the whole paragraph comes from one session: put it at the end of the paragraph. Only add a second marker inside a paragraph when it genuinely mixes sessions. Never put a marker after every sentence.\n" +
  "Style rules:\n" +
  "- Voice: high-fantasy chronicle — the measured, evocative telling of a loremaster recording a story, not a database entry. Let the drama live in word choice and rhythm, never in added content.\n" +
  "- No headings, no lists, no markdown. Refer to the entity by name.\n" +
  "- Write in the same language the excerpts are written in.\n" +
  "- Do NOT write the footnote legend yourself — only the inline [n] markers; the legend is appended for you.";

/** Drop a previously appended footnote legend (everything from the "—"
 *  separator) so re-summarizing doesn't feed stale citations back in. */
function stripFootnotes(summary: string): string {
  return summary.split(/\n\n—\n/)[0].trim();
}

function buildUserPrompt(
  entity: { name: string; kind: NpcKindDb; summary: string | null },
  excerpts: string,
): string {
  const existing = entity.summary?.trim() ? stripFootnotes(entity.summary) : "";
  return (
    `Entity: ${entity.name} (a ${KIND_NOUN[entity.kind]})\n` +
    (existing ? `Existing chronicle (may be revised or extended): ${existing}\n` : "") +
    `\nNumbered session excerpts mentioning ${entity.name}:\n\n${excerpts}\n\n` +
    `Write the codex chronicle for ${entity.name}.`
  );
}

type DraftResult = { ok: true; summary: string } | { ok: false; error: string };

async function draftWithAnthropic(
  entity: { name: string; kind: NpcKindDb; summary: string | null },
  excerpts: string,
  apiKey: string,
): Promise<DraftResult> {
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(entity, excerpts) }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) return { ok: false, error: "The model returned no summary. Try again." };
    return { ok: true, summary: text };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Rate limited — wait a moment and try again." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `Summarization failed (${err.status ?? "API error"}).` };
    }
    return { ok: false, error: "Summarization failed. Try again." };
  }
}

// Groq's free tier hosts Llama over an OpenAI-compatible endpoint — used as
// a no-cost fallback when no ANTHROPIC_API_KEY is configured, so campaigns
// that don't want to pay for Claude still get summaries. Plain fetch: this
// is the only call we make to Groq, not worth adding another SDK for.
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function draftWithGroq(
  entity: { name: string; kind: NpcKindDb; summary: string | null },
  excerpts: string,
  apiKey: string,
): Promise<DraftResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(entity, excerpts) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429) {
        return { ok: false, error: "Rate limited — wait a moment and try again." };
      }
      return { ok: false, error: `Summarization failed (${res.status}).` };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "The model returned no summary. Try again." };
    return { ok: true, summary: text };
  } catch {
    return { ok: false, error: "Summarization failed. Try again." };
  } finally {
    clearTimeout(timeout);
  }
}

/** The provider + key to use for a campaign: its ACTIVE saved key (campaign
 *  settings, creator-only RLS row) first, then the deployment's env vars.
 *  Exported for the codex-extract flow, which spends the same key. */
export async function resolveProvider(
  supabase: SB,
  campaignId: string,
): Promise<{ provider: AiProviderDb; apiKey: string } | null> {
  const { data } = await supabase
    .from("campaign_ai_settings")
    .select("provider, anthropic_key, groq_key")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  const activeKey = data
    ? data.provider === "anthropic"
      ? data.anthropic_key
      : data.groq_key
    : null;
  if (data && activeKey) return { provider: data.provider, apiKey: activeKey };
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", apiKey: process.env.GROQ_API_KEY };
  }
  return null;
}

/**
 * Draft a codex summary for an entity from the journal sessions that
 * mention it. Returns the text WITHOUT writing it — the caller shows it in
 * the editable summary field and the user saves (or discards) it.
 *
 * Uses the campaign member's own Supabase client for all reads, so RLS
 * guarantees they can only summarize entities of campaigns they belong to.
 * (The caller additionally restricts this to the campaign owner, which is
 * also what lets the campaign_ai_settings read below succeed.)
 */
export async function draftEntitySummary(
  supabase: SB,
  entity: { id: string; name: string; kind: NpcKindDb; summary: string | null },
  campaignId: string,
): Promise<DraftResult> {
  const config = await resolveProvider(supabase, campaignId);
  if (!config) {
    return {
      ok: false,
      error:
        "Summarization isn't configured — add an Anthropic or Groq API key in campaign settings.",
    };
  }

  const mentions = await getNpcMentions(supabase, entity.id);
  if (mentions.length === 0) {
    return {
      ok: false,
      error: "No sessions mention this entry yet — nothing to summarize from.",
    };
  }

  const { data: sessions } = await supabase
    .from("journal_sessions")
    .select("id, title, date, summary, npcs, notes")
    .in(
      "id",
      mentions.map((m) => m.sessionId),
    )
    .order("date", { ascending: true });

  // Numbered excerpts — the model cites facts as [n]; the footnote legend
  // is appended below from these same rows, so sources can't be invented.
  const sessionList = sessions ?? [];
  const excerpts = sessionList
    .map((s, i) => {
      const parts = [s.summary, s.npcs, s.notes].filter(Boolean).join("\n\n");
      return `## [${i + 1}] ${s.title}${s.date ? ` (${s.date})` : ""}\n${parts}`;
    })
    .join("\n\n---\n\n")
    // Keep the request bounded even for very long campaigns.
    .slice(0, 60_000);

  const result =
    config.provider === "anthropic"
      ? await draftWithAnthropic(entity, excerpts, config.apiKey)
      : await draftWithGroq(entity, excerpts, config.apiKey);
  if (!result.ok) return result;

  // Footnote legend for the [n] markers actually used — built from the real
  // session titles/dates, never from model output.
  const cited = new Set(
    [...result.summary.matchAll(/\[(\d+)\]/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n >= 1 && n <= sessionList.length),
  );
  const footnotes = [...cited]
    .sort((a, b) => a - b)
    .map((n) => {
      const s = sessionList[n - 1];
      return `[${n}] ${s.title}${s.date ? ` (${s.date})` : ""}`;
    });
  const summary = footnotes.length
    ? `${result.summary}\n\n—\n${footnotes.join("\n")}`
    : result.summary;
  return { ok: true, summary };
}
