import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AiProviderDb } from "@vestige/db";
import { resolveProvider } from "./codex-summary";

type SB = SupabaseClient<Database>;

/**
 * Translating existing codex chronicles into English.
 *
 * A translation, not a re-draft: re-running the summarizer would rewrite each
 * entry from the session excerpts and quietly change what it says. Translating
 * the stored text keeps every recorded fact, and keeps the [n] citation markers
 * and their appended legend pointing at the same sessions.
 */
const SYSTEM_PROMPT =
  "You translate the codex of a Dungeons & Dragons campaign into English.\n" +
  "Rules:\n" +
  "- Translate the prose faithfully. Do not add, remove, explain or reinterpret anything.\n" +
  "- Keep proper names EXACTLY as written — characters, places, items, creatures, deities, organisations. A name is never translated, even when it is a common word in the source language.\n" +
  "- Preserve the structure exactly: paragraph breaks, blank lines, inline [n] citation markers in their positions, and any footnote legend after a '—' separator (translate the session labels in the legend, keep their numbering and dates).\n" +
  "- Match the register of the original: an evocative high-fantasy chronicle, not a literal word-for-word gloss.\n" +
  "- If the text is ALREADY entirely in English, return it byte-for-byte unchanged.\n" +
  "- Respond with ONLY the translated text. No preamble, no notes, no code fences.";

const GROQ_MODEL = "llama-3.3-70b-versatile";

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

async function withAnthropic(text: string, apiKey: string): Promise<TranslateResult> {
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });
    const out = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!out) return { ok: false, error: "The model returned nothing." };
    return { ok: true, text: out };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Rate limited." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `Translation failed (${err.status ?? "API error"}).` };
    }
    return { ok: false, error: "Translation failed." };
  }
}

async function withGroq(text: string, apiKey: string): Promise<TranslateResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.status === 429 ? "Rate limited." : `Translation failed (${res.status}).`,
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) return { ok: false, error: "The model returned nothing." };
    return { ok: true, text: out };
  } catch {
    return { ok: false, error: "Translation failed." };
  } finally {
    clearTimeout(timeout);
  }
}

function translate(
  provider: AiProviderDb,
  apiKey: string,
  text: string,
): Promise<TranslateResult> {
  return provider === "anthropic" ? withAnthropic(text, apiKey) : withGroq(text, apiKey);
}

/**
 * Rough "is this already English?" test, so an English codex costs nothing to
 * re-run and a mostly-translated one only pays for what's left.
 *
 * Deliberately crude: it looks for German-specific characters and a handful of
 * function words that English doesn't share. False negatives just mean one
 * wasted call; false positives would skip a German entry, so the word list is
 * limited to words that cannot be English.
 */
const GERMAN_HINT =
  /[äöüßÄÖÜ]|\b(?:und|oder|nicht|eine|einen|einem|einer|der|die|das|dem|den|des|mit|sich|wurde|wurden|ist|sind|war|waren|hatte|hatten|nach|über|durch|beim|vom|zur|zum|ihre|seine|ihm|ihn|sie|er)\b/i;

export function looksEnglish(text: string): boolean {
  return !GERMAN_HINT.test(text);
}

export type CodexTranslation = {
  /** Entries whose summary was rewritten. */
  translated: number;
  /** Entries skipped because they already read as English (or were empty). */
  skipped: number;
  /** Entries the model or the write failed on — left exactly as they were. */
  failed: number;
  /** First failure's message, for the UI to show. */
  error?: string;
};

/**
 * Translate every codex summary in a campaign into English, in place.
 *
 * Sequential on purpose: this spends the campaign owner's API key and runs
 * against a shared rate limit, and a codex is tens of entries, not thousands.
 * Each entry is written as it completes, so a failure part-way through leaves
 * the work already done saved rather than rolling everything back.
 */
export async function translateCampaignCodex(
  supabase: SB,
  campaignId: string,
): Promise<{ ok: true; result: CodexTranslation } | { ok: false; error: string }> {
  const resolved = await resolveProvider(supabase, campaignId);
  if (!resolved) {
    return { ok: false, error: "No AI key configured for this campaign." };
  }

  const { data: rows, error } = await supabase
    .from("npcs")
    .select("id, summary")
    .eq("campaign_id", campaignId);
  if (error) return { ok: false, error: error.message };

  const result: CodexTranslation = { translated: 0, skipped: 0, failed: 0 };

  for (const row of rows ?? []) {
    const text = row.summary?.trim();
    if (!text || looksEnglish(text)) {
      result.skipped++;
      continue;
    }

    const out = await translate(resolved.provider, resolved.apiKey, text);
    if (!out.ok) {
      result.failed++;
      result.error ??= out.error;
      continue;
    }
    // An unchanged reply means the model judged it English already — no write.
    if (out.text === text) {
      result.skipped++;
      continue;
    }

    const { error: writeError } = await supabase
      .from("npcs")
      .update({ summary: out.text })
      .eq("id", row.id);
    if (writeError) {
      result.failed++;
      result.error ??= writeError.message;
      continue;
    }
    result.translated++;
  }

  return { ok: true, result };
}
