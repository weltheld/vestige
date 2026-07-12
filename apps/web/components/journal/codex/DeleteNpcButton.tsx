"use client";

import { useTransition } from "react";
import { deleteNpc } from "@/app/journal/c/[campaignId]/codex/actions";

/** Quiet destructive action, matching the settings pages' danger-zone
 *  treatment. Mentions cascade; codex links in old session text remain as
 *  plain text. */
export function DeleteNpcButton({
  campaignId,
  npcId,
  name,
}: {
  campaignId: string;
  npcId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Remove "${name}" from the codex? Session texts keep the name, but the links stop working.`)) return;
        startTransition(async () => {
          await deleteNpc(campaignId, npcId);
        });
      }}
      className="font-body text-[13px] text-wine underline underline-offset-2 disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove from codex"}
    </button>
  );
}
