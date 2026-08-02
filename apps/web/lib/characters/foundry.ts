/**
 * Foundry VTT (dnd5e) actor export → the sheet shape Vestige renders.
 *
 * The governing rule, from the spec: Vestige displays exactly what Foundry
 * computed. Nothing here recalculates a modifier, a proficiency bonus, a spell
 * save DC or an encumbrance total — if Foundry didn't export it, we don't show
 * it. A rules engine that disagrees with the VTT the table actually plays on
 * would be worse than no number at all.
 *
 * Defensive throughout: exports vary by dnd5e version and by which modules a
 * world has installed, so every read goes through a coercion helper and a
 * missing field degrades to a sane default rather than throwing.
 *
 * Kept free of JSX and of server-only imports so it can be unit-tested with
 * plain node.
 */

import type {
  AbilityKey,
  CharacterSheetData,
  SheetFeature,
  SheetItem,
  SheetItemType,
  SheetSpell,
} from "@vestige/db";

export const ABILITIES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** Foundry's skill abbreviations → readable labels and their ability. The UI
 *  never sees a raw Foundry key. */
const SKILLS: Record<string, { label: string; ability: AbilityKey }> = {
  acr: { label: "Acrobatics", ability: "dex" },
  ani: { label: "Animal Handling", ability: "wis" },
  arc: { label: "Arcana", ability: "int" },
  ath: { label: "Athletics", ability: "str" },
  dec: { label: "Deception", ability: "cha" },
  his: { label: "History", ability: "int" },
  ins: { label: "Insight", ability: "wis" },
  itm: { label: "Intimidation", ability: "cha" },
  inv: { label: "Investigation", ability: "int" },
  med: { label: "Medicine", ability: "wis" },
  nat: { label: "Nature", ability: "int" },
  prc: { label: "Perception", ability: "wis" },
  prf: { label: "Performance", ability: "cha" },
  per: { label: "Persuasion", ability: "cha" },
  rel: { label: "Religion", ability: "int" },
  slt: { label: "Sleight of Hand", ability: "dex" },
  ste: { label: "Stealth", ability: "dex" },
  sur: { label: "Survival", ability: "wis" },
};

/** Foundry's `uses.per` codes. */
const RECHARGE_LABEL: Record<string, string> = {
  lr: "long rest",
  sr: "short rest",
  day: "day",
  charges: "charges",
  dawn: "dawn",
  dusk: "dusk",
  round: "round",
  turn: "turn",
  atwill: "at will",
};

/** Foundry's spell preparation modes, kept as labels rather than collapsed to
 *  a boolean — "always prepared" and "pact magic" are not the same thing. */
const PREPARATION_LABEL: Record<string, string> = {
  prepared: "Prepared",
  always: "Always Prepared",
  atwill: "At Will",
  innate: "Innate",
  pact: "Pact Magic",
  ritual: "Ritual Only",
};

const SPELL_SCHOOL: Record<string, string> = {
  abj: "Abjuration",
  con: "Conjuration",
  div: "Divination",
  enc: "Enchantment",
  evo: "Evocation",
  ill: "Illusion",
  nec: "Necromancy",
  trs: "Transmutation",
};

const ITEM_TYPES = new Set<SheetItemType>([
  "weapon",
  "equipment",
  "consumable",
  "tool",
  "loot",
  "container",
]);

export type ParseFailure = { ok: false; error: string };
export type ParseSuccess = {
  ok: true;
  actorId: string;
  sheet: CharacterSheetData;
};
export type ParseResult = ParseSuccess | ParseFailure;

// --- coercion helpers -------------------------------------------------------

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function at(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const key of path.split(".")) {
    cur = obj(cur)[key];
    if (cur === undefined || cur === null) return undefined;
  }
  return cur;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown): boolean {
  return value === true || value === 1;
}

/** Description HTML → sanitized-by-construction text. Stored as the plain
 *  rendering; the node tree is rebuilt for display from the same parser. */
