"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCharacterSheet } from "@/app/characters/c/[campaignId]/actions";
import { characters } from "@/lib/journal/links";

/** Remove an imported sheet. Two-step, but understated — the Foundry original
 *  is untouched and re-importing the same file brings it straight back, so
 *  this is much closer to "hide" than to a destructive action. */
export function DeleteSheetButton({
  campaignId,
  sheetId,
  name,
}: {
  campaignId: string;
  sheetId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-body text-[12px] text-ink-soft underline decoration-hairline underline-offset-2 transition hover:text-ink"
      >
        Remove this import
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <span className="font-body text-[12px] text-ink-soft">
        Remove {name}? Foundry keeps the original.
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await deleteCharacterSheet(campaignId, sheetId);
          if (!res.ok) {
            setError(res.error);
            setBusy(false);
            return;
          }
          router.push(characters.campaign(campaignId));
          router.refresh();
        }}
        className="font-body text-[12px] text-vote-no underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="font-body text-[12px] text-muted"
      >
        Cancel
      </button>
      {error && <span className="font-body text-[12px] text-vote-no">{error}</span>}
    </span>
  );
}
