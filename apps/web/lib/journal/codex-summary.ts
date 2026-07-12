import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NpcKindDb } from "@vestige/db";
import { getNpcMentions } from "./npcs";

type SB = SupabaseClient<Database>;

const KIND_NOUN: Record<NpcKindDb, string> = {
  person: "character (NPC)",
  place: "place",
  event: "event",
};

const SYSTEM_PROMPT =
  "You maintain the codex of a Dungeons & Dragons campaign journal — a quiet, library-catalogue reference the players consult between sessions. " +
  "You will receive excerpts from session write-ups that mention one entity, and you write that entity's codex summary. " +
  "Rules: use ONLY facts stated in the excerpts, never invent or embellish; write 3-6 sentences of flowing prose (no headings, no lists, no markdown); " +
  "order facts roughly chronologically; write in the same language the excerpts are written in; " +
  "refer to the entity by name; if the excerpts reveal little, a shorter summary is better than padding.";

function buildUserPrompt(
  entity: { name: string; kind: NpcKindDb; summary: string | null },
  excerpts: string,
): string {
  return (
    `Entity: ${entity.name} (a ${KIND_NOUN[entity.kind]})\n` +
    (entity.summary?.trim()
      ? `Existing summary (may be revised or extended): ${entity.summary.trim()}\n`
      : "") +
    `\nSession excerpts mentioning ${entity.name}:\n\n${excerpts}\n\n` +
    `Write the codex summary for ${entity.name}.`
  );
}

type DraftResult = { ok: true; summary: string } | { ok: false; error: string };

async function draftWithAnthropic(
  entity: { name: string; kind: NpcKindDb; summary: string | null },
  excerpts: string,
): Promise<DraftResult> {
  const client = new Anthropic();
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
): Promise<DraftResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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

/**
 * Draft a codex summary for an entity from the journal sessions that
 * mention it. Returns the text WITHOUT writing it — the caller shows it in
 * the editable summary field and the user saves (or discards) it.
 *
 * Uses the campaign member's own Supabase client for all reads, so RLS
 * guarantees they can only summarize entities of campaigns they belong to.
 *
 * Provider choice: ANTHROPIC_API_KEY (Claude) if set, otherwise
 * GROQ_API_KEY (free-tier Llama) — no config means both are just unset.
 */
export async function draftEntitySummary(
  supabase: SB,
  entity: { id: string; name: string; kind: NpcKindDb; summary: string | null },
): Promise<DraftResult> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  if (!hasAnthropic && !hasGroq) {
    return {
      ok: false,
      error: "Summarization isn't configured (add ANTHROPIC_API_KEY or GROQ_API_KEY).",
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

  const excerpts = (sessions ?? [])
    .map((s) => {
      const parts = [s.summary, s.npcs, s.notes].filter(Boolean).join("\n\n");
      return `## ${s.title}${s.date ? ` (${s.date})` : ""}\n${parts}`;
    })
    .join("\n\n---\n\n")
    // Keep the request bounded even for very long campaigns.
    .slice(0, 60_000);

  return hasAnthropic
    ? draftWithAnthropic(entity, excerpts)
    : draftWithGroq(entity, excerpts);
}