function description(value: unknown): string {
  return describeToText(parseDescription(str(value)));
}

// --- validation -------------------------------------------------------------

/**
 * Reject anything that isn't a 5e player character before parsing, with an
 * error that says what to do instead. The two checks are separate because the
 * fixes are different: export the right actor, versus use a 5e world.
 */
function validate(actor: Record<string, unknown>): ParseFailure | null {
  const type = str(actor.type).toLowerCase();
  if (!type) {
    return {
      ok: false,
      error:
        "This file doesn't look like a Foundry actor export. In Foundry, right-click the character in the Actors sidebar and choose Export Data.",
    };
  }
  if (type !== "character") {
    return {
      ok: false,
      error: `This is a "${type}" actor, not a player character. Please export a Player Character using Export Data in Foundry.`,
    };
  }

  // The system id lives in different places depending on how the export was
  // produced, so check the ones that occur rather than insisting on one.
  const systemId =
    str(at(actor, "system.id")) ||
    str(at(actor, "_stats.systemId")) ||
    str(at(actor, "flags.exportSource.system"));
  // An export with no system id at all is old rather than wrong — dnd5e-shaped
  // data is checked for below instead of rejecting outright.
  if (systemId && systemId !== "dnd5e") {
    return {
      ok: false,
      error: `This character is from a "${systemId}" game. Vestige currently only supports D&D 5e imports.`,
    };
  }
  if (!systemId && at(actor, "system.abilities") === undefined) {
    return {
      ok: false,
      error:
        "This character isn't from a D&D 5e game, or the export is missing its ability scores. Vestige currently only supports D&D 5e imports.",
    };
  }
  return null;
}

// --- the parse ---------------------------------------------------------------

export function parseFoundryActor(raw: unknown): ParseResult {
  const actor = obj(raw);
  const invalid = validate(actor);
  if (invalid) return invalid;

  const system = obj(actor.system);
  const items = Array.isArray(actor.items) ? actor.items.map(obj) : [];

  const abilities = parseAbilities(system);
  const classes = parseClasses(items);
  // Also derived at runtime in newer dnd5e versions. It's a fixed function of
  // total character level (2 at 1-4, 3 at 5-8, …) — the same everywhere in 5e.
  const totalLevel = classes.reduce((n, c) => n + c.level, 0);
  const proficiencyBonus =
    at(system, "attributes.prof") !== undefined
      ? num(at(system, "attributes.prof"))
      : totalLevel > 0
        ? Math.floor((totalLevel - 1) / 4) + 2
        : 0;

  const sheet: CharacterSheetData = {
    identity: {
      name: str(actor.name, "Unnamed character"),
      race: parseRace(system, items),
      classes,
      background: parseBackground(system, items),
      alignment: str(at(system, "details.alignment")),
      portraitUrl: parsePortrait(actor),
      portraitPath: imagePath(actor),
    },
    stats: {
      abilities,
      ac: parseArmourClass(system, items, abilities),
      hp: {
        value: num(at(system, "attributes.hp.value")),
        max: num(at(system, "attributes.hp.max")),
        temp: num(at(system, "attributes.hp.temp")),
      },
      speed: parseSpeed(system),
      proficiencyBonus,
      savingThrows: parseSaves(system, abilities, proficiencyBonus),
      skills: parseSkills(system, abilities, proficiencyBonus),
      currency: {
        pp: num(at(system, "currency.pp")),
        gp: num(at(system, "currency.gp")),
        ep: num(at(system, "currency.ep")),
        sp: num(at(system, "currency.sp")),
        cp: num(at(system, "currency.cp")),
      },
      encumbrance: parseEncumbrance(system, items),
      spellcasting: parseSpellcasting(system),
    },
    items: parseItems(items),
    features: parseFeatures(items, classes),
    spells: parseSpells(items),
  };

  return {
    ok: true,
    actorId: upsertKey(actor, sheet.identity.name),
    sheet,
  };
}

