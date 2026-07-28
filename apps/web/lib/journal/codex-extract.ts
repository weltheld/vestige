import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AiProviderDb, NpcKindDb } from "@vestige/db";
import { resolveProvider } from "./codex-summary";
import type { IngestCodexEntity } from "./codex-ingest";

type SB = SupabaseClient<Database>;

/** A session's worth of codex-worthy things. 15 was too tight: a six-person
 *  party plus the NPCs they met filled the budget with people before the
 *  places, items and events were ever reached. */
const MAX_ENTITIES = 30;

/**
 * On-demand codex extraction for an existing journal session — the same
 * first pass Familiar runs on ingest, but triggered from the session detail
 * page and paid for with the campaign's own AI key. Unlike Familiar's pass
 * it INCLUDES the player characters: the codex may hold what the chronicle
 * knows about the party too.
 */

const KINDS: readonly NpcKindDb[] = ["person", "place", "event", "item", "creature"];

/** Words models reach for instead of our five kind names. Without this a
 *  reply that says "npc" or "Location" has every entity silently dropped,
 *  which surfaces to the user as "nothing codex-worthy found". */
const KIND_SYNONYMS: Record<string, NpcKindDb> = {
  npc: "person",
  character: "person",
  people: "person",
  persons: "person",
  location: "place",
  places: "place",
  object: "item",
  artifact: "item",
  items: "item",
  loot: "item",
  monster: "creature",
  beast: "creature",
  creatures: "creature",
  encounter: "event",
  events: "event",
};

function normalizeKind(raw: unknown): NpcKindDb | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toLowerCase();
  if ((KINDS as readonly string[]).includes(k)) return k as NpcKindDb;
  return KIND_SYNONYMS[k] ?? null;
}

/** Schema for Anthropic structured outputs — makes an unparseable or
 *  wrong-shaped reply impossible rather than something we detect after. */
const ENTITIES_SCHEMA = {
  type: "object",
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          kind: { type: "string", enum: [...KINDS] },
          summary: { type: "string" },
        },
        required: ["name", "kind", "summary"],
        additionalProperties: false,
      },
    },
  },
  required: ["entities"],
  additionalProperties: false,
} as const;

function buildPrompt(sessionText: string): string {
  return `You maintain the codex of a Dungeons & Dragons campaign — a reference of the campaign's notable people, places, events, items, and creatures.

Read the session write-up below and extract the codex-worthy entities:
- "person": named characters — NPCs the party met or learned about, AND the player characters themselves when the write-up says something worth recording about them.
- "place": named locations that matter to the story (towns, dungeons, landmarks — not generic rooms).
- "event": named or clearly significant events (a battle, a ritual, a festival), if any.
- "item": notable objects — magic items, artifacts, quest items, distinctive loot (not generic gear or coins).
- "creature": named or notable monsters/beasts encountered (a specific dragon, a boss, a recurring foe — not generic mooks unless they matter).

Use exactly those five words for "kind" — no others.

Cover ALL FIVE kinds. Work through them one at a time and ask what the write-up
names for each: the party are not the only people, and a session almost always
happens somewhere, involves something, and turns on some event. Do not spend the
whole list on characters — an extraction that returns only people has missed the
places they went and the things they found.

For each entity write a 1-2 sentence factual summary using ONLY information stated in the write-up — no interpretation, no invented details. Only include entities actually worth remembering; fewer is better than padded. At most ${MAX_ENTITIES}.

Write every summary in English, even when the write-up is in another language. Keep proper names exactly as the write-up spells them — a character, place or item name is not translated.

Respond with ONLY this JSON object, no prose and no code fences:
{"entities": [{"name": "...", "kind": "person|place|event|item|creature", "summary": "..."}]}
If nothing qualifies, respond with {"entities": []}.

Session write-up:
---
${sessionText}
---`;
}

/** What a parse produced, including what it had to throw away — the caller
 *  needs the difference between "the model found nothing" and "the model
 *  answered and we rejected all of it". */
type ParseOutcome = {
  entities: IngestCodexEntity[];
  /** Entries present in the reply that failed validation. */
  rejected: number;
  /** True when no JSON could be located at all. */
  unparseable: boolean;
};

