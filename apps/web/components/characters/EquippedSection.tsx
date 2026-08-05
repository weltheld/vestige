"use client";

import { useState } from "react";
import type { CharacterSheetData, SheetItem, SheetSpell } from "@vestige/db";
import { Panel } from "./SheetPanel";
import { Thumb } from "./Thumb";
import { DetailPanel, PanelDescription, PanelField } from "./DetailPanel";
import { RARITY_COLOR, ITEM_TYPE_LABEL } from "./ItemsTab";

type Open = { kind: "item"; item: SheetItem } | { kind: "spell"; spell: SheetSpell } | null;

/**
 * What the character currently has equipped and prepared: gear in hand right
 * now, spells ready to cast, and — only for a class that casts — how many
 * slots are left of each level.
 *
 * Sits below the identity fields and above the tabs: these are the facts
 * about a character that change moment to moment during a session, a
 * different kind of thing from the fixed stats the Overview tab holds. Both
 * lists open the same detail panel the Items and Spells tabs use, so
 * clicking something here behaves exactly like clicking it there — one
 * interaction learned once, not a second version of it.
 */
export function EquippedSection({ sheet }: { sheet: CharacterSheetData }) {
  const [open, setOpen] = useState<Open>(null);

  const equipped = sheet.items.filter((i) => i.equipped);
  const prepared = sheet.spells.filter((s) => s.prepared);
  const slots = sheet.stats.spellSlots;
  const hasSlots = !!slots && (slots.levels.length > 0 || !!slots.pact);
  const hasPrepared = prepared.length > 0 || hasSlots;

  if (equipped.length === 0 && !hasPrepared) return null;

  return (
    <>
      <Panel title={hasPrepared ? "Equipped & prepared" : "Equipped"}>
        <div className={hasPrepared ? "grid gap-x-8 gap-y-3 lg:grid-cols-2" : undefined}>
          <EquippedList
            items={equipped}
            art={sheet.art}
            onSelect={(item) => setOpen({ kind: "item", item })}
          />
          {hasPrepared && (
            <PreparedColumn
              spells={prepared}
              slots={slots}
              art={sheet.art}
              onSelect={(spell) => setOpen({ kind: "spell", spell })}
            />
          )}
        </div>
      </Panel>

      <DetailPanel
        open={!!open}
        title={open ? (open.kind === "item" ? open.item.name : open.spell.name) : ""}
        subtitle={open ? subtitleFor(open) : undefined}
        onClose={() => setOpen(null)}
      >
        {open?.kind === "item" && <ItemDetail item={open.item} art={sheet.art} />}
        {open?.kind === "spell" && <SpellDetail spell={open.spell} art={sheet.art} />}
      </DetailPanel>
    </>
  );
}

function subtitleFor(open: NonNullable<Open>): string {
  if (open.kind === "item") return ITEM_TYPE_LABEL[open.item.type];
  return `${LEVEL_LABEL[open.spell.level] ?? `Level ${open.spell.level}`}${
    open.spell.school ? ` · ${open.spell.school}` : ""
  }`;
}

