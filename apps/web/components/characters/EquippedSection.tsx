import type { CharacterSheetData } from "@vestige/db";
import { Panel } from "./SheetPanel";
import { Thumb } from "./Thumb";

/**
 * What the character currently has equipped, and — only for a class that
 * casts — how many spell slots remain of each level.
 *
 * Sits below the identity fields and above the tabs: these are the two
 * facts about a character that change from moment to moment during a
 * session, which is a different kind of thing from the fixed stats the
 * Overview tab holds. A non-caster gets no slot half at all rather than an
 * empty one — the same rule the rest of the sheet uses everywhere.
 */
export function EquippedSection({ sheet }: { sheet: CharacterSheetData }) {
  const equipped = sheet.items.filter((i) => i.equipped);
  const slots = sheet.stats.spellSlots;
  const hasSlots = !!slots && (slots.levels.length > 0 || !!slots.pact);

  if (equipped.length === 0 && !hasSlots) return null;

  return (
    <Panel title={hasSlots ? "Equipped & prepared" : "Equipped"}>
      <div className={hasSlots ? "grid gap-x-8 gap-y-3 lg:grid-cols-2" : undefined}>
        <EquippedList items={equipped} art={sheet.art} />
        {hasSlots && <SpellSlots slots={slots!} />}
      </div>
    </Panel>
  );
}

function EquippedList({
  items,
  art,
}: {
  items: CharacterSheetData["items"];
  art: CharacterSheetData["art"];
}) {
  if (items.length === 0) {
    return <p className="font-body text-[13px] italic text-muted">Nothing equipped.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1.5 border border-hairline bg-surface py-1 pl-1 pr-2"
        >
          <Thumb art={art} path={item.imgPath} size={18} />
          <span className="font-body text-[13px] text-ink">{item.name}</span>
          {item.damage && (
            <span className="font-display text-[10px] uppercase tracking-[0.08em] text-muted">
              {item.damage.formula}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Filled-pip trackers, one row per slot level: how many pips are filled is
 *  how many slots are left, so "can I still cast this" reads at a glance
 *  without doing the subtraction from value/max. */
function SpellSlots({ slots }: { slots: NonNullable<CharacterSheetData["stats"]["spellSlots"]> }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {slots.levels.map((slot) => (
        <SlotRow
          key={slot.level}
          label={ordinal(slot.level)}
          value={slot.value}
          max={slot.max}
        />
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
    <li className="flex items-center gap-2">
      <span
        className={`w-10 shrink-0 font-display text-[13px] leading-none ${labelClassName ?? "text-ink-soft"}`}
      >
        {label}
      </span>
      <span className="flex flex-1 flex-wrap gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`h-[11px] w-[11px] shrink-0 rounded-full border-[1.5px] border-wine ${
              i < value ? "bg-wine" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span className="shrink-0 font-display text-[13px] leading-none tabular-nums text-ink-soft">
        {value}/{max}
        {suffix && <span className="text-muted"> · {suffix}</span>}
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