/**
 * The key a re-import replaces on.
 *
 * Foundry's "Export Data" STRIPS the actor `_id` — deliberately, so that
 * importing the file elsewhere creates a new actor rather than colliding with
 * an existing one. Requiring an id therefore rejected the very files the
 * feature is meant to accept.
 *
 * Where an id survives (a world backup, a compendium source) it's used, since
 * it's stable across renames. Otherwise the name is the key, which is how a
 * player thinks about it anyway: re-importing Zibal replaces Zibal. The cost
 * is that renaming a character and re-importing adds a second sheet instead of
 * updating the first — visible, and fixable by deleting the old one.
 */
function upsertKey(actor: Record<string, unknown>, name: string): string {
  const id =
    str(actor._id) ||
    str(actor.id) ||
    str(at(actor, "_stats.compendiumSource")) ||
    str(at(actor, "flags.core.sourceId"));
  if (id) return id;
  return `name:${name.trim().toLowerCase()}`;
}

/**
 * The one place arithmetic is unavoidable.
 *
 * dnd5e derives `mod` in prepareData at runtime and does NOT write it to the
 * export, so a sheet says `value: 16` and nothing else. Reading the absent
 * field as 0 made every modifier show +0 — worse than useless, since it looks
 * like a real answer.
 *
 * floor((score - 10) / 2) is the definition of an ability modifier, not a
 * rules interpretation: there is no variant, no feat and no module that
 * changes it. Anything Foundry DID export still wins.
 */
function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function parseAbilities(system: Record<string, unknown>) {
  const src = obj(at(system, "abilities"));
  const out = {} as CharacterSheetData["stats"]["abilities"];
  for (const key of ABILITIES) {
    const a = obj(src[key]);
    const value = num(a.value, 10);
    out[key] = {
      value,
      modifier: a.mod !== undefined ? num(a.mod) : abilityModifier(value),
    };
  }
  return out;
}

function parseSaves(
  system: Record<string, unknown>,
  abilities: CharacterSheetData["stats"]["abilities"],
  proficiencyBonus: number,
) {
  const src = obj(at(system, "abilities"));
  const out: CharacterSheetData["stats"]["savingThrows"] = {};
  for (const key of ABILITIES) {
    const a = obj(src[key]);
    const save = obj(a.save);
    const proficient = num(a.proficient) > 0;
    // Same story as `mod`: the save total is derived at runtime and usually
    // absent. Ability modifier plus the proficiency bonus when proficient is
    // the definition of a saving throw, so it's derived rather than shown as
    // a wrong number.
    const derived = abilities[key].modifier + (proficient ? proficiencyBonus : 0);
    const exported = a.save !== undefined ? num(a.save) : num(save.value, NaN);
    out[key] = {
      modifier: Number.isFinite(exported) ? exported : derived,
      proficient,
    };
  }
  return out;
}

function parseSkills(
  system: Record<string, unknown>,
  abilities: CharacterSheetData["stats"]["abilities"],
  proficiencyBonus: number,
) {
  const src = obj(at(system, "skills"));
  const out: CharacterSheetData["stats"]["skills"] = {};
  for (const [key, meta] of Object.entries(SKILLS)) {
    const s = obj(src[key]);
    if (Object.keys(s).length === 0) continue;
    const prof = num(s.value);
    const ability = (str(s.ability) as AbilityKey) || meta.ability;
    // 2 = expertise, 1 = proficient, 0.5 = half (Jack of All Trades).
    const bonus =
      prof >= 2
        ? proficiencyBonus * 2
        : prof >= 1
          ? proficiencyBonus
          : prof >= 0.5
            ? Math.floor(proficiencyBonus / 2)
            : 0;
    const derived = (abilities[ability]?.modifier ?? 0) + bonus;
    const exported = s.total !== undefined ? num(s.total) : num(s.mod, NaN);
    out[meta.label] = {
      modifier: Number.isFinite(exported) ? exported : derived,
      // 1 = proficient, 2 = expertise, 0.5 = half (jack of all trades).
      proficient: prof >= 1,
      expertise: prof >= 2,
      ability,
    };
  }
  return out;
}

