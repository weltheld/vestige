"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { deleteSession } from "@/app/journal/c/[campaignId]/s/actions";
import { journal } from "@/lib/journal/links";

/** Delete-with-confirmation for the session detail (view) page. Mirrors the
 *  dialog design already used in EditSessionClient's delete flow. */
export function DeleteSessionButton({
  campaignId,
  sessionId,
  title,
}: {
  campaignId: string;
  sessionId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-body text-[12px] text-wine underline decoration-wine/40 underline-offset-2 hover:decoration-wine"
      >
        <Trash2 size={12} /> Delete session
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              aria-label="Cancel"
              className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
              onClick={() => !deleting && setOpen(false)}
            />
            <div className="relative w-full max-w-[380px] rounded-xl border border-hairline bg-surface p-6 shadow-parchment">
              <button
                type="button"
                onClick={() => !deleting && setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-md p-1 text-ink-soft hover:bg-cod-soft hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-display text-lg text-ink">Delete this session?</h2>
              <p className="mt-2 font-body text-[13px] text-ink-soft">
                &ldquo;{title || "Untitled session"}&rdquo; and its notes, comments, and change
                history will be permanently deleted. This can&rsquo;t be undone.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-hairline px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await deleteSession(campaignId, sessionId);
                      router.push(journal.campaign(campaignId));
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
                >
                  <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete session"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
