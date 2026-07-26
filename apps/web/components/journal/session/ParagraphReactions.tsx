"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus } from "lucide-react";
// Only the action comes from the "use server" module — the emoji list lives
// in a plain module, because a server-actions file may export nothing but
// async functions and importing a value from one crashes the client.
import { toggleReaction } from "@/app/journal/c/[campaignId]/s/actions";
import { REACTION_EMOJI } from "@/lib/journal/reactions";
import type { Reaction } from "@/lib/journal/session-detail";

/**
 * Emoji reactions on one paragraph. Tallied pills stay visible once a
 * paragraph has any; the "add" button only appears on hover, so a page with
 * no reactions reads as clean prose rather than a wall of affordances.
 */
export function ReactionBar({
  campaignId,
  sessionId,
  anchor,
  reactions,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  reactions: Reaction[];
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);

  // Optimistic state. Clicking used to wait for the server action AND a full
  // router.refresh() before anything moved — around a second of nothing per
  // emoji, which read as "the feature is broken". The pill now updates on the
  // click and the write happens behind it.
  const [local, setLocal] = useState<Reaction[]>(reactions);
  // Re-sync when the server sends new data (another person's reaction, or our
  // own refresh landing). Comparing the serialised tallies avoids clobbering
  // an in-flight optimistic change with identical props on an unrelated render.
  const serverKey = JSON.stringify(reactions.map((r) => [r.emoji, r.count, r.mine]));
  const lastKey = useRef(serverKey);
  if (lastKey.current !== serverKey) {
    lastKey.current = serverKey;
    setLocal(reactions);
  }

  function react(emoji: string) {
    setPicking(false);

    // Apply immediately: add if it isn't mine, take it back if it is.
    setLocal((prev) => {
      const found = prev.find((r) => r.emoji === emoji);
      if (!found) return [...prev, { emoji, count: 1, mine: true, names: ["You"] }];
      if (!found.mine) {
        return prev.map((r) =>
          r.emoji === emoji ? { ...r, count: r.count + 1, mine: true, names: [...r.names, "You"] } : r,
        );
      }
      // Mine already — remove it, dropping the pill when it was the only one.
      if (found.count <= 1) return prev.filter((r) => r.emoji !== emoji);
      return prev.map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.count - 1, mine: false, names: r.names.filter((n) => n !== "You") }
          : r,
      );
    });

    // Fire and forget; on failure re-sync from the server so the UI can't
    // keep showing a reaction that was never written.
    void toggleReaction(campaignId, sessionId, anchor, emoji).then((res) => {
      if (!res?.ok) router.refresh();
    });
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {local.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => react(r.emoji)}
          title={`${r.names.join(", ")}${r.mine ? " — click to remove yours" : ""}`}
          aria-pressed={r.mine}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-body text-[12px] transition ${
            r.mine
              ? "border-gold bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-ink"
              : "border-hairline bg-cod-soft text-ink-soft hover:border-gold"
          }`}
        >
          <span aria-hidden="true">{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          aria-label="Add reaction"
          aria-haspopup="menu"
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
          // Hidden until the paragraph is hovered or this control has focus,
          // so it never competes with the prose — but keyboard users can
          // still reach it, which `hidden` or display:none would prevent.
          className={`flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft transition hover:border-gold hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${
            picking || local.length > 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          <SmilePlus size={13} />
        </button>

        {picking && (
          <>
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setPicking(false)}
            />
            <div
              role="menu"
              className="absolute bottom-8 left-0 z-20 flex gap-0.5 rounded-full border border-hairline bg-surface px-1.5 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
            >
              {REACTION_EMOJI.map((e) => {
                // Already used by the viewer: shown as active, and clicking
                // takes it back. The same emoji can't be added twice — the
                // row's primary key enforces it — so the picker says which
                // ones are spent rather than letting people click in hope.
                const mine = local.some((r) => r.emoji === e && r.mine);
                return (
                  <button
                    key={e}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={mine}
                    onClick={() => react(e)}
                    title={mine ? `Remove ${e}` : `React with ${e}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] transition hover:bg-cod-soft ${
                      mine ? "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)]" : ""
                    }`}
                  >
                    <span aria-hidden="true">{e}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
