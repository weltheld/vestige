"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { CharacterSheetData, SheetFeature } from "@vestige/db";
import { DetailPanel, PanelDescription, PanelField } from "./DetailPanel";
import { Empty, GroupHeading } from "./ItemsTab";
import { Thumb } from "./Thumb";

/**
 * Class features, racial traits and feats, grouped by where they came from.
 *
 * The usage counts are a snapshot from the import, and the UI says so out
 * loud — Vestige has no way to know what's been spent in Foundry since. An
 * unqualified "2/3 remaining" would be a claim we can't back.
 */
export function FeaturesTab({
  features,
  art,
  importedAt,
}: {
  features: SheetFeature[];
  art: CharacterSheetData["art"];
  importedAt: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = features.find((f) => f.id === openId) ?? null;

  if (features.length === 0) {
    return <Empty>No features in this import.</Empty>;
  }

  // Group by source, in the order the sources first appear, with the generic
  // buckets pushed to the end so class features lead.
  const groups = new Map<string, SheetFeature[]>();
  for (const f of features) {
    const list = groups.get(f.source) ?? [];
    list.push(f);
    groups.set(f.source, list);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));

  const asOf = formatImportDate(importedAt);

  return (
    <>
      <div className="flex flex-col gap-5">
        {ordered.map(([source, list]) => (
          <section key={source}>
            <GroupHeading label={source} count={list.length} />
            <ul className="flex flex-col rounded-xl bg-cod-soft px-4 py-1.5">
              {list.map((f) => (
                <li key={f.id} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(f.id)}
                    aria-expanded={openId === f.id}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-80"
                  >
                    <Thumb art={art} path={f.imgPath} />
                    <span className="min-w-0 flex-1 truncate font-body text-[14px] text-ink">
                      {f.name}
                    </span>
                    {f.uses && (
                      <span className="shrink-0 font-body text-[12px] tabular-nums text-muted">
                        {f.uses.value}/{f.uses.max}
                        {f.uses.recharge ? ` per ${f.uses.recharge}` : ""}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <DetailPanel
        open={!!open}
        title={open?.name ?? ""}
        subtitle={open?.source}
        onClose={() => setOpenId(null)}
      >
        {open && (
          <div className="flex flex-col gap-4">
            <Thumb art={art} path={open.imgPath} size={64} className="rounded-lg" />
            {(open.uses || open.actionType) && (
              <div>
                {open.uses && (
                  <PanelField
                    label="Uses"
                    value={
                      <span>
                        {open.uses.value} of {open.uses.max} remaining
                        {open.uses.recharge ? ` per ${open.uses.recharge}` : ""}
                        {/* The staleness disclosure, next to the number it
                            qualifies rather than buried in a page footer. */}
                        <span className="block font-body text-[11px] italic text-muted">
                          as of last import{asOf ? `, ${asOf}` : ""}
                        </span>
                      </span>
                    }
                  />
                )}
                {open.actionType && (
                  <PanelField
                    label="Action"
                    value={<span className="capitalize">{open.actionType}</span>}
                  />
                )}
              </div>
            )}
            <PanelDescription text={open.description} />
          </div>
        )}
      </DetailPanel>
    </>
  );
}

/** Class features first, then race and background, with the catch-all last. */
function rank(source: string): number {
  const s = source.toLowerCase();
  if (s === "other") return 4;
  if (s === "feat") return 3;
  if (s === "background") return 2;
  if (s === "race") return 1;
  return 0;
}

function formatImportDate(iso: string): string | null {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return null;
  }
}