function EquippedList({
  items,
  art,
  onSelect,
}: {
  items: SheetItem[];
  art: CharacterSheetData["art"];
  onSelect: (item: SheetItem) => void;
}) {
  if (items.length === 0) {
    return <p className="font-body text-[13px] italic text-muted">Nothing equipped.</p>;
  }

  return (
    // Borderless rows, not chips: a hairline divider between items instead of
    // a box around each one.
    <div className="flex flex-col self-start">
      {items.map((item) => {
        const rarityColor = item.rarity ? RARITY_COLOR[item.rarity.toLowerCase()] : undefined;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="flex items-center gap-2 border-b border-hairline py-1.5 pl-2 pr-1 text-left transition last:border-b-0 hover:bg-cod-soft"
          >
            <Thumb art={art} path={item.imgPath} size={18} />
            <span
              className="min-w-0 flex-1 truncate font-body text-[13px]"
              style={{ color: rarityColor ?? "var(--ink)" }}
            >
              {item.name}
            </span>
            {item.damage && (
              <span className="shrink-0 font-display text-[10px] uppercase tracking-[0.08em] text-muted">
                {item.damage.formula}
              </span>
            )}
            {/* Promoted from `muted` to `ink-soft` — muted is tuned against a
                dark surface and drops below readable contrast on the light
                themes. */}
            <span className="shrink-0 font-display text-[10px] uppercase tracking-[0.04em] text-ink-soft">
              {ITEM_TYPE_LABEL[item.type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Prepared spells as the same kind of chip as equipped gear, then the slot
 *  pip rows underneath — what's ready to cast, and what's left to cast it
 *  with, read together as one column. */
function PreparedColumn({
  spells,
  slots,
  art,
  onSelect,
}: {
  spells: SheetSpell[];
  slots: CharacterSheetData["stats"]["spellSlots"];
  art: CharacterSheetData["art"];
  onSelect: (spell: SheetSpell) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 self-start">
      {spells.length > 0 && (
        // Same borderless-row language as the equipped items list beside it.
        <div className="flex flex-col">
          {spells.map((spell) => (
            <button
              key={spell.id}
              type="button"
              onClick={() => onSelect(spell)}
              title={spell.preparationMode}
              className="flex items-center gap-2 border-b border-hairline py-1.5 pl-2 pr-1 text-left transition last:border-b-0 hover:bg-cod-soft"
            >
              <Thumb art={art} path={spell.imgPath} size={18} />
              <span className="min-w-0 flex-1 truncate font-body text-[13px] text-ink">{spell.name}</span>
            </button>
          ))}
        </div>
      )}
      {slots && (slots.levels.length > 0 || slots.pact) && <SpellSlots slots={slots} />}
    </div>
  );
}

/** Filled-pip trackers, one row per slot level: how many pips are filled is
 *  how many slots are left, so "can I still cast this" reads at a glance
 *  without doing the subtraction from value/max.
 *
 *  Un-stretched: the previous version's pip field flexed to fill whatever
 *  width the grid cell gave it, so four small circles could end up spread
 *  across most of a wide sheet. Pips here size to their own content and the
 *  fraction sits right after them instead of pinned to the row's far edge. */
function SpellSlots({ slots }: { slots: NonNullable<CharacterSheetData["stats"]["spellSlots"]> }) {
  return (
    <ul className="flex flex-col gap-1">
      {slots.levels.map((slot) => (
        <SlotRow key={slot.level} label={ordinal(slot.level)} value={slot.value} max={slot.max} />
      ))}
      {slots.pact && (
        <SlotRow
          label="Pact"
          labelClassName="text-wine"
          suffix={ordinal(slots.pact.level)}
          value={slots.pact.value}
          max={slots.pact.max}
        />
      )}
    </ul>
  );
}

function SlotRow({
  label,
  labelClassName,
  suffix,
  value,
  max,
}: {
  label: string;
  labelClassName?: string;
  suffix?: string;
  value: number;
  max: number;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={`w-9 shrink-0 text-right font-display text-[11px] leading-none ${labelClassName ?? "text-muted"}`}
      >
        {label}
      </span>
      <span className="flex shrink-0 gap-[3px]">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`h-[7px] w-[7px] shrink-0 rounded-full border border-wine ${
              i < value ? "bg-wine" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span className="shrink-0 font-body text-[10.5px] leading-none tabular-nums text-muted">
        {value}/{max}
        {suffix && <span> · {suffix}</span>}
      </span>
    </li>
  );
}

/** "1st", "2nd", "3rd", "4th" … — spell levels never go past 9th, but the
 *  rule holds generally so it isn't worth special-casing. */
function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

const LEVEL_LABEL = [
  "Cantrip",
  "1st level",
  "2nd level",
  "3rd level",
  "4th level",
  "5th level",
  "6th level",
  "7th level",
  "8th level",
  "9th level",
];

/** Same fields the Items tab shows for this item's detail — one definition
 *  of "what a weapon detail looks like" rather than a second one here. */
function ItemDetail({
  item,
  art,
}: {
  item: SheetItem;
  art: CharacterSheetData["art"];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Thumb art={art} path={item.imgPath} size={64} className="rounded-lg" />
      <div>
        {item.damage && (
          <PanelField
            label="Damage"
            value={`${item.damage.formula}${item.damage.type ? ` ${item.damage.type}` : ""}`}
          />
        )}
        {item.properties && item.properties.length > 0 && (
          <PanelField label="Properties" value={item.properties.join(", ")} />
        )}
        <PanelField label="Quantity" value={String(item.quantity)} />
        {item.weight > 0 && (
          <PanelField label="Weight" value={`${Math.round(item.weight * 100) / 100} lb each`} />
        )}
        {item.rarity && (
          <PanelField
            label="Rarity"
            value={
              <span
                className="font-medium capitalize"
                style={{ color: RARITY_COLOR[item.rarity.toLowerCase()] ?? "var(--ink)" }}
              >
                {item.rarity}
              </span>
            }
          />
        )}
        <PanelField label="Equipped" value={item.equipped ? "Yes" : "No"} />
      </div>
      <PanelDescription text={item.description} />
    </div>
  );
}

/** Same fields the Spells tab shows for this spell's detail. */
function SpellDetail({
  spell,
  art,
}: {
  spell: SheetSpell;
  art: CharacterSheetData["art"];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Thumb art={art} path={spell.imgPath} size={64} className="rounded-lg" />
      <div>
        <PanelField label="Casting time" value={spell.castingTime} />
        <PanelField label="Range" value={spell.range} />
        <PanelField label="Components" value={spell.components} />
        <PanelField label="Duration" value={spell.duration} />
        <PanelField label="Preparation" value={spell.preparationMode} />
      </div>
      <PanelDescription text={spell.description} />
    </div>
  );
}
