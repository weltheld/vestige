"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Library, Loader2, X, Check } from "lucide-react";
import type { NpcKindDb } from "@vestige/db";
import {
  previewCodexExtraction,
  applyCodexExtraction,
  type ExtractedEntityPreview,
} from "@/app/journal/c/[campaignId]/s/actions";

const KIND_LABEL: Record<NpcKindDb, string> = {
  person: "Person",
  place: "Place",
  event: "Event",
  item: "Item",
  creature: "Creature",
};

type Phase =
  | { step: "idle" }
  | { step: "previewing" }
  | { step: "reviewing"; entities: ExtractedEntityPreview[]; selected: Set<number> }
  | { step: "applying"; entities: ExtractedEntityPreview[]; selected: Set<number> }
  | { step: "done"; created: number; linked: number }
  | { step: "error"; message: string };

/** Owner-only: run the AI extraction pass over this session, then let the
 *  owner review and choose which found entities actually get added to the
 *  codex before anything is written — sits next to "Edit session" in the
 *  hero. */
export function ExtractCodexButton({
  campaignId,
  sessionId,
}: {
  campaignId: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ step: "idle" });

  async function startPreview() {
    setPhase({ step: "previewing" });
    const res = await previewCodexExtraction(campaignId, sessionId);
    if (!res.ok) {
      setPhase({ step: "error", message: res.error });
      return;
    }
    // Everything found starts checked — the review step is for trimming
    // down, not opting in one by one.
    setPhase({
      step: "reviewing",
      entities: res.entities,
      selected: new Set(res.entities.map((_, i) => i)),
    });
  }

  async function confirmSelected() {
    if (phase.step !== "reviewing") return;
    const { entities, selected } = phase;
    setPhase({ step: "applying", entities, selected });
    const res = await applyCodexExtraction(
      campaignId,
      sessionId,
      entities.filter((_, i) => selected.has(i)).map((e) => ({ name: e.name, kind: e.kind, summary: e.summary })),
    );
    if (!res.ok) {
      setPhase({ step: "error", message: res.error });
      return;
    }
    setPhase({ step: "done", created: res.created, linked: res.linked });
    router.refresh();
  }

  function close() {
    setPhase({ step: "idle" });
  }

  const busy = phase.step === "previewing" || phase.step === "applying";

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={startPreview}
        title="Find people, places, and events in this session and review them for the codex"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-black/30 px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition hover:bg-black/45 disabled:opacity-60"
      >
        {phase.step === "previewing" ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Library size={12} />
        )}
        {phase.step === "previewing" ? "Reading session…" : "Add to Codex"}
      </button>

      {phase.step !== "idle" &&
        phase.step !== "previewing" &&
        typeof document !== "undefined" &&
        createPortal(
          <ExtractDialog
            phase={phase}
            onToggle={(i) =>
              setPhase((p) => {
                if (p.step !== "reviewing") return p;
                const next = new Set(p.selected);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return { ...p, selected: next };
              })
            }
            onToggleAll={(checked) =>
              setPhase((p) => {
                if (p.step !== "reviewing") return p;
                return {
                  ...p,
                  selected: checked ? new Set(p.entities.map((_, i) => i)) : new Set(),
                };
              })
            }
            onConfirm={confirmSelected}
            onClose={close}
          />,
          document.body,
        )}
    </>
  );
}

function ExtractDialog({
  phase,
  onToggle,
  onToggleAll,
  onConfirm,
  onClose,
}: {
  phase: Phase;
  onToggle: (i: number) => void;
  onToggleAll: (checked: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const applying = phase.step === "applying";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="fixed inset-0 bg-[color-mix(in_srgb,var(--ink)_50%,transparent)] backdrop-blur-sm"
        onClick={applying ? undefined : onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-[520px] flex-col rounded-xl border border-hairline bg-surface shadow-parchment">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="font-display text-lg text-ink">Add to Codex</h2>
          {!applying && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-ink-soft hover:bg-cod-soft hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {(phase.step === "reviewing" || phase.step === "applying") && (
            <EntityList phase={phase} onToggle={onToggle} onToggleAll={onToggleAll} />
          )}
          {phase.step === "done" && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Check className="h-8 w-8 text-vote-yes" />
              <p className="font-body text-[14px] text-ink">
                {phase.created > 0
                  ? `${phase.created} new ${phase.created === 1 ? "entry" : "entries"} added`
                  : "No new entries"}
                {phase.linked > phase.created && (
                  <>
                    {" "}
                    · {phase.linked - phase.created} linked to existing{" "}
                    {phase.linked - phase.created === 1 ? "entry" : "entries"}
                  </>
                )}
              </p>
            </div>
          )}
          {phase.step === "error" && (
            <p className="py-6 text-center font-body text-[14px] text-vote-no">{phase.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-hairline px-5 py-4">
          {phase.step === "reviewing" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-hairline px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft hover:bg-cod-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={phase.selected.size === 0}
                onClick={onConfirm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
              >
                Add {phase.selected.size} to Codex
              </button>
            </>
          )}
          {applying && (
            <span className="inline-flex items-center gap-1.5 font-body text-[13px] text-ink-soft">
              <Loader2 size={14} className="animate-spin" /> Adding…
            </span>
          )}
          {(phase.step === "done" || phase.step === "error") && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-wine px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityList({
  phase,
  onToggle,
  onToggleAll,
}: {
  phase: { entities: ExtractedEntityPreview[]; selected: Set<number> };
  onToggle: (i: number) => void;
  onToggleAll: (checked: boolean) => void;
}) {
  const { entities, selected } = phase;
  const allChecked = selected.size === entities.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-body text-[12px] text-ink-soft">
          Found {entities.length} {entities.length === 1 ? "entry" : "entries"} in this session.
          Uncheck any you don&apos;t want.
        </p>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 font-body text-[11px] text-ink-soft">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => onToggleAll(e.target.checked)}
            className="accent-[var(--gold)]"
          />
          Select all
        </label>
      </div>

      <ul className="flex flex-col gap-2">
        {entities.map((e, i) => (
          <li
            key={`${e.name}-${i}`}
            className="flex items-start gap-3 rounded-[10px] border border-hairline bg-cod-soft px-3.5 py-3"
          >
            <input
              type="checkbox"
              checked={selected.has(i)}
              onChange={() => onToggle(i)}
              className="mt-0.5 shrink-0 accent-[var(--gold)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-display text-[13px] font-semibold text-ink">{e.name}</span>
                <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-gold">
                  {KIND_LABEL[e.kind]}
                </span>
                {e.existingId && (
                  <span className="font-body text-[11px] italic text-muted">Existing entry — will link</span>
                )}
              </div>
              {e.summary && (
                <p className="mt-1 font-body text-[12px] leading-[1.5] text-ink-soft">{e.summary}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
