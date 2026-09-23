"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { PastSessionLedgerEntry } from "@/lib/journal/pastSessions";
import { journal } from "@/lib/journal/links";

/**
 * Every past Calendar play date, newest first, with a link straight to its
 * journal entry — or straight to writing one, for a date that has none.
 * Answers "when did we last actually play" faster than scanning the full
 * (much longer) entry list below it.
 *
 * Desktop gets a sticky sidebar next to the entry list: a reference to keep
 * in view while scrolling, not something read top to bottom. Mobile gets a
 * collapsed accordion instead — checking for a missing entry matters less
 * here than reading the entries themselves, so it starts out of the way,
 * with a dot marking whether anything needs attention (no count text there,
 * unlike the sidebar — the accordion is meant to be skippable at a glance).
 *
 * The desktop form: a sticky column next to the entry list. Render inside a
 * `lg:grid-cols-[1fr_260px]` row alongside the entry list itself.
 */
export function PastSessionsLedgerSidebar({
  campaignId,
  entries,
}: {
  campaignId: string;
  entries: PastSessionLedgerEntry[];
}) {
  if (entries.length === 0) return null;
  const missingCount = entries.filter((e) => !e.journalSessionId).length;

  return (
    <aside className="sticky top-4 hidden w-[260px] shrink-0 flex-col gap-2 lg:flex">
      <Heading missingCount={missingCount} total={entries.length} />
      <Rows campaignId={campaignId} entries={entries} />
    </aside>
  );
}

/** The mobile form: a collapsed accordion. Render above the entry list,
 *  outside the desktop grid row (it's full-width on its own line). */
export function PastSessionsLedgerMobile({
  campaignId,
  entries,
}: {
  campaignId: string;
  entries: PastSessionLedgerEntry[];
}) {
  if (entries.length === 0) return null;
  const missingCount = entries.filter((e) => !e.journalSessionId).length;

  return <MobileAccordion campaignId={campaignId} entries={entries} missingCount={missingCount} />;
}

function Heading({ missingCount, total }: { missingCount: number; total: number }) {
  return (
    <div className="flex flex-col gap-px">
      <h2 className="font-display text-[12.5px] font-semibold text-ink-soft">Past sessions</h2>
      <span className="font-display text-[10px] text-muted">
        {total} play {total === 1 ? "date" : "dates"}
        {missingCount > 0 && ` · ${missingCount} without an entry`}
      </span>
    </div>
  );
}

function MobileAccordion({
  campaignId,
  entries,
  missingCount,
}: {
  campaignId: string;
  entries: PastSessionLedgerEntry[];
  missingCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 overflow-hidden rounded-xl bg-cod-soft lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5"
      >
        <span className="flex items-center gap-2">
          {missingCount > 0 && <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-wine" />}
          <span className="font-display text-[12.5px] font-semibold text-ink-soft">
            Past sessions
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-hairline">
          <Rows campaignId={campaignId} entries={entries} rounded={false} />
        </div>
      )}
    </div>
  );
}

function Rows({
  campaignId,
  entries,
  rounded = true,
}: {
  campaignId: string;
  entries: PastSessionLedgerEntry[];
  rounded?: boolean;
}) {
  return (
    <div className={`overflow-hidden bg-cod-soft ${rounded ? "rounded-xl" : ""}`}>
      {entries.map((entry) => (
        <Row key={entry.date} campaignId={campaignId} entry={entry} />
      ))}
    </div>
  );
}

function Row({
  campaignId,
  entry,
}: {
  campaignId: string;
  entry: PastSessionLedgerEntry;
}) {
  const d = parseISO(entry.date);
  const href = entry.journalSessionId
    ? journal.session(campaignId, entry.journalSessionId)
    : journal.newSession(campaignId, entry.date);

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-2.5 text-left transition last:border-b-0 hover:bg-parchment"
    >
      <span className="w-9 shrink-0 font-display text-[9px] font-semibold uppercase leading-[1.25] tracking-[0.05em] text-gold-soft">
        {format(d, "MMM")}
        <span className="block font-body text-[13px] font-normal normal-case tracking-normal text-ink-soft">
          {format(d, "d")}
        </span>
      </span>
      <span
        className={`min-w-0 flex-1 truncate font-body text-[11.5px] ${
          entry.journalSessionId ? "text-ink" : "italic text-wine"
        }`}
      >
        {entry.title ?? "No entry yet"}
      </span>
      {!entry.journalSessionId && (
        <span className="shrink-0 rounded-full border border-wine px-1.5 py-[1px] font-display text-[9px] uppercase tracking-[0.04em] text-wine">
          Add
        </span>
      )}
    </Link>
  );
}