/**
 * Armour class — derived when Foundry didn't export it.
 *
 * Same shape of problem as the ability modifiers: dnd5e computes AC in
 * prepareData from equipped armour and Dex, so a plain export usually carries
 * only `{ calc: "default", flat: null }` and no `value`. Reading that as 0 put
 * a confident, wrong number on the sheet.
 *
 * This is a genuine rules calculation rather than pure arithmetic, so it's
 * kept to the cases that are unambiguous, and returns 0 (rendered as "—")
 * rather than a guess when it can't tell:
 *
 *   flat / natural   the number Foundry stored, used as-is
 *   default          equipped armour base + Dex (capped by the armour) + shield
 *   unarmoured       10 + Dex + shield — the 5e default; a monk's or
 *                    barbarian's class bonus is NOT added, because it depends
 *                    on Wis/Con in ways an export doesn't state
 *
 * Anything Foundry did export always wins.
 */
function parseArmourClass(
  system: Record<string, unknown>,
  items: Record<string, unknown>[],
  abilities: CharacterSheetData["stats"]["abilities"],
): number {
  const ac = obj(at(system, "attributes.ac"));
  const exported = num(ac.value, NaN);
  if (Number.isFinite(exported) && exported > 0) return exported;

  const calc = str(ac.calc, "default");
  const flat = num(ac.flat, NaN);
  if ((calc === "flat" || calc === "natural") && Number.isFinite(flat)) return flat;

  const dex = abilities.dex?.modifier ?? 0;
  let base = 10 + dex;
  let shield = 0;

  for (const item of items) {
    const s = obj(item.system);
    if (!bool(s.equipped)) continue;
    const armour = obj(s.armor);
    const value = num(armour.value, NaN);
    if (!Number.isFinite(value)) continue;

    // dnd5e 3.x keeps the sub-type on system.type.value; 2.x used armor.type.
    const subtype = str(obj(s.type).value) || str(armour.type);
    if (subtype === "shield") {
      shield += value;
      continue;
    }
    // `armor.dex` is the Dex cap: 2 for medium, 0 for heavy, null for light.
    const cap = armour.dex === null || armour.dex === undefined ? null : num(armour.dex);
    base = value + (cap === null ? dex : Math.min(dex, cap));
  }

  const total = base + shield;
  // A custom formula we can't evaluate: say nothing rather than something
  // wrong. The UI renders 0 as an em dash.
  if (calc === "custom" && !Number.isFinite(exported)) return 0;
  return total;
}

