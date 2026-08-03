"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feather, Loader2, MoreHorizontal, Upload, Users, X } from "lucide-react";
import type { CampaignPlayer } from "@/lib/journal/data";
import type { CharacterSummary } from "@/lib/characters/data";
import { characters } from "@/lib/journal/links";
import { importFoundryCharacter } from "@/app/characters/c/[campaignId]/actions";
import { CharacterAllocationTable } from "./CharacterAllocationTable";

type Import =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "error"; message: string }
  | { step: "done"; message: string };

/**
 * The page's three management actions, behind one button.
 *
 * Importing, allocating and the link to the personal library were three
 * controls of three different weights stacked above the sheet — a loud header
 * for jobs the DM does once after a Foundry push, on a page everyone else
 * opens to read their character. They collapse into a menu; the sheet gets
 * the top of the page back.
 */
export function CharactersMenu({
  campaignId,
  owner,
  roster,
  players,
  allocations,
}: {
  campaignId: string;
  owner: boolean;
  roster: CharacterSummary[];
  players: CampaignPlayer[];
  allocations: Record<string, string>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [allocating, setAllocating] = useState(false);
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

  const unallocated = roster.filter((c) => !allocations[c.id]).length;

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
        {/* The one thing worth surfacing without opening the menu: a sheet
            nobody is allocated to is invisible on everyone else's page. */}
        {owner && unallocated > 0 && !open && (
          <span className="rounded-full bg-wine px-1.5 font-body text-[10px] normal-case tracking-normal text-white">
            {unallocated}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 flex w-[230px] flex-col overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-parchment"
        >
          {owner && (
            <>
              <MenuButton
                icon={<Upload size={14} />}
                label="Import character"
                onClick={() => {
                  setOpen(false);
                  input.current?.click();
                }}
              />
              <MenuButton
                icon={<Users size={14} />}
                label="Who plays what"
                note={unallocated > 0 ? `${unallocated} unallocated` : undefined}
                onClick={() => {
                  setOpen(false);
                  setAllocating(true);
                }}
              />
            </>
          )}
          {/* Sending from Foundry is a personal setup step, not a campaign
              one — the token is yours and one install serves every campaign
              you are in. It lives in the library. */}
          <Link
            href={characters.library()}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 font-body text-[13px] text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          >
            <Feather size={14} />
            Manage characters
          </Link>
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

      {allocating &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              aria-label="Close"
              className="fixed inset-0 bg-[color-mix(in_srgb,var(--ink)_50%,transparent)] backdrop-blur-sm"
              onClick={() => setAllocating(false)}
            />
            <div className="relative flex max-h-[85vh] w-full max-w-[520px] flex-col rounded-xl border border-hairline bg-surface shadow-parchment">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
                <h2 className="font-display text-lg text-ink">Who plays what</h2>
                <button
                  type="button"
                  onClick={() => setAllocating(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-ink-soft transition hover:bg-cod-soft hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {roster.length === 0 ? (
                  <p className="py-4 text-center font-body text-[13px] text-muted">
                    No characters imported yet.
                  </p>
                ) : (
                  <CharacterAllocationTable
                    campaignId={campaignId}
                    roster={roster}
                    players={players}
                    allocations={allocations}
                  />
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  note,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-body text-[13px] text-ink-soft transition hover:bg-cod-soft hover:text-ink"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {note && <span className="font-body text-[11px] text-muted">{note}</span>}
    </button>
  );
}
