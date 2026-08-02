import type { AbilityKey, CharacterSheetData } from "@vestige/db";
import { ABILITIES, ABILITY_LABEL } from "@/lib/characters/foundry";
import { ProficiencyDot, proficiencyLabel, signed } from "./ProficiencyDot";
import { RULED_PAPER } from "./paper";

/**
 * Everything about the character except what has its own tab, set as a sheet
 * of paper rather than a dashboard.
 *
 * The previous version was accurate and dense and read as a stat block. This
 * one keeps every number and changes what the page is pretending to be:
 *
 *  - Ruled stock, hard-boxed fields, and the label UNDER the number — the
 *    arrangement every printed 5e sheet uses, and the reason this is legible
 *    to someone who has never seen Vestige before.
 *  - Saving throws get their own panel again. They sat on the ability card to
 *    save space, but on paper they are a list you read down, and the ability
 *    column is stronger for holding one number instead of three.
 *  - Skills stay grouped by governing ability. That grouping is better than
 *    the printed sheet's alphabetical run and worth keeping.
 */
export function OverviewTab({ sheet }: { sheet: CharacterSheetData }) {
  const { stats } = sheet;

  return (
    <div
      className="border-[1.5px] border-ink bg-surface p-4 sm:p-6"
      style={RULED_PAPER}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <AbilityColumn abilities={stats.abilities} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Vitals sheet={sheet} />
          <SavingThrows saves={stats.savingThrows} />
          <Skills skills={stats.skills} />
          <Purse currency={stats.currency} encumbrance={stats.encumbrance} />
        </div>
      </div>
    </div>
  );
}

/**
 * The six abilities down the left edge, as they are on paper.
 *
 * The modifier is the big number because it is what gets used at the table;
 * the raw score is the small pill beneath, the way the printed sheet puts it
 * in a circle at the bottom of the box.
 */
