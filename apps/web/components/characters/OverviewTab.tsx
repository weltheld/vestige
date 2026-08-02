import type { AbilityKey, CharacterSheetData } from "@vestige/db";
import { ABILITIES, ABILITY_LABEL } from "@/lib/characters/foundry";
import { ProficiencyDot, proficiencyLabel, signed } from "./ProficiencyDot";

/**
 * Everything about the character except what has its own tab.
 *
 * Compact by construction rather than by a density toggle:
 *
 *  - The saving throw lives ON its ability card. A save is a fact about an
 *    ability, not a parallel list of six — which is how paper sheets have
 *    always done it, and it removes a whole section.
 *  - Almost nothing is a card. Filled boxes around every group ate a third of
 *    the page and made a character sheet read as a dashboard; hairline rules
 *    and tighter leading say the same thing in less room.
 *  - Skills use the width the page already has instead of running down one
 *    column, so the Overview fits a screen without hiding anything behind a
 *    disclosure.
 */
export function OverviewTab({ sheet }: { sheet: CharacterSheetData }) {
  const { stats } = sheet;

  return (
    <div className="flex flex-col gap-5">
      <VitalsStrip sheet={sheet} />
      <Purse currency={stats.currency} encumbrance={stats.encumbrance} />
      <AbilityGrid abilities={stats.abilities} saves={stats.savingThrows} />
      <Skills skills={stats.skills} />
    </div>
  );
}

/** HP, AC, speed, proficiency — and spell attack/DC only when the character
 *  actually casts. A non-caster gets no empty spellcasting box. */
function VitalsStrip({ sheet }: { sheet: CharacterSheetData }) {
  const { hp, ac, speed, proficiencyBonus, spellcasting } = sheet.stats;

  return (
    <div className="flex flex-wrap items-stretch gap-x-6 gap-y-2 rounded-xl bg-cod-soft px-5 py-3">
      <Vital
        label="HP"
        value={`${hp.value}/${hp.max}`}
        note={hp.temp > 0 ? `+${hp.temp} temp` : undefined}
      />
      {/* 0 is the parser saying it couldn't work the AC out — a custom formula
          it won't guess at. An em dash says that; "0" lies. */}
      <Vital label="AC" value={ac > 0 ? String(ac) : "—"} />
      <Vital label="Speed" value={`${speed} ft`} />
      <Vital label="Prof" value={signed(proficiencyBonus)} />
      {spellcasting && (
        <>
          <Vital label="Spell atk" value={signed(spellcasting.attackModifier)} />
          <Vital
            label="Save DC"
            value={String(spellcasting.saveDc)}
            note={ABILITY_LABEL[spellcasting.ability]}
          />
        </>
      )}
    </div>
  );
}

/** One vital. No box of its own — the strip is the box. */
function Vital({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="font-display text-[19px] leading-none text-ink">{value}</span>
      {note && <span className="font-body text-[11px] text-muted">{note}</span>}
    </div>
  );
}

/**
 * The six abilities, each carrying its own saving throw.
 *
 * The modifier is the big number because it's what gets used at the table; the
 * raw score is a footnote. The save sits beneath with the same gold dot the
 * sheet uses everywhere for "this one is proficient".
 */
function AbilityGrid({
  abilities,
  saves,
}: {
  abilities: Record<AbilityKey, { value: number; modifier: number }>;
  saves: CharacterSheetData["stats"]["savingThrows"];
}) {
  return (
    <section>
      <SectionHeading>Abilities &amp; saves</SectionHeading>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITIES.map((key) => {
          const save = saves[key];
          const level = save?.proficient ? "proficient" : "none";
          return (
            <div
              key={key}
              className="rounded-lg border border-hairline px-2 py-2 text-center"
            >
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                {key}
              </p>
              <p className="mt-0.5 font-display text-[22px] leading-none text-ink">
                {signed(abilities[key].modifier)}
              </p>
              <p className="font-body text-[11px] text-muted">{abilities[key].value}</p>
              {save && (
                <p
                  title={`Saving throw — ${proficiencyLabel(level)}`}
                  className="mt-1.5 flex items-center justify-center gap-1 border-t border-hairline pt-1 font-body text-[11px] text-ink-soft"
                >
                  <ProficiencyDot level={level} />
                  <span className="tabular-nums">{signed(save.modifier)}</span>
                  <span className="text-muted">save</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Skills grouped by governing ability, mirroring the grid above — so the eye
 * pairs "DEX +3" with the DEX skills instead of hunting an alphabetical list of
 * eighteen. Nothing collapses: a character sheet you have to expand to read is
 * a worse character sheet.
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
    <section>
      <SectionHeading>Skills</SectionHeading>
      {/* Three columns on a wide screen: the page is 1100px and this used to
          run down the left half of it. */}
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((ability) => (
          <div key={ability}>
            <p className="border-b border-hairline pb-1 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              {ABILITY_LABEL[ability]}
            </p>
            <ul className="flex flex-col">
              {byAbility
                .get(ability)!
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([name, skill]) => {
                  const level = skill.expertise
                    ? "expertise"
                    : skill.proficient
                      ? "proficient"
                      : "none";
                  return (
                    <li key={name} className="flex items-center gap-2 py-[3px]">
                      <ProficiencyDot level={level} title={proficiencyLabel(level)} />
                      <span className="flex-1 truncate font-body text-[13px] text-ink">
                        {name}
                      </span>
                      <span className="font-display text-[13px] tabular-nums text-ink-soft">
                        {signed(skill.modifier)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const COINS: Array<{ key: keyof CharacterSheetData["stats"]["currency"]; label: string }> = [
  { key: "pp", label: "pp" },
  { key: "gp", label: "gp" },
  { key: "ep", label: "ep" },
  { key: "sp", label: "sp" },
  { key: "cp", label: "cp" },
];

/**
 * Coin and carried weight, as a quiet line under the vitals.
 *
 * No heading and no card: money is a fact you glance at, not a section you
 * visit. Coins the character doesn't hold are omitted — "0 ep" tells you
 * nothing.
 */
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
    <p className="-mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-body text-[12px] text-muted">
      {held.map((c) => (
        <span key={c.key}>
          <span className="tabular-nums text-ink">{currency[c.key]}</span> {c.label}
        </span>
      ))}
      {encumbrance.max > 0 && (
        <span>
          <span className="tabular-nums text-ink">{encumbrance.value}</span> / {encumbrance.max} lb
          carried
        </span>
      )}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 pb-2">
      <span className="h-3.5 w-0.5 bg-gold" />
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {children}
      </h2>
    </div>
  );
}
