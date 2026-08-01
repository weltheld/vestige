"use client";

import { useState } from "react";
import type { CharacterSheetData } from "@vestige/db";
import { OverviewTab } from "./OverviewTab";
import { ItemsTab } from "./ItemsTab";
import { FeaturesTab } from "./FeaturesTab";
import { SpellsTab } from "./SpellsTab";

type TabKey = "overview" | "items" | "features" | "spells";

/**
 * One imported sheet: header, tabs, body.
 *
 * The tab set is built from what the character actually has — a fighter gets
 * no empty Spells tab to click into and find nothing.
 */
export function CharacterSheetView({
  sheet,
  importedAt,
}: {
  sheet: CharacterSheetData;
  importedAt: string;
}) {
  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Items", count: sheet.items.length },
    { key: "features", label: "Features", count: sheet.features.length },
  ];
  if (sheet.spells.length > 0) {
    tabs.push({ key: "spells", label: "Spells", count: sheet.spells.length });
  }

  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="flex flex-col gap-5">
      <SheetHeader sheet={sheet} />

      <div
        role="tablist"
        aria-label="Character sheet sections"
        className="flex gap-1 overflow-x-auto border-b border-hairline"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              tab === t.key
                ? "border-gold text-ink"
                : "border-transparent text-muted hover:text-ink-soft"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 font-body text-[11px] normal-case tracking-normal text-muted">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab sheet={sheet} />}
      {tab === "items" && <ItemsTab items={sheet.items} />}
      {tab === "features" && (
        <FeaturesTab features={sheet.features} importedAt={importedAt} />
      )}
      {tab === "spells" && <SpellsTab spells={sheet.spells} />}
    </div>
  );
}

function SheetHeader({ sheet }: { sheet: CharacterSheetData }) {
  const { identity } = sheet;
  // "Fighter 5 / Wizard 2" — the multiclass format, built from every class
  // Foundry exported rather than just the first.
  const classLine = identity.classes
    .map((c) => `${c.name} ${c.level}`)
    .join(" / ");
  const subclasses = identity.classes
    .map((c) => c.subclass)
    .filter((s): s is string => !!s);

  const meta = [identity.race, classLine, identity.background, identity.alignment]
    .map((s) => s?.trim())
    .filter(Boolean);

  return (
    <header className="flex items-center gap-4 rounded-xl bg-cod-soft px-5 py-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[20px] text-parchment ring-1 ring-[color-mix(in_srgb,var(--gold)_55%,var(--surface))]">
        {identity.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={identity.portraitUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          identity.name.charAt(0).toUpperCase()
        )}
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-[22px] leading-tight text-ink">{identity.name}</h1>
        {meta.length > 0 && (
          <p className="mt-0.5 font-body text-[13px] text-ink-soft">{meta.join(" · ")}</p>
        )}
        {subclasses.length > 0 && (
          <p className="font-body text-[12px] text-muted">{subclasses.join(" · ")}</p>
        )}
      </div>
    </header>
  );
}
