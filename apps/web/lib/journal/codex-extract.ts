import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AiProviderDb } from "@vestige/db";
import { resolveProvider } from "./codex-summary";
import type { IngestCodexEntity } from "./codex-ingest";

type SB = SupabaseClient<Database>;

const MAX_ENTITIES = 15;

/**
 * On-demand codex extraction for an existing journal session — the same
 * first pass Familiar runs on ingest, but triggered from the session detail
 * page and paid for with the campaign's own AI key. Unlike Familiar's pass
 * it INCLUDES the player characters: the codex may hold what the chronicle
 * knows about the party too.
 */

function buildPrompt(sessionText: string): string {
  return `You maintain the codex of a Dungeons & Dragons campaign — a reference of the campaign's notable people, places, and events.

Read the session write-up below and extract the codex-worthy entities:
- "person": named characters — NPCs the party met or learned about, AND the player characters themselves when the write-up says something worth recording about them.
- "place": named locations that matter to the story (towns, dungeons, landmarks — not generic rooms).
- "event": named or clearly significant events (a battle, a ritual, a festival), if any.

For each entity write a 1-2 sentence factual summary using ONLY information stated in the write-up — no interpretation, no invented details. Write summaries in the same language as the write-up. Only include entities actually worth remembering; fewer is better than padded. At most ${MAX_ENTITIES}.

Respond with ONLY a JSON array, no prose, no code fences:
[{"name": "...", "kind": "person|place|event", "summary": "..."}]
If nothing qualifies, respond with [].

Session write-up:
---
${sessionText}
---`;
}

/** Lenient parse: find the first [...] block, validate each entry. */
function parseEntities(text: string): IngestCodexEntity[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: IngestCodexEntity[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (out.length >= MAX_ENTITIES) break;
    if (typeof item !== "object" || item === null) continue;
    const { name, kind, summary } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80) continue;
    if (kind !== "person" && kind !== "place" && kind !== "event") continue;
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: name.trim(),
      kind,
      summary: typeof summary === "string" ? summary.trim().slice(0, 600) : "",
    });
  }
  return out;
}

async function complete(
  config: { provider: AiProviderDb; apiKey: string },
  prompt: string,
): Promise<string> {
  if (config.provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

export type ExtractResult =
  | { ok: true; entities: IngestCodexEntity[] }
  | { ok: false; error: string };

export async function extractSessionEntities(
  supabase: SB,
  campaignId: string,
  sessionText: string,
): Promise<ExtractResult> {
  const config = await resolveProvider(supabase, campaignId);
  if (!config) {
    return {
      ok: false,
      error: "Extraction isn't configured — add an Anthropic or Groq API key in campaign settings.",
    };
  }
  try {
    // Bounded like the summarizer, for very long write-ups.
    const text = await complete(config, buildPrompt(sessionText.slice(0, 60_000)));
    return { ok: true, entities: parseEntities(text) };
  } catch {
    return { ok: false, error: "Extraction failed. Try again." };
  }
}
