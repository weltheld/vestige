"use client";

import { useState } from "react";
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
  // Which emoji is mid-flight, so a click gives immediate feedback and can't
  // be fired twice while the server action is running.
  const [pending, setPending] = useState<string | null>(null);

  async function react(emoji: string) {
    setPending(emoji);
    setPicking(false);
    try {
      await toggleReaction(campaignId, sessionId, anchor, emoji);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => react(r.emoji)}
          disabled={pending === r.emoji}
          title={r.names.join(", ")}
          aria-pressed={r.mine}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-body text-[12px] transition disabled:opacity-50 ${
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
            picking || reactions.length > 0 ? "opacity-100" : "opacity-0"
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
              {REACTION_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="menuitem"
                  onClick={() => react(e)}
                  title={e}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] transition hover:bg-cod-soft"
                >
                  <span aria-hidden="true">{e}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
