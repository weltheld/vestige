import type { AbilityKey, CharacterSheetData } from "@vestige/db";
import { ABILITIES, ABILITY_LABEL } from "@/lib/characters/foundry";
import { ProficiencyDot, proficiencyLabel, signed } from "./ProficiencyDot";

/** Everything about the character except what has its own tab. */
export function OverviewTab({ sheet }: { sheet: CharacterSheetData }) {
  const { stats } = sheet;

  return (
    <div className="flex flex-col gap-6">
      <VitalsStrip sheet={sheet} />
      <AbilityGrid abilities={stats.abilities} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <SavingThrows saves={stats.savingThrows} />
        <Skills skills={stats.skills} />
      </div>

      <PurseAndLoad currency={stats.currency} encumbrance={stats.encumbrance} />
    </div>
  );
}

/** HP, AC, speed, proficiency — and spell attack/DC only when the character
 *  actually casts. A non-caster gets no empty spellcasting box. */
function VitalsStrip({ sheet }: { sheet: CharacterSheetData }) {
  const { hp, ac, speed, proficiencyBonus, spellcasting } = sheet.stats;

  return (
    <div className="flex flex-wrap gap-2.5">
      <Vital
        label="Hit points"
        value={`${hp.value} / ${hp.max}`}
        note={hp.temp > 0 ? `+${hp.temp} temp` : undefined}
      />
      <Vital label="Armour class" value={String(ac)} />
      <Vital label="Speed" value={`${speed} ft`} />
      <Vital label="Proficiency" value={signed(proficiencyBonus)} />
      {spellcasting && (
        <>
          <Vital label="Spell attack" value={signed(spellcasting.attackModifier)} />
          <Vital
            label="Spell save DC"
            value={String(spellcasting.saveDc)}
            note={ABILITY_LABEL[spellcasting.ability]}
          />
        </>
      )}
    </div>
  );
}

function Vital({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-[104px] flex-1 rounded-xl bg-cod-soft px-4 py-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-[22px] leading-none text-ink">{value}</p>
      {note && <p className="mt-1 font-body text-[11px] text-muted">{note}</p>}
    </div>
  );
}

function AbilityGrid({
  abilities,
}: {
  abilities: Record<AbilityKey, { value: number; modifier: number }>;
}) {
  return (
    <section>
      <SectionHeading>Ability scores</SectionHeading>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {ABILITIES.map((key) => (
          <div key={key} className="rounded-xl bg-cod-soft px-3 py-3 text-center">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              {key}
            </p>
            {/* The modifier is what gets used at the table, so it's the big
                number; the raw score is the footnote, not the headline. */}
            <p className="mt-1 font-display text-[24px] leading-none text-ink">
              {signed(abilities[key].modifier)}
            </p>
            <p className="mt-1 font-body text-[11px] text-muted">{abilities[key].value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SavingThrows({
  saves,
}: {
  saves: CharacterSheetData["stats"]["savingThrows"];
}) {
  return (
    <section>
      <SectionHeading>Saving throws</SectionHeading>
      <ul className="flex flex-col rounded-xl bg-cod-soft px-4 py-2">
        {ABILITIES.map((key) => {
          const save = saves[key];
          if (!save) return null;
          const level = save.proficient ? "proficient" : "none";
          return (
            <li
              key={key}
              className="flex items-center gap-2.5 border-b border-hairline py-2 last:border-b-0"
            >
              <ProficiencyDot level={level} title={proficiencyLabel(level)} />
              <span className="flex-1 font-body text-[13px] text-ink">
                {ABILITY_LABEL[key]}
              </span>
              <span className="font-display text-[14px] tabular-nums text-ink">
                {signed(save.modifier)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Skills grouped by governing ability, mirroring the ability grid above — so
 * the eye pairs "DEX 16" with the DEX skills instead of hunting an alphabetical
 * list of eighteen. Nothing collapses: a character sheet you have to expand to
 * read is a worse character sheet.
 */
function Skills({ skills }: { skills: CharacterSheetData["stats"]["skills"] }) {
  const byAbility = new Map<AbilityKey, Array<[string, CharacterSheetData["stats"]["skills"][string]]>>();
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
      <div className="grid gap-2.5 sm:grid-cols-2">
        {groups.map((ability) => (
          <div key={ability} className="rounded-xl bg-cod-soft px-4 py-3">
            <p className="pb-1 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
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
                    <li key={name} className="flex items-center gap-2.5 py-[5px]">
                      <ProficiencyDot level={level} title={proficiencyLabel(level)} />
                      <span className="flex-1 font-body text-[13px] text-ink">{name}</span>
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

function PurseAndLoad({
  currency,
  encumbrance,
}: {
  currency: CharacterSheetData["stats"]["currency"];
  encumbrance: CharacterSheetData["stats"]["encumbrance"];
}) {
  // Coins the character doesn't carry are noise — "0 ep" tells you nothing.
  const held = COINS.filter((c) => currency[c.key] > 0);

  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-cod-soft px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Purse
        </span>
        {held.length === 0 ? (
          <span className="font-body text-[13px] italic text-muted">Empty</span>
        ) : (
          <span className="flex flex-wrap gap-2.5">
            {held.map((c) => (
              <span key={c.key} className="font-body text-[13px] text-ink">
                <span className="tabular-nums">{currency[c.key]}</span>{" "}
                <span className="text-muted">{c.label}</span>
              </span>
            ))}
          </span>
        )}
      </div>

      {encumbrance.max > 0 && (
        <div className="flex items-center gap-3">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            Carried
          </span>
          <span className="font-body text-[13px] text-ink">
            <span className="tabular-nums">{encumbrance.value}</span>
            <span className="text-muted"> / {encumbrance.max} lb</span>
          </span>
        </div>
      )}
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 pb-2.5">
      <span className="h-3.5 w-0.5 bg-gold" />
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {children}
      </h2>
    </div>
  );
}
