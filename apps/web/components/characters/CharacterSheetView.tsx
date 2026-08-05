"use client";

import { useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import type { CharacterSheetData } from "@vestige/db";
import { OverviewTab } from "./OverviewTab";
import { ItemsTab } from "./ItemsTab";
import { FeaturesTab } from "./FeaturesTab";
import { SpellsTab } from "./SpellsTab";
import { Thumb } from "./Thumb";
import { EquippedSection } from "./EquippedSection";
import { ImageCropper } from "../council/ImageCropper";
import { setCharacterPortrait, clearCharacterPortrait } from "@/app/characters/c/[campaignId]/actions";

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
  campaignId,
  sheetId,
}: {
  sheet: CharacterSheetData;
  importedAt: string;
  campaignId: string;
  sheetId: string;
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
      <SheetHeader sheet={sheet} campaignId={campaignId} sheetId={sheetId} />
      <EquippedSection sheet={sheet} />

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
 * The masthead of the sheet: portrait, then the identity as labelled fields.
 *
 * Field-under-value, the way a printed sheet is laid out — the value is what
 * you read and the label is what tells you why, so it goes second. The
 * portrait is given real size rather than being an avatar chip: it is the one
 * thing on the page that isn't a number, and the module now goes to some
 * trouble to fetch it. No banner behind it — a photo stretched into a band
 * competed with the ink-on-parchment the rest of the sheet commits to, and
 * the portrait reads clearly enough on the plain page background on its own.
 */
function SheetHeader({
  sheet,
  campaignId,
  sheetId,
}: {
  sheet: CharacterSheetData;
  campaignId: string;
  sheetId: string;
}) {
  const { identity } = sheet;

  // Local override so a fresh upload or a clear shows immediately, without
  // waiting on the page's next server round-trip. `undefined` = no
  // override, defer to the sheet as loaded; `null` = explicitly cleared.
  const [manualOverride, setManualOverride] = useState<string | null | undefined>(undefined);
  const manualPortrait = manualOverride !== undefined ? manualOverride : sheet.manualPortraitUrl;

  // A hand-uploaded portrait wins over anything Foundry provided — it's the
  // fallback for exactly the case where Foundry's own image was unusable, so
  // it has to outrank both the copied art and the raw export URL, not just
  // fill in when they're absent. A copied portrait then beats the one
  // Foundry pointed at: the export's path means nothing outside that
  // install, and only an http URL ever survived.
  const portrait =
    manualPortrait ??
    (identity.portraitPath ? sheet.art?.[identity.portraitPath] : undefined) ??
    identity.portraitUrl;

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function onPickPortrait(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPortraitError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPortraitError("Image must be 5 MB or smaller.");
      return;
    }
    setPortraitError(null);
    setCropFile(file);
  }

  async function uploadPortrait(blob: Blob) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "portrait.jpg");
      const result = await setCharacterPortrait(campaignId, sheetId, fd);
      if (!result.ok) {
        setPortraitError(result.error);
        return;
      }
      setManualOverride(result.url);
      setCropFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function onClearPortrait() {
    setUploading(true);
    setPortraitError(null);
    try {
      const result = await clearCharacterPortrait(campaignId, sheetId);
      if (!result.ok) {
        setPortraitError(result.error);
        return;
      }
      setManualOverride(null);
    } finally {
      setUploading(false);
    }
  }
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
    <header className="flex items-end gap-4 border-b-2 border-ink pb-3">
      {/* A medallion frame, not just a border: a gold ring set outside the
          portrait itself (a gap of its own, so the two read as two rings
          rather than one thick one) with a small diamond at each compass
          point where a locket's hinges or rivets would sit. --gold is the
          app's one recurring accent already (icon borders, the Save DC
          note, …), so this reaches for the same colour every theme already
          uses rather than introducing a new one. */}
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
        {cropFile && (
          <ImageCropper
            file={cropFile}
            round
            aspect={1}
            viewWidth={256}
            outputWidth={512}
            title="Position the portrait"
            onCancel={() => setCropFile(null)}
            onConfirm={uploadPortrait}
          />
        )}
        <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-gold" />
        <span className="pointer-events-none absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold" />
        <span className="pointer-events-none absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-gold" />
        <span className="pointer-events-none absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold" />
        <span className="pointer-events-none absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rotate-45 bg-gold" />
        <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-hairline bg-cod-soft">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-[34px] text-wine">
              {identity.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPortrait}
        />
        {/* Foundry's own export often has no usable portrait (a token image
            behind a running instance, a local file path) — this is the way
            around that, not just a cosmetic touch-up. Sits on the medallion
            ring itself, not the portrait circle, so it never covers the
            face it's letting you replace. */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          title="Upload a portrait"
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-hairline bg-surface text-ink-soft shadow-sm transition hover:border-gold hover:text-ink disabled:opacity-50"
        >
          <Pencil size={13} />
        </button>
        {manualPortrait && (
          <button
            type="button"
            onClick={onClearPortrait}
            disabled={uploading}
            title="Remove the uploaded portrait"
            className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-hairline bg-surface text-ink-soft shadow-sm transition hover:border-wine hover:text-wine disabled:opacity-50"
          >
            <X size={12} />
          </button>
        )}
        {portraitError && (
          <p className="absolute left-0 top-full z-10 mt-1 w-40 text-center font-body text-[11px] text-wine">
            {portraitError}
          </p>
        )}
      </div>

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
    </header>
  );
}
