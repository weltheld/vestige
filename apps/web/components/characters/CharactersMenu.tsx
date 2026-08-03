"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feather, Loader2, MoreHorizontal, Upload } from "lucide-react";
import { characters } from "@/lib/journal/links";
import { importFoundryCharacter } from "@/app/characters/c/[campaignId]/actions";

type Import =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "error"; message: string }
  | { step: "done"; message: string };

/**
 * The page's management actions, out of the way of the sheet.
 *
 * Importing and the link to the personal library were two controls of two
 * different weights above the sheet, on a page everyone else opens to read
 * their character. A player only has the one action, so they get a plain
 * link; the DM gets both behind a menu.
 *
 * "Manage characters" is a real `<Link>` rather than a dialog of its own: the
 * intercepted (.)library route turns it into an overlay above this page, so
 * the same panel serves the errand here and a direct visit elsewhere.
 */
export function CharactersMenu({
  campaignId,
  owner,
}: {
  campaignId: string;
  owner: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Import>({ step: "idle" });

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setState({ step: "reading" });

    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ step: "error", message: "That file couldn't be read. Try exporting it again." });
      return;
    }

    const res = await importFoundryCharacter(campaignId, text);
    // Let the same file be picked again — without this, re-uploading after a
    // fix silently does nothing because the input's value hasn't changed.
    if (input.current) input.current.value = "";

    if (!res.ok) {
      setState({ step: "error", message: res.error });
      return;
    }
    setState({
      step: "done",
      message: res.replaced ? `Updated ${res.name}.` : `Imported ${res.name}.`,
    });
    router.push(characters.sheet(campaignId, res.sheetId));
    router.refresh();
  }

  const manageLink = (
    <Link
      href={characters.library()}
      role={owner ? "menuitem" : undefined}
      onClick={() => setOpen(false)}
      className={
        owner
          ? "flex items-center gap-2.5 px-3.5 py-2.5 font-body text-[13px] text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          : "inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:border-gold hover:text-ink"
      }
    >
      <Feather size={14} />
      Manage characters
    </Link>
  );

  if (!owner) return manageLink;

  return (
    <div ref={wrapper} className="relative flex flex-col items-end gap-1.5">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:border-gold hover:text-ink"
      >
        {state.step === "reading" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <MoreHorizontal size={14} />
        )}
        {state.step === "reading" ? "Importing…" : "Manage"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 flex w-[230px] flex-col overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-parchment"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              input.current?.click();
            }}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-body text-[13px] text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          >
            <Upload size={14} />
            Import character
          </button>
          {/* Sending from Foundry is a personal setup step, not a campaign
              one — the token is yours and one install serves every campaign
              you are in. It lives with the library. */}
          {manageLink}
        </div>
      )}

      {state.step === "error" && (
        <p className="max-w-[420px] text-right font-body text-[12px] text-vote-no">
          {state.message}
        </p>
      )}
      {state.step === "done" && (
        <p className="font-body text-[12px] text-muted">{state.message}</p>
      )}
    </div>
  );
}