function AbilityColumn({
  abilities,
}: {
  abilities: Record<AbilityKey, { value: number; modifier: number }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:w-[7.5rem] lg:shrink-0 lg:grid-cols-1">
      {ABILITIES.map((key) => (
        <div
          key={key}
          className="flex flex-col items-center border-[1.5px] border-ink bg-surface px-2 py-1.5"
        >
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {ABILITY_LABEL[key]}
          </span>
          <span className="font-display text-[24px] leading-tight tabular-nums text-ink">
            {signed(abilities[key].modifier)}
          </span>
          <span className="mt-0.5 rounded-full border border-ink bg-parchment px-2 font-body text-[11px] tabular-nums text-ink-soft">
            {abilities[key].value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** HP, AC, speed, proficiency — and spellcasting only when the character
 *  actually casts. A non-caster gets no empty box. */
function Vitals({ sheet }: { sheet: CharacterSheetData }) {
  const { hp, ac, speed, proficiencyBonus, spellcasting } = sheet.stats;

  return (
    <div className="flex flex-wrap gap-2">
      <Box
        value={`${hp.value}/${hp.max}`}
        label="Hit points"
        note={hp.temp > 0 ? `+${hp.temp} temp` : undefined}
      />
      {/* 0 is the parser saying it couldn't work the AC out — a custom formula
          it won't guess at. An em dash says that; "0" lies. */}
      <Box value={ac > 0 ? String(ac) : "—"} label="Armour class" />
      <Box value={`${speed} ft`} label="Speed" />
      <Box value={signed(proficiencyBonus)} label="Proficiency" />
      {spellcasting && (
        <>
          <Box value={signed(spellcasting.attackModifier)} label="Spell attack" />
          <Box
            value={String(spellcasting.saveDc)}
            label="Save DC"
            note={ABILITY_LABEL[spellcasting.ability]}
          />
        </>
      )}
    </div>
  );
}

/** One boxed field: number above, what it is below. */
function Box({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="flex min-w-[5.5rem] flex-1 flex-col items-center border-[1.5px] border-ink bg-surface px-3 py-1.5">
      <span className="font-display text-[22px] leading-tight tabular-nums text-ink">
        {value}
      </span>
      <span className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      {note && <span className="font-body text-[10px] text-muted">{note}</span>}
    </div>
  );
}

/** A panel with a stamped header bar — the sheet's one piece of solid ink,
 *  which is what makes the ruled stock behind it read as paper. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-[1.5px] border-ink bg-surface">
      <h2 className="bg-ink px-3 py-1 font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-surface">
        {title}
      </h2>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

function SavingThrows({ saves }: { saves: CharacterSheetData["stats"]["savingThrows"] }) {
  const rows = ABILITIES.map((key) => [key, saves[key]] as const).filter(
    (entry): entry is [AbilityKey, NonNullable<(typeof entry)[1]>] => !!entry[1],
  );
  if (rows.length === 0) return null;

  return (
    <Panel title="Saving throws">
      <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([key, save]) => {
          const level = save.proficient ? "proficient" : "none";
          return (
            <Line
              key={key}
              level={level}
              name={ABILITY_LABEL[key]}
              value={signed(save.modifier)}
            />
          );
        })}
      </ul>
    </Panel>
  );
}

/**
 * Skills grouped by governing ability, mirroring the column on the left — so
 * the eye pairs "DEX +2" with the DEX skills instead of hunting an
 * alphabetical list of eighteen. Nothing collapses: a character sheet you
 * have to expand to read is a worse character sheet.
 */
function Skills({ skills }: { skills: CharacterSheetData["stats"]["skills"] }) {
  const byAbility = new Map<
    AbilityKey,
    Array<[string, CharacterSheetData["stats"]["skills"][string]]>
  >();
  for (const entry of Object.entries(skills)) {
    const list = byAbility.get(entry[1].ability) ?? [];
    list.push(entry);
    byAbility.set(entry[1].ability, list);
  }

  const groups = ABILITIES.filter((a) => (byAbility.get(a)?.length ?? 0) > 0);
  if (groups.length === 0) return null;

  return (
    <Panel title="Skills">
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((ability) => (
          <div key={ability}>
            <p className="border-b border-hairline pb-0.5 font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              {ABILITY_LABEL[ability]}
            </p>
            <ul className="flex flex-col pt-0.5">
              {byAbility
                .get(ability)!
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([name, skill]) => (
                  <Line
                    key={name}
                    level={
                      skill.expertise ? "expertise" : skill.proficient ? "proficient" : "none"
                    }
                    name={name}
                    value={signed(skill.modifier)}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** A ticked box, a name, and a number — the row this whole sheet is made of. */
function Line({
  level,
  name,
  value,
}: {
  level: "none" | "proficient" | "expertise";
  name: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-2 py-[3px]">
      <ProficiencyDot level={level} title={proficiencyLabel(level)} />
      <span
        className={`flex-1 truncate font-body text-[13px] ${
          level === "none" ? "text-ink-soft" : "text-ink"
        }`}
      >
        {name}
      </span>
      <span className="font-display text-[13px] tabular-nums text-ink">{value}</span>
    </li>
  );
}

const COINS: Array<{ key: keyof CharacterSheetData["stats"]["currency"]; label: string }> = [
  { key: "pp", label: "pp" },
  { key: "gp", label: "gp" },
  { key: "ep", label: "ep" },
  { key: "sp", label: "sp" },
  { key: "cp", label: "cp" },
];

/** Coin and carried weight. Coins the character doesn't hold are omitted —
 *  "0 ep" tells you nothing. */
function Purse({
  currency,
  encumbrance,
}: {
  currency: CharacterSheetData["stats"]["currency"];
  encumbrance: CharacterSheetData["stats"]["encumbrance"];
}) {
  const held = COINS.filter((c) => currency[c.key] > 0);
  if (held.length === 0 && encumbrance.max <= 0) return null;

  return (
    <Panel title="Purse &amp; burden">
      <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-body text-[13px] text-ink-soft">
        {held.map((c) => (
          <span key={c.key}>
            <span className="font-display text-[15px] tabular-nums text-ink">
              {currency[c.key]}
            </span>{" "}
            {c.label}
          </span>
        ))}
        {encumbrance.max > 0 && (
          <span>
            Carrying{" "}
            <span className="font-display text-[15px] tabular-nums text-ink">
              {encumbrance.value}
            </span>{" "}
            of {encumbrance.max} lb
          </span>
        )}
      </p>
    </Panel>
  );
}