/** Lenient parse: accepts {"entities":[…]} or a bare […]. */
function parseEntities(text: string): ParseOutcome {
  const raw = locateArray(text);
  if (raw === null) return { entities: [], rejected: 0, unparseable: true };
  if (!Array.isArray(raw)) return { entities: [], rejected: 0, unparseable: true };

  const out: IngestCodexEntity[] = [];
  const seen = new Set<string>();
  let rejected = 0;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      rejected++;
      continue;
    }
    const { name, kind, summary } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim()) {
      rejected++;
      continue;
    }
    const normalized = normalizeKind(kind);
    if (!normalized) {
      rejected++;
      continue;
    }
    // Over-long names used to be dropped outright; a too-chatty name is a
    // formatting slip, not a reason to lose the entity.
    const trimmed = name.trim().slice(0, 80);
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: trimmed,
      kind: normalized,
      summary: typeof summary === "string" ? summary.trim().slice(0, 600) : "",
    });
  }
  return { entities: capByKind(out), rejected, unparseable: false };
}

/**
 * Trim to MAX_ENTITIES without letting one kind starve the others.
 *
 * The cap used to cut the model's reply in the order it arrived. Models emit
 * in prompt order and "person" is listed first, so a big party plus the NPCs
 * they met could fill the whole budget before the first place — and the user
 * saw an extraction that found nothing but characters. Taking one of each kind
 * per round means every kind present in the reply survives, and the cap only
 * ever trims the tail of the longest lists.
 */
function capByKind(entities: IngestCodexEntity[]): IngestCodexEntity[] {
  if (entities.length <= MAX_ENTITIES) return entities;

  // Per kind, in the model's own order — it puts the most significant first.
  const queues = new Map<NpcKindDb, IngestCodexEntity[]>();
  for (const e of entities) {
    const q = queues.get(e.kind);
    if (q) q.push(e);
    else queues.set(e.kind, [e]);
  }

  const out: IngestCodexEntity[] = [];
  while (out.length < MAX_ENTITIES) {
    let took = false;
    for (const q of queues.values()) {
      if (q.length === 0) continue;
      out.push(q.shift()!);
      took = true;
      if (out.length >= MAX_ENTITIES) break;
    }
    if (!took) break; // every queue drained
  }
  return out;
}

/** The entity array out of either reply shape, or null if there isn't one. */
function locateArray(text: string): unknown {
  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const obj = JSON.parse(text.slice(objStart, objEnd + 1)) as Record<string, unknown>;
      if (Array.isArray(obj.entities)) return obj.entities;
    } catch {
      /* fall through to the bare-array shape */
    }
  }
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

type Completion = { text: string; truncated: boolean };

async function complete(
  config: { provider: AiProviderDb; apiKey: string },
  prompt: string,
): Promise<Completion> {
  if (config.provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      // 2048 left almost no headroom: a content-rich session measured 1498
      // output tokens, and going over silently truncated the JSON mid-entity,
      // which parsed to nothing and was reported as "nothing found".
      max_tokens: 8192,
      output_config: { format: { type: "json_schema", schema: ENTITIES_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    return {
      text: response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim(),
      truncated: response.stop_reason === "max_tokens",
    };
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
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    };
    return {
      text: data.choices?.[0]?.message?.content?.trim() ?? "",
      truncated: data.choices?.[0]?.finish_reason === "length",
    };
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

  let completion: Completion;
  try {
    // Bounded like the summarizer, for very long write-ups.
    completion = await complete(config, buildPrompt(sessionText.slice(0, 60_000)));
  } catch (err) {
    console.error("[codex-extract] provider call failed", err);
    return { ok: false, error: "Extraction failed. Try again." };
  }

  const { entities, rejected, unparseable } = parseEntities(completion.text);

  // An empty result has several very different causes; saying "nothing
  // codex-worthy found" for all of them sends people looking at their prose
  // when the actual problem is a cut-off or malformed reply.
  if (entities.length === 0) {
    if (completion.truncated) {
      return {
        ok: false,
        error:
          "The AI's reply was cut off before it could be read. Try again, or split this session into shorter entries.",
      };
    }
    if (unparseable) {
      console.error(
        "[codex-extract] unparseable reply",
        JSON.stringify(completion.text.slice(0, 400)),
      );
      return { ok: false, error: "The AI's reply couldn't be read. Try again." };
    }
    if (rejected > 0) {
      console.error(`[codex-extract] all ${rejected} entries rejected by validation`);
      return { ok: false, error: "The AI returned entries in an unexpected format. Try again." };
    }
  }

  return { ok: true, entities };
}
