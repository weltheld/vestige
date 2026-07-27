"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toggleReaction } from "@/app/journal/c/[campaignId]/s/actions";
import type { Reaction } from "@/lib/journal/session-detail";

/**
 * One chapter's reactions, applied optimistically.
 *
 * Extracted from ReactionBar because three surfaces now toggle the same
 * tallies — the pills, the gutter menu, and double-click-to-react — and they
 * have to share a single piece of state or one will render a stale count
 * right next to another.
 */
export function useReactions(
  campaignId: string,
  sessionId: string,
  anchor: string,
  reactions: Reaction[],
) {
  const router = useRouter();
  const [local, setLocal] = useState<Reaction[]>(reactions);

  // Re-sync when the server sends new data (someone else's reaction, or our
  // own refresh landing). Comparing serialised tallies avoids clobbering an
  // in-flight optimistic change with identical props on an unrelated render.
  const serverKey = JSON.stringify(reactions.map((r) => [r.emoji, r.count, r.mine]));
  const lastKey = useRef(serverKey);
  if (lastKey.current !== serverKey) {
    lastKey.current = serverKey;
    setLocal(reactions);
  }

  /** Toggle: adds the emoji if it isn't yours, takes it back if it is.
   *  Returns what the click did, so callers can offer the right undo. */
  function react(emoji: string): "added" | "removed" {
    const wasMine = local.some((r) => r.emoji === emoji && r.mine);

    setLocal((prev) => {
      const found = prev.find((r) => r.emoji === emoji);
      if (!found) return [...prev, { emoji, count: 1, mine: true, names: ["You"] }];
      if (!found.mine) {
        return prev.map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, mine: true, names: [...r.names, "You"] }
            : r,
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

    // Fire and forget; on failure re-sync so the UI can't keep showing a
    // reaction that was never written.
    void toggleReaction(campaignId, sessionId, anchor, emoji).then((res) => {
      if (!res?.ok) router.refresh();
    });

    return wasMine ? "removed" : "added";
  }

  /** Is this emoji already the viewer's? Drives the picker's spent state —
   *  the same emoji can't be added twice, so it says so rather than letting
   *  people click in hope. */
  function isMine(emoji: string) {
    return local.some((r) => r.emoji === emoji && r.mine);
  }

  return { reactions: local, react, isMine };
}