function parseSpeed(system: Record<string, unknown>): number {
  const walk = at(system, "attributes.movement.walk");
  if (walk !== undefined) return num(walk);
  // Very old exports kept speed as a string like "30 ft."
  const legacy = str(at(system, "attributes.speed.value"));
  const match = legacy.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/**
 * Encumbrance. Foundry pre-totals this in recent dnd5e versions; when it
 * doesn't, the carried weight is summed from the items — which is arithmetic
 * over exported values, not a rules calculation.
 */
function parseEncumbrance(
  system: Record<string, unknown>,
  items: Record<string, unknown>[],
) {
  const enc = obj(at(system, "attributes.encumbrance"));
  const max = num(enc.max);
  if (enc.value !== undefined) return { value: num(enc.value), max };

  const value = items.reduce((total, item) => {
    const s = obj(item.system);
    const weight = typeof s.weight === "object" ? num(obj(s.weight).value) : num(s.weight);
    return total + weight * num(s.quantity, 1);
  }, 0);
  return { value: Math.round(value * 100) / 100, max };
}

/** Spell attack + save DC, only when the character actually casts. */
function parseSpellcasting(system: Record<string, unknown>) {
  const ability = str(at(system, "attributes.spellcasting")) as AbilityKey;
  if (!ability || !ABILITIES.includes(ability)) return undefined;
  const dc = num(at(system, "attributes.spelldc"));
  const attack = at(system, "attributes.spellmod");
  const mod = num(obj(at(system, "abilities"))[ability] ? at(system, `abilities.${ability}.mod`) : 0);
  const prof = num(at(system, "attributes.prof"));
  return {
    ability,
    saveDc: dc || 8 + prof + mod,
    // Foundry exports this on newer versions; older ones don't, and prof + mod
    // is the definition rather than a rules judgement.
    attackModifier: attack !== undefined ? num(attack) : prof + mod,
  };
}

function parseRace(
  system: Record<string, unknown>,
  items: Record<string, unknown>[],
): string {
  // dnd5e 3.x moved race from a details string to a `race` item.
  const raceItem = items.find((i) => str(i.type) === "race");
  if (raceItem) return str(raceItem.name);
  const details = at(system, "details.race");
  return typeof details === "string" ? details : str(obj(details).name);
}

function parseBackground(
  system: Record<string, unknown>,
  items: Record<string, unknown>[],
): string {
  const bgItem = items.find((i) => str(i.type) === "background");
  if (bgItem) return str(bgItem.name);
  const details = at(system, "details.background");
  return typeof details === "string" ? details : str(obj(details).name);
}

/** Classes, with subclass. Multiclass characters keep every class — the header
 *  renders "Fighter 5 / Wizard 2". */
function parseClasses(items: Record<string, unknown>[]) {
  const subclasses = items.filter((i) => str(i.type) === "subclass");
  return items
    .filter((i) => str(i.type) === "class")
    .map((i) => {
      const s = obj(i.system);
      const identifier = str(s.identifier).toLowerCase() || str(i.name).toLowerCase();
      const sub = subclasses.find(
        (x) => str(obj(x.system).classIdentifier).toLowerCase() === identifier,
      );
      return {
        name: str(i.name, "Class"),
        level: num(s.levels, num(s.level)),
        subclass: sub ? str(sub.name) : str(obj(s.subclass).name) || undefined,
      };
    })
    .sort((a, b) => b.level - a.level);
}

/**
 * Foundry's image reference, as written in the export.
 *
 * Kept even though it isn't a URL: it names a file inside the player's own
 * Foundry install, and the artwork step matches it against the folder they
 * point us at. Without it the pictures would be unrecoverable, since the JSON
 * carries paths and never bytes.
 */
function imagePath(doc: Record<string, unknown>): string | undefined {
  const src = str(doc.img) || str(at(doc, "prototypeToken.texture.src"));
  if (!src) return undefined;
  // An http(s) src is already handled as a URL; a data: URI is inline art we
  // can't do anything useful with.
  if (/^(https?:|data:)/i.test(src)) return undefined;
  return src;
}

function parsePortrait(actor: Record<string, unknown>): string | undefined {
  const src = str(actor.img) || str(at(actor, "prototypeToken.texture.src"));
  // Foundry paths are relative to the Foundry server ("worlds/x/portrait.webp")
  // and mean nothing here; only an absolute http(s) URL can actually render.
  return /^https?:\/\//i.test(src) ? src : undefined;
}

function parseItems(items: Record<string, unknown>[]): SheetItem[] {
  return items
    .filter((i) => ITEM_TYPES.has(str(i.type) as SheetItemType))
    .map((i) => {
      const s = obj(i.system);
      const damageParts = at(s, "damage.parts");
      const firstPart = Array.isArray(damageParts) && Array.isArray(damageParts[0])
        ? (damageParts[0] as unknown[])
        : null;
      const weight = typeof s.weight === "object" ? num(obj(s.weight).value) : num(s.weight);
      const properties = Array.isArray(s.properties)
        ? s.properties.filter((p): p is string => typeof p === "string")
        : [];

      return {
        id: str(i._id) || str(i.id) || str(i.name),
        name: str(i.name, "Unnamed item"),
        imgPath: imagePath(i),
        type: str(i.type) as SheetItemType,
        quantity: num(s.quantity, 1),
        weight,
        rarity: str(s.rarity) || undefined,
        equipped: bool(s.equipped),
        description: description(at(s, "description.value")),
        damage: firstPart
          ? { formula: str(firstPart[0]), type: str(firstPart[1]) }
          : undefined,
        properties: properties.length > 0 ? properties : undefined,
      };
    });
}

function parseFeatures(
  items: Record<string, unknown>[],
  classes: { name: string }[],
): SheetFeature[] {
  return items
    .filter((i) => str(i.type) === "feat")
    .map((i) => {
      const s = obj(i.system);
      const uses = obj(s.uses);
      const max = num(uses.max);
      const per = str(uses.per).toLowerCase();
      return {
        id: str(i._id) || str(i.id) || str(i.name),
        name: str(i.name, "Unnamed feature"),
        imgPath: imagePath(i),
        source: featureSource(s, classes),
        description: description(at(s, "description.value")),
        uses:
          max > 0
            ? {
                value: num(uses.value, max),
                max,
                recharge: RECHARGE_LABEL[per] ?? per,
              }
            : undefined,
        actionType: str(s.actionType) || undefined,
      };
    });
}

/** Where a feature came from. Foundry records this inconsistently, so this
 *  works down from the most specific signal to a plain "Other". */
function featureSource(
  system: Record<string, unknown>,
  classes: { name: string }[],
): string {
  const type = obj(system.type);
  const subtype = str(type.subtype);
  const value = str(type.value);

  if (value === "race") return "Race";
  if (value === "background") return "Background";
  if (value === "feat" || subtype === "feat") return "Feat";

  const requirements = str(system.requirements);
  const matched = classes.find((c) =>
    requirements.toLowerCase().includes(c.name.toLowerCase()),
  );
  if (matched) return matched.name;
  if (value === "class") return requirements || "Class";
  return requirements || "Other";
}

function parseSpells(items: Record<string, unknown>[]): SheetSpell[] {
  return items
    .filter((i) => str(i.type) === "spell")
    .map((i) => {
      const s = obj(i.system);
      const prep = obj(s.preparation);
      const mode = str(prep.mode, "prepared").toLowerCase();
      const activation = obj(s.activation);
      const duration = obj(s.duration);
      const range = obj(s.range);

      return {
        id: str(i._id) || str(i.id) || str(i.name),
        name: str(i.name, "Unnamed spell"),
        imgPath: imagePath(i),
        level: num(s.level),
        school: SPELL_SCHOOL[str(s.school)] ?? str(s.school),
        castingTime: activationLabel(activation),
        range: rangeLabel(range),
        components: componentLabel(s),
        duration: durationLabel(duration),
        description: description(at(s, "description.value")),
        // Modes other than "prepared" are always available — treating them as
        // unprepared would hide a warlock's entire spell list behind a marker
        // that doesn't apply to them.
        prepared: mode === "prepared" ? bool(prep.prepared) : true,
        preparationMode: PREPARATION_LABEL[mode] ?? "Prepared",
      };
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function activationLabel(activation: Record<string, unknown>): string {
  const type = str(activation.type);
  if (!type) return "—";
  const cost = num(activation.cost);
  const label = type === "bonus" ? "bonus action" : type;
  return cost > 1 ? `${cost} ${label}s` : `1 ${label}`;
}

function rangeLabel(range: Record<string, unknown>): string {
  const units = str(range.units);
  const value = num(range.value);
  if (units === "self") return "Self";
  if (units === "touch") return "Touch";
  if (!value && !units) return "—";
  return `${value} ${units || "ft"}`;
}

function durationLabel(duration: Record<string, unknown>): string {
  const units = str(duration.units);
  const value = num(duration.value);
  if (units === "inst") return "Instantaneous";
  if (units === "perm") return "Permanent";
  if (!units) return "—";
  return value ? `${value} ${units}` : units;
}

/** "V, S, M" — plus the ritual/concentration flags, which readers look for in
 *  the same glance. */
function componentLabel(system: Record<string, unknown>): string {
  const c = obj(system.components);
  const parts: string[] = [];
  if (bool(c.vocal)) parts.push("V");
  if (bool(c.somatic)) parts.push("S");
  if (bool(c.material)) parts.push("M");
  const extra: string[] = [];
  if (bool(c.ritual)) extra.push("ritual");
  if (bool(c.concentration)) extra.push("concentration");
  const base = parts.join(", ") || "—";
  return extra.length > 0 ? `${base} (${extra.join(", ")})` : base;
}

// ---------------------------------------------------------------------------
// Descriptions: Foundry rich text -> a small, safe node tree
//
// Foundry stores descriptions as HTML written by module and compendium
// authors, and we show it to every member of the campaign. Rather than trust a
// hand-rolled sanitizer -- a well-known source of XSS -- an allowlisted subset
// is parsed into typed nodes and flattened to text. Nothing in this feature
// ever reaches dangerouslySetInnerHTML, so the escaping is React's.
//
// Lives here rather than in its own module so the parser has no runtime
// relative imports and can be unit-tested with plain node.
// ---------------------------------------------------------------------------

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] };

export type BlockNode =
  | { type: "p"; children: InlineNode[] }
  | { type: "ul"; items: InlineNode[][] };

/** Tags we keep. Everything else is unwrapped (text kept) or dropped. */
const INLINE_TAGS = new Set(["strong", "b", "em", "i"]);

/** Tags whose entire contents are discarded, not unwrapped — their text is
 *  code or styling, never prose. */
const DROP_CONTENT = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  szlig: "ß",
  aring: "å",
  Aring: "Å",
  oslash: "ø",
  Oslash: "Ø",
  aelig: "æ",
  AElig: "Æ",
  ccedil: "ç",
  Ccedil: "Ç",
  ntilde: "ñ",
  Ntilde: "Ñ",
  deg: "°",
  times: "×",
  frac12: "½",
};

// The accented Latin entities, built rather than listed — Foundry content is
// full of them the moment a table plays in German, French or Spanish, and
// "Bl&ouml;d" rendering as a literal "&ouml;" was the first thing that broke.
for (const [suffix, plain, accented] of [
  ["uml", "aeiouAEIOUy", "äëïöüÄËÏÖÜÿ"],
  ["acute", "aeiouyAEIOUY", "áéíóúýÁÉÍÓÚÝ"],
  ["grave", "aeiouAEIOU", "àèìòùÀÈÌÒÙ"],
  ["circ", "aeiouAEIOU", "âêîôûÂÊÎÔÛ"],
  ["tilde", "aoAO", "ãõÃÕ"],
] as const) {
  for (let i = 0; i < plain.length; i++) {
    ENTITIES[`${plain[i]}${suffix}`] = accented[i];
  }
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      // Reject anything that isn't a sane scalar value rather than emitting
      // a replacement character for it.
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    // Case matters: &Ouml; and &ouml; are different characters. Exact match
    // first, lowercase only as a lenient fallback for sloppy hand-written HTML.
    return ENTITIES[body] ?? ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * Foundry "enrichers" — `@UUID[Compendium.dnd5e...]{Fireball}` links and
 * `[[/r 2d6]]` inline rolls — appear throughout official 5e content. Rendered
 * verbatim they're noise, so each collapses to the text a reader wants: the
 * label, or the formula.
 */
function unwrapEnrichers(html: string): string {
  return html
    // @Something[ref]{Label} → Label
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, "$1")
    // @Something[ref] with no label → the last path segment, which is the name
    .replace(/@\w+\[([^\]]*)\]/g, (_m, ref: string) => {
      const parts = String(ref).split(".");
      return parts[parts.length - 1] ?? "";
    })
    // [[/r 1d8 + 3]] or [[/damage 2d6]] → the formula
    .replace(/\[\[\/\w+\s*([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1");
}

/** Split a run of HTML into inline nodes, keeping only bold and italic. */
function parseInline(html: string, depth = 0): InlineNode[] {
  const out: InlineNode[] = [];
  if (depth > 6) {
    const text = decodeEntities(stripTags(html)).trim();
    return text ? [{ type: "text", value: text }] : [];
  }

  // Matches an allowlisted inline element and its contents, non-greedily.
  const re = /<(strong|b|em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let last = 0;
  for (const m of html.matchAll(re)) {
    const at = m.index!;
    if (at > last) pushText(out, html.slice(last, at));
    const tag = m[1].toLowerCase();
    const children = parseInline(m[2], depth + 1);
    if (children.length > 0) {
      out.push({ type: tag === "b" || tag === "strong" ? "strong" : "em", children });
    }
    last = at + m[0].length;
  }
  if (last < html.length) pushText(out, html.slice(last));
  return out;
}

function pushText(out: InlineNode[], html: string) {
  // Any remaining markup (spans, anchors, images, unknown tags) is unwrapped:
  // its text survives, the tag and every attribute does not.
  const value = decodeEntities(stripTags(html)).replace(/\s+/g, " ");
  if (!value.trim()) return;
  const prev = out[out.length - 1];
  if (prev?.type === "text") prev.value += value;
  else out.push({ type: "text", value });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Parse a Foundry description into blocks.
 *
 * Paragraphs come from <p>, and from text separated by <br>. Lists come from
 * <ul>/<ol> — both render as one bulleted list, since a numbered list of
 * weapon properties isn't worth a second code path.
 */
export function parseDescription(raw: string | null | undefined): BlockNode[] {
  if (!raw) return [];
  let html = String(raw);
  html = html.replace(DROP_CONTENT, "");
  html = unwrapEnrichers(html);

  const blocks: BlockNode[] = [];

  // Pull lists out first, in order, treating everything between them as prose.
  const listRe = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let cursor = 0;
  for (const m of html.matchAll(listRe)) {
    const at = m.index!;
    if (at > cursor) pushProse(blocks, html.slice(cursor, at));
    const items: InlineNode[][] = [];
    for (const li of m[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)) {
      const nodes = parseInline(li[1]);
      if (nodes.length > 0) items.push(nodes);
    }
    if (items.length > 0) blocks.push({ type: "ul", items });
    cursor = at + m[0].length;
  }
  if (cursor < html.length) pushProse(blocks, html.slice(cursor));

  return blocks;
}

function pushProse(blocks: BlockNode[], html: string) {
  // <p>, <div>, <br> and headings all just end a paragraph here; the sheet has
  // no use for heading levels inside an item description.
  const chunks = html
    .split(/<\/?(?:p|div|br|h[1-6]|section|article)\b[^>]*\/?>/gi)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const nodes = parseInline(chunk);
    if (nodes.length > 0) blocks.push({ type: "p", children: nodes });
  }
}

/** Flat text of a parsed description — for previews and length checks. */
export function describeToText(blocks: BlockNode[]): string {
  const inline = (nodes: InlineNode[]): string =>
    nodes.map((n) => (n.type === "text" ? n.value : inline(n.children))).join("");
  return blocks
    .map((b) => (b.type === "p" ? inline(b.children) : b.items.map(inline).join(" · ")))
    .join("\n\n")
    .trim();
}
