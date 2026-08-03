"use client";

import { useState } from "react";
import type { CharacterSheetData } from "@vestige/db";
import { OverviewTab } from "./OverviewTab";
import { ItemsTab } from "./ItemsTab";
import { FeaturesTab } from "./FeaturesTab";
import { SpellsTab } from "./SpellsTab";
import { Thumb } from "./Thumb";

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
  // A multiclass character has more than one class badge and this field is
  // one combined string ("Fighter 5 / Wizard 2") — showing the first class's
  // icon is a simplification, not wrong exactly, since there's no single
  // icon that could represent a combined line truthfully either way.
  const classIconPath = identity.classes[0]?.iconPath;
  const subclassIconPath = identity.classes.find((c) => c.subclass)?.subclassIconPath;

  const fields = [
    { label: "Class & level", value: classLine, iconPath: classIconPath },
    { label: "Subclass", value: subclasses.join(" · "), iconPath: subclassIconPath },
    { label: "Race", value: identity.race, iconPath: identity.raceIconPath },
    { label: "Background", value: identity.background, iconPath: identity.backgroundIconPath },
  ].filter((f) => !!f.value?.trim());

  return (
    <header className="flex flex-col">
      {/* Option 3 from the drafted concepts: a colour band the portrait
          overlaps, rather than a box beside the text. The band is a gradient
          in the theme's own --gold, not the character's photo — it never
          needs a real portrait to avoid looking empty, unlike a banner built
          from the image itself would. It fades to transparent rather than
          stopping at a hard edge, so it blends into the page's own
          background instead of reading as a rectangle laid on top of it; the
          fade is most of the band's height (a third solid, the rest fading)
          so it's a genuine transition, not a band with a thin blur at its
          foot. All text stays below it, on the plain page background, so
          nothing has to stay legible against a gradient mid-fade. */}
      <div
        className="h-24 w-full rounded-t-lg"
        style={{ background: "linear-gradient(180deg, var(--gold) 0%, var(--gold) 20%, transparent 100%)" }}
      />
      <div className="-mt-12 flex items-end gap-4 border-b-2 border-ink px-1 pb-3">
        {/* Overlaps the band by half its own height — center of the circle
            sits right where the gradient is fading through, so it visibly
            emerges from the colour rather than sitting beside it. */}
        <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-parchment bg-cod-soft shadow-md">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-[34px] text-wine">
              {identity.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <dl className="flex min-w-0 flex-1 flex-wrap items-end gap-x-6 gap-y-1.5 pb-1">
          {/* Same size as Class & level, Race, etc. below — it used to be set
              at 28px, nearly double the fields it introduces, which made the
              whole header read as two unrelated tiers rather than one row of
              facts about one character. */}
          <div className="min-w-0">
            <dd className="truncate font-display text-[14px] leading-tight text-ink">
              {identity.name}
            </dd>
            <dt className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              Character name
            </dt>
          </div>
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              {/* Thumb renders nothing when the artwork step hasn't copied
                  this icon yet, so a field with no matched art still lines
                  up exactly like it did before this existed. */}
              <dd className="flex items-center gap-1.5 truncate font-body text-[14px] leading-tight text-ink">
                <Thumb art={sheet.art} path={field.iconPath} size={18} />
                <span className="truncate">{field.value}</span>
              </dd>
              <dt className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                {field.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
