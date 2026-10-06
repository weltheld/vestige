import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NpcKindDb } from "@vestige/db";
import { GROQ_MODEL, resolveProvider } from "./codex-summary";
import { parseFootnotes } from "./codex-footnotes";

type SB = SupabaseClient<Database>;

export type MergeDraft = { ok: true; summary: string } | { ok: false; error: string };

type Side = { name: string; summary: string | null };

const KIND_NOUN: Record<NpcKindDb, string> = {
  person: "character (NPC)",
  place: "place",
  event: "event",
  item: "item",
  creature: "creature",
};

const SYSTEM_PROMPT =
  "You are the campaign's loremaster, keeping the codex of a Dungeons & Dragons journal. " +
  "Two codex entries turned out to describe the SAME thing, and you merge their chronicles into one.\n" +
  "Rules (strict):\n" +
  "- Keep every concrete fact from either chronicle. Where both state the same fact, state it ONCE. Where they overlap partially, combine them into one fuller statement. Never drop a fact that appears in only one.\n" +
  "- Do NOT invent, infer, or interpret anything. If the two disagree, keep both versions as stated rather than choosing one.\n" +
  "- Order the facts chronologically. Write 1-4 short paragraphs separated by a blank line. No headings, no lists, no markdown formatting.\n" +
  "- Keep the inline [n] citation markers attached to the facts they were attached to. Use at most one marker per paragraph when the paragraph comes from one source, and never remove a marker that supports a fact you keep. Do NOT write a footnote legend and do NOT renumber — use the numbers exactly as given.\n" +
  "- Keep markdown links like [Name](codex:...) and [Title](session:...) exactly as written, EXCEPT links that point at the two entries being merged: write those as the plain name.\n" +
  "- Use the chosen name. If the two entries used different names for the same thing, mention the other name once, early, as an alias.\n" +
  "- Voice: the measured chronicle style of the originals. Write in English. Keep proper names exactly as spelled.";

/** The other entry's [n] markers continue after this one's, so both legends
 *  can live in a single numbering the model can't confuse. */
function offsetMarkers(text: string, offset: number): string {
  return text.replace(/\[(\d+)\]/g, (_, n) => `[${Number(n) + offset}]`);
}

/** Merge the two summaries' bodies and legends into one numbering. */
function combine(keep: Side, other: Side) {
  const a = parseFootnotes(keep.summary);
  const b = parseFootnotes(other.summary);
  const offset = a.notes.reduce((m, f) => Math.max(m, f.n), 0);
  const legend = new Map<number, string>();
  for (const f of a.notes) legend.set(f.n, f.label);
  for (const f of b.notes) legend.set(f.n + offset, f.label);
  return { bodyA: a.body, bodyB: offsetMarkers(b.body, offset), legend };
}

/** Rebuild a clean legend: only markers actually used, renumbered 1..k in
 *  order of first appearance, with labels taken from the real legends — never
 *  from model output. */
export function rebuildLegend(body: string, legend: Map<number, string>): string {
  const order: number[] = [];
  for (const m of body.matchAll(/\[(\d+)\]/g)) {
    const n = Number(m[1]);
    if (legend.has(n) && !order.includes(n)) order.push(n);
  }
  const renumber = new Map(order.map((n, i) => [n, i + 1]));
  const text = body.replace(/\[(\d+)\]/g, (_whole, n) => {
    const to = renumber.get(Number(n));
    return to ? `[${to}]` : "";
  });
  if (order.length === 0) return text.trim();
  const lines = order.map((n) => `[${renumber.get(n)}] ${legend.get(n)}`);
  return `${text.trim()}\n\n—\n${lines.join("\n")}`;
}

async function complete(
  config: { provider: "anthropic" | "groq"; apiKey: string },
  user: string,
): Promise<string> {
  if (config.provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: user }],
    });
    return res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Draft the merged chronicle for two entries. Nothing is saved — the caller
 * shows the result for review. When only one side has a summary there is
 * nothing to deduplicate, so that text is returned as-is without spending an
 * AI call.
 */
export async function draftMergedSummary(
  supabase: SB,
  campaignId: string,
  keep: Side & { kind: NpcKindDb },
  other: Side,
  chosenName: string,
): Promise<MergeDraft> {
  const hasA = !!keep.summary?.trim();
  const hasB = !!other.summary?.trim();
  if (!hasA && !hasB) return { ok: true, summary: "" };
  if (hasA !== hasB) return { ok: true, summary: ((hasA ? keep.summary : other.summary) ?? "").trim() };

  const config = await resolveProvider(supabase, campaignId);
  if (!config) {
    return {
      ok: false,
      error: "Merging needs an AI key — add an Anthropic or Groq API key in campaign settings.",
    };
  }

  const { bodyA, bodyB, legend } = combine(keep, other);
  const user =
    `Merged entry: ${chosenName} (a ${KIND_NOUN[keep.kind]})\n\n` +
    `Chronicle 1 (was "${keep.name}"):\n${bodyA}\n\n` +
    `Chronicle 2 (was "${other.name}"):\n${bodyB}\n\n` +
    `Write the single merged chronicle for ${chosenName}.`;

  try {
    const text = await complete(config, user);
    if (!text) return { ok: false, error: "The model returned no text. Try again." };
    // The model may still have appended a legend of its own — drop it.
    const body = text.split(/\n\n—\n/)[0];
    return { ok: true, summary: rebuildLegend(body, legend) };
  } catch (err) {
    console.error("[codex-merge] draft failed", err);
    return { ok: false, error: "Drafting the merged text failed. Try again." };
  }
}

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** Repoint codex links from one entry to another. */
export function repointCodexLinks(text: string, fromId: string, toId: string): string {
  return text.replace(new RegExp(`\\(codex:${fromId}\\)`, "gi"), `(codex:${toId})`);
}

/** Turn links to the given entries into their plain label — used on the
 *  merged summary so the surviving entry never links to itself. */
export function unlinkCodexLinks(text: string, ids: string[]): string {
  return text.replace(new RegExp(`\\[([^\\]]*)\\]\\(codex:(${UUID})\\)`, "g"), (whole, label, id) =>
    ids.some((x) => x.toLowerCase() === String(id).toLowerCase()) ? label : whole,
  );
}
