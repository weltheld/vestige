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
    <div className="flex flex-col gap-4">
      <SheetHeader sheet={sheet} />

      <div
        role="tablist"
        aria-label="Character sheet sections"
        // Scrollable so a caster's four tabs never wrap, but with the bar
        // itself hidden: on Windows it's always visible, and a scrollbar
        // parked beside the tabs reads as a broken layout.
        className="flex gap-1 overflow-x-auto border-b border-hairline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      {tab === "items" && <ItemsTab items={sheet.items} art={sheet.art} />}
      {tab === "features" && (
        <FeaturesTab features={sheet.features} art={sheet.art} importedAt={importedAt} />
      )}
      {tab === "spells" && <SpellsTab spells={sheet.spells} art={sheet.art} />}
    </div>
  );
}

/**
 * The masthead of the sheet: portrait plate, then the identity as labelled
 * fields.
 *
 * Field-under-value, the way a printed sheet is laid out — the value is what
 * you read and the label is what tells you why, so it goes second. The
 * portrait is given real size rather than being an avatar chip: it is the one
 * thing on the page that isn't a number, and the module now goes to some
 * trouble to fetch it.
 */
function SheetHeader({ sheet }: { sheet: CharacterSheetData }) {
  const { identity } = sheet;
  // A copied portrait beats the one Foundry pointed at: the export's path
  // means nothing outside that install, and only an http URL ever survived.
  const portrait =
    (identity.portraitPath ? sheet.art?.[identity.portraitPath] : undefined) ??
    identity.portraitUrl;
  // "Fighter 5 / Wizard 2" — the multiclass format, built from every class
  // Foundry exported rather than just the first.
  const classLine = identity.classes.map((c) => `${c.name} ${c.level}`).join(" / ");
  const subclasses = identity.classes
    .map((c) => c.subclass)
    .filter((s): s is string => !!s);

  const fields = [
    { label: "Class & level", value: classLine },
    { label: "Subclass", value: subclasses.join(" · ") },
    { label: "Race", value: identity.race },
    { label: "Background", value: identity.background },
    { label: "Alignment", value: identity.alignment },
  ].filter((f) => !!f.value?.trim());

  return (
    <header className="flex items-stretch gap-4 border-b-2 border-ink pb-3">
      <span className="flex h-[5.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden border-[1.5px] border-ink bg-cod-soft p-1">
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-[26px] text-wine">
            {identity.name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col justify-end gap-2">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] leading-none text-ink">
            {identity.name}
          </h1>
          <p className="mt-1 font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            Character name
          </p>
        </div>

        {fields.length > 0 && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1.5">
            {fields.map((field) => (
              <div key={field.label} className="min-w-0">
                <dd className="truncate font-body text-[14px] leading-tight text-ink">
                  {field.value}
                </dd>
                <dt className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {field.label}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}
