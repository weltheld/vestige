// The Foundry parser must never throw on a real-world export, and must never
// invent a number Foundry didn't give it.
import assert from "node:assert/strict";
import { parseFoundryActor } from "./foundry.ts";
import { parseDescription, describeToText } from "./foundry.ts";

// --- description parsing / safety -------------------------------------------

const text = (html) => describeToText(parseDescription(html));

assert.equal(text("<p>A plain paragraph.</p>"), "A plain paragraph.");
assert.equal(text("<p>One.</p><p>Two.</p>"), "One.\n\nTwo.");
assert.equal(text("<p>Bold <strong>bit</strong> here.</p>"), "Bold bit here.");
assert.equal(text("<ul><li>First</li><li>Second</li></ul>"), "First · Second");

// Script and style contents are DROPPED, not unwrapped as text.
assert.equal(text("<p>Safe</p><script>alert(1)</script>"), "Safe");
assert.equal(text("<style>.x{color:red}</style><p>Safe</p>"), "Safe");
// Unknown tags are unwrapped — their text survives, the markup does not.
assert.equal(text('<p>See <a href="javascript:alert(1)">this</a>.</p>'), "See this.");
assert.equal(text('<img src=x onerror="alert(1)">Caption'), "Caption");
// Entities decode.
assert.equal(text("<p>Bl&ouml;d &amp; brave &mdash; yes</p>"), "Blöd & brave — yes");
assert.equal(text("<p>&#65;&#x42;</p>"), "AB");
// Named entities are case-sensitive — &Ouml; is not &ouml;.
assert.equal(text("<p>&Ouml;l und &Uuml;bung, gro&szlig;</p>"), "Öl und Übung, groß");
assert.equal(text("<p>caf&eacute; &agrave; la cr&egrave;me, ni&ntilde;o</p>"),
  "café à la crème, niño");
// An unknown entity is left alone rather than mangled.
assert.equal(text("<p>&notareal; thing</p>"), "&notareal; thing");

// Foundry enrichers collapse to their readable label.
assert.equal(text("<p>Cast @UUID[Compendium.dnd5e.spells.abc123]{Fireball} now</p>"),
  "Cast Fireball now");
assert.equal(text("<p>Deal [[/r 2d6]] damage</p>"), "Deal 2d6 damage");
assert.equal(text("<p>@UUID[Compendium.dnd5e.items.xyz.Longsword]</p>"), "Longsword");

// Empty in, empty out — never a crash.
assert.deepEqual(parseDescription(null), []);
assert.deepEqual(parseDescription(""), []);
assert.deepEqual(parseDescription("   "), []);

// The parse produces structure, not just text.
const blocks = parseDescription("<p>Intro</p><ul><li>a</li></ul><p>Outro</p>");
assert.deepEqual(blocks.map((b) => b.type), ["p", "ul", "p"]);

// --- validation --------------------------------------------------------------

const reject = (actor) => {
  const r = parseFoundryActor(actor);
  assert.equal(r.ok, false, `expected rejection for ${JSON.stringify(actor).slice(0, 60)}`);
  return r.error;
};

assert.match(reject({}), /Foundry actor export/);
assert.match(reject({ type: "npc", system: { id: "dnd5e" } }), /not a player character/);
assert.match(
  reject({ type: "character", system: { id: "pf2e", abilities: {} } }),
  /only supports D&D 5e/,
);
// No system id AND no abilities: not a 5e sheet.
assert.match(reject({ type: "character", system: {} }), /only supports D&D 5e/);
// No system id but 5e-shaped: accepted, because old exports omit the id.
assert.equal(parseFoundryActor({ type: "character", system: { abilities: {} } }).ok, true);

// --- a realistic multiclass caster -------------------------------------------

const ACTOR = {
  _id: "abc123",
  name: "Zibal Faringray",
  type: "character",
  img: "https://example.com/zibal.webp",
  system: {
    id: "dnd5e",
    abilities: {
      str: { value: 10, mod: 0, save: 0, proficient: 0 },
      dex: { value: 16, mod: 3, save: 5, proficient: 1 },
      con: { value: 14, mod: 2, save: 2, proficient: 0 },
      int: { value: 18, mod: 4, save: 6, proficient: 1 },
      wis: { value: 12, mod: 1, save: 1, proficient: 0 },
      cha: { value: 8, mod: -1, save: -1, proficient: 0 },
    },
    attributes: {
      ac: { value: 15 },
      hp: { value: 22, max: 38, temp: 4 },
      movement: { walk: 30 },
      prof: 3,
      spellcasting: "int",
      spelldc: 15,
      encumbrance: { value: 47, max: 150 },
    },
    details: { alignment: "Chaotic Good", background: "Sage" },
    currency: { pp: 1, gp: 120, ep: 0, sp: 8, cp: 33 },
    skills: {
      arc: { value: 2, total: 10, ability: "int" },
      ste: { value: 1, total: 6, ability: "dex" },
      ath: { value: 0, total: 0, ability: "str" },
    },
  },
  items: [
    { _id: "c1", type: "class", name: "Wizard", system: { levels: 5, identifier: "wizard" } },
    { _id: "c2", type: "class", name: "Rogue", system: { levels: 2, identifier: "rogue" } },
    { _id: "s1", type: "subclass", name: "School of Evocation", system: { classIdentifier: "wizard" } },
    { _id: "r1", type: "race", name: "Half-Elf" },
    {
      _id: "w1",
      type: "weapon",
      name: "Dagger",
      system: {
        quantity: 2,
        weight: 1,
        equipped: true,
        rarity: "common",
        // Foundry's own codes, not words a player would recognise — the
        // parser must expand them.
        properties: ["fin", "thr"],
        damage: { parts: [["1d4 + @mod", "piercing"]] },
        description: { value: "<p>A simple <strong>dagger</strong>.</p>" },
      },
    },
    {
      _id: "f1",
      type: "feat",
      name: "Arcane Recovery",
      system: {
        uses: { value: 0, max: 1, per: "lr" },
        requirements: "Wizard 1",
        description: { value: "<p>Recover slots.</p>" },
      },
    },
    {
      _id: "sp1",
      type: "spell",
      name: "Fireball",
      system: {
        level: 3,
        school: "evo",
        preparation: { mode: "prepared", prepared: true },
        activation: { type: "action", cost: 1 },
        range: { value: 150, units: "ft" },
        duration: { units: "inst" },
        components: { vocal: true, somatic: true, material: true },
        description: { value: "<p>Boom.</p>" },
      },
    },
    {
      _id: "sp2",
      type: "spell",
      name: "Mage Hand",
      system: {
        level: 0,
        school: "con",
        preparation: { mode: "atwill" },
        activation: { type: "action", cost: 1 },
        range: { value: 30, units: "ft" },
        duration: { value: 1, units: "minute" },
        components: { somatic: true },
        description: { value: "" },
      },
    },
  ],
};

const r = parseFoundryActor(ACTOR);
assert.equal(r.ok, true);
assert.equal(r.actorId, "abc123");
const s = r.sheet;

// Identity, including multiclass order (highest level first) and subclass.
assert.equal(s.identity.name, "Zibal Faringray");
assert.equal(s.identity.race, "Half-Elf");
assert.deepEqual(
  s.identity.classes.map((c) => `${c.name} ${c.level}`),
  ["Wizard 5", "Rogue 2"],
);
assert.equal(s.identity.classes[0].subclass, "School of Evocation");
assert.equal(s.identity.portraitUrl, "https://example.com/zibal.webp");

// Stats are read, never recomputed.
assert.equal(s.stats.ac, 15);
assert.deepEqual(s.stats.hp, { value: 22, max: 38, temp: 4 });
assert.equal(s.stats.speed, 30);
assert.equal(s.stats.proficiencyBonus, 3);
assert.equal(s.stats.abilities.int.value, 18);
assert.equal(s.stats.abilities.int.modifier, 4);
assert.equal(s.stats.savingThrows.int.proficient, true);
assert.equal(s.stats.savingThrows.int.modifier, 6);
assert.equal(s.stats.savingThrows.cha.proficient, false);

// Skills: readable labels, expertise distinguished from proficiency.
assert.equal(s.stats.skills.Arcana.expertise, true);
assert.equal(s.stats.skills.Arcana.proficient, true);
assert.equal(s.stats.skills.Stealth.proficient, true);
assert.equal(s.stats.skills.Stealth.expertise, false);
assert.equal(s.stats.skills.Athletics.proficient, false);
assert.equal(s.stats.skills.Arcana.ability, "int");
// Raw Foundry keys never reach the sheet.
assert.equal(s.stats.skills.arc, undefined);

assert.deepEqual(s.stats.currency, { pp: 1, gp: 120, ep: 0, sp: 8, cp: 33 });
assert.deepEqual(s.stats.encumbrance, { value: 47, max: 150 });
assert.equal(s.stats.spellcasting.ability, "int");
assert.equal(s.stats.spellcasting.saveDc, 15);
assert.equal(s.stats.spellcasting.attackModifier, 7); // prof 3 + int mod 4

// Items / features / spells are bucketed by item.type, not mixed.
assert.deepEqual(s.items.map((i) => i.name), ["Dagger"]);
assert.deepEqual(s.features.map((f) => f.name), ["Arcane Recovery"]);
assert.deepEqual(s.spells.map((x) => x.name), ["Mage Hand", "Fireball"]); // sorted by level

const dagger = s.items[0];
assert.equal(dagger.quantity, 2);
assert.equal(dagger.equipped, true);
assert.deepEqual(dagger.damage, { formula: "1d4 + @mod", type: "piercing" });
assert.deepEqual(dagger.properties, ["Finesse", "Thrown"]);

// An unrecognised property code is title-cased rather than dropped.
{
  const modded = parseFoundryActor({
    type: "character", name: "M",
    system: { id: "dnd5e", abilities: {} },
    items: [
      {
        _id: "w9", type: "weapon", name: "Ray Gun",
        system: { properties: ["burstFire", "customProp"] },
      },
    ],
  });
  assert.deepEqual(modded.sheet.items[0].properties, ["Burst Fire", "Custom Prop"]);
}
assert.equal(dagger.description, "A simple dagger.");

const recovery = s.features[0];
assert.deepEqual(recovery.uses, { value: 0, max: 1, recharge: "long rest" });
assert.equal(recovery.source, "Wizard");

const fireball = s.spells.find((x) => x.name === "Fireball");
assert.equal(fireball.level, 3);
assert.equal(fireball.school, "Evocation");
assert.equal(fireball.castingTime, "1 action");
assert.equal(fireball.range, "150 ft");
assert.equal(fireball.duration, "Instantaneous");
assert.equal(fireball.components, "V, S, M");
assert.equal(fireball.preparationMode, "Prepared");
assert.equal(fireball.prepared, true);

// At-will spells count as available — otherwise a warlock's whole list would
// render as "unprepared".
const mageHand = s.spells.find((x) => x.name === "Mage Hand");
assert.equal(mageHand.preparationMode, "At Will");
assert.equal(mageHand.prepared, true);
assert.equal(mageHand.duration, "1 minute");
assert.equal(mageHand.components, "S");

// --- degraded / older exports -------------------------------------------------

// A non-caster gets NO spellcasting block, so the Overview can hide it.
const fighter = parseFoundryActor({
  type: "character",
  name: "Kharkh",
  system: { id: "dnd5e", abilities: {}, attributes: {} },
  items: [],
});
assert.equal(fighter.ok, true);
assert.equal(fighter.sheet.stats.spellcasting, undefined);
// Missing abilities degrade to 10/0 rather than NaN or a throw.
assert.deepEqual(fighter.sheet.stats.abilities.str, { value: 10, modifier: 0 });
assert.equal(fighter.sheet.identity.classes.length, 0);

// Legacy shapes: race as a details string, speed as "30 ft.", weight objects.
const legacy = parseFoundryActor({
  type: "character",
  name: "Old",
  id: "newstyle-id",
  system: {
    id: "dnd5e",
    abilities: { str: { value: 12, mod: 1 } },
    attributes: { speed: { value: "30 ft." }, encumbrance: { max: 180 } },
    details: { race: "Dwarf", background: "Soldier" },
  },
  items: [
    { _id: "i1", type: "loot", name: "Rope", system: { quantity: 2, weight: { value: 5 } } },
  ],
});
assert.equal(legacy.ok, true);
assert.equal(legacy.actorId, "newstyle-id");
assert.equal(legacy.sheet.identity.race, "Dwarf");
assert.equal(legacy.sheet.identity.background, "Soldier");
assert.equal(legacy.sheet.stats.speed, 30);
// Encumbrance summed from items when Foundry didn't pre-total it: 5 × 2.
assert.deepEqual(legacy.sheet.stats.encumbrance, { value: 10, max: 180 });

// Foundry's Export Data STRIPS _id, so an export with no id is the normal
// case, not a broken file. The name becomes the key instead, so re-importing
// the same character replaces its sheet.
{
  const noId = parseFoundryActor({
    type: "character",
    name: "Zibal Faringray",
    system: { id: "dnd5e", abilities: {} },
    items: [],
  });
  assert.equal(noId.ok, true);
  assert.equal(noId.actorId, "name:zibal faringray");
  // Same character again -> same key -> an upsert, not a duplicate row.
  const again = parseFoundryActor({
    type: "character",
    name: "  ZIBAL FARINGRAY  ",
    system: { id: "dnd5e", abilities: {} },
    items: [],
  });
  assert.equal(again.actorId, noId.actorId);
}
// A real id still wins over the name, since it survives a rename.
assert.equal(
  parseFoundryActor({
    type: "character", name: "X", _id: "realid",
    system: { id: "dnd5e", abilities: {} },
  }).actorId,
  "realid",
);

// dnd5e derives `mod`, `save`, skill totals and the proficiency bonus at
// runtime and does NOT export them — so they have to be derived here, or every
// modifier renders as +0, which looks like a real answer.
{
  const derived = parseFoundryActor({
    type: "character",
    name: "Derived",
    system: {
      id: "dnd5e",
      abilities: {
        str: { value: 8 },
        dex: { value: 16, proficient: 1 },
        con: { value: 15 },
        int: { value: 20, proficient: 1 },
        wis: { value: 10 },
        cha: { value: 11 },
      },
      skills: {
        arc: { value: 2, ability: "int" },   // expertise
        ste: { value: 1, ability: "dex" },   // proficient
        ath: { value: 0, ability: "str" },   // neither
        acr: { value: 0.5, ability: "dex" }, // half
      },
      attributes: {},
    },
    items: [
      { _id: "c1", type: "class", name: "Rogue", system: { levels: 5, identifier: "rogue" } },
    ],
  });
  assert.equal(derived.ok, true);
  const st = derived.sheet.stats;

  // floor((score - 10) / 2), including the negative and odd cases.
  assert.equal(st.abilities.str.modifier, -1); // 8
  assert.equal(st.abilities.dex.modifier, 3);  // 16
  assert.equal(st.abilities.con.modifier, 2);  // 15 -> odd rounds down
  assert.equal(st.abilities.int.modifier, 5);  // 20
  assert.equal(st.abilities.cha.modifier, 0);  // 11

  // Level 5 -> proficiency +3.
  assert.equal(st.proficiencyBonus, 3);

  // Saves: ability modifier, plus proficiency where proficient.
  assert.equal(st.savingThrows.dex.modifier, 6); // 3 + 3
  assert.equal(st.savingThrows.dex.proficient, true);
  assert.equal(st.savingThrows.str.modifier, -1); // not proficient
  assert.equal(st.savingThrows.str.proficient, false);

  // Skills: expertise doubles, half-proficiency rounds down.
  assert.equal(st.skills.Arcana.modifier, 11);      // int 5 + 3*2
  assert.equal(st.skills.Stealth.modifier, 6);      // dex 3 + 3
  assert.equal(st.skills.Athletics.modifier, -1);   // str -1 + 0
  assert.equal(st.skills.Acrobatics.modifier, 4);   // dex 3 + floor(3/2)
}

// The 5e modifier table, asserted score by score. Every value in each band
// must give the same modifier, and the boundaries are where an off-by-one
// would hide.
{
  const BANDS = [
    [[1], -5], [[2, 3], -4], [[4, 5], -3], [[6, 7], -2], [[8, 9], -1],
    [[10, 11], 0], [[12, 13], 1], [[14, 15], 2], [[16, 17], 3],
    [[18, 19], 4], [[20, 21], 5],
    // Above 20 the same rule keeps going — 5e just stops printing
    // the table there, and nothing about the arithmetic changes.
    [[22, 23], 6], [[30], 10],
  ];
  for (const [scores, expected] of BANDS) {
    for (const score of scores) {
      const r = parseFoundryActor({
        type: "character",
        name: "T",
        system: { id: "dnd5e", abilities: { str: { value: score } }, attributes: {} },
        items: [],
      });
      assert.equal(
        r.sheet.stats.abilities.str.modifier,
        expected,
        `score ${score} should give ${expected}`,
      );
    }
  }
}

// Armour class is derived too — dnd5e computes it at runtime, so a plain
// export carries no `value` and the sheet was showing 0.
{
  const ac = (system, items = []) =>
    parseFoundryActor({ type: "character", name: "AC", system: { id: "dnd5e", ...system }, items })
      .sheet.stats.ac;

  const dex16 = { abilities: { dex: { value: 16 } }, attributes: {} };

  // Unarmoured: 10 + Dex.
  assert.equal(ac(dex16), 13);

  // Light armour (no Dex cap): 11 + 3.
  assert.equal(
    ac(dex16, [{ type: "equipment", name: "Leather", system: { equipped: true, armor: { value: 11, dex: null } } }]),
    14,
  );

  // Medium armour caps Dex at 2: 14 + 2, not 14 + 3.
  assert.equal(
    ac(dex16, [{ type: "equipment", name: "Breastplate", system: { equipped: true, armor: { value: 14, dex: 2 } } }]),
    16,
  );

  // Heavy armour ignores Dex entirely.
  assert.equal(
    ac(dex16, [{ type: "equipment", name: "Plate", system: { equipped: true, armor: { value: 18, dex: 0 } } }]),
    18,
  );

  // A shield stacks on top.
  assert.equal(
    ac(dex16, [
      { type: "equipment", name: "Plate", system: { equipped: true, armor: { value: 18, dex: 0 } } },
      { type: "equipment", name: "Shield", system: { equipped: true, type: { value: "shield" }, armor: { value: 2 } } },
    ]),
    20,
  );

  // Unequipped armour is not worn.
  assert.equal(
    ac(dex16, [{ type: "equipment", name: "Plate", system: { equipped: false, armor: { value: 18, dex: 0 } } }]),
    13,
  );

  // A flat AC (natural armour, monsters, effects) is used as stated.
  assert.equal(ac({ abilities: {}, attributes: { ac: { calc: "flat", flat: 17 } } }), 17);

  // And an exported value beats every derivation.
  assert.equal(
    ac({ abilities: { dex: { value: 16 } }, attributes: { ac: { value: 21, calc: "default" } } }),
    21,
  );
}

// What Foundry DID export always wins over the derivation.
{
  const exported = parseFoundryActor({
    type: "character",
    name: "Exported",
    system: {
      id: "dnd5e",
      // A deliberately "wrong" mod: a module or an effect may legitimately
      // change it, and the export is the authority.
      abilities: { str: { value: 16, mod: 99, save: 42, proficient: 1 } },
      skills: { ath: { value: 1, ability: "str", total: 77 } },
      attributes: { prof: 6 },
    },
    items: [],
  });
  assert.equal(exported.sheet.stats.abilities.str.modifier, 99);
  assert.equal(exported.sheet.stats.savingThrows.str.modifier, 42);
  assert.equal(exported.sheet.stats.skills.Athletics.modifier, 77);
  assert.equal(exported.sheet.stats.proficiencyBonus, 6);
}

// Modern dnd5e writes a roll-config OBJECT at abilities.<key>.save
// ({roll: {max, min, mode}}), not the total — the total is computed at
// runtime and never exported. That object is present (not undefined), so a
// check that only asked "did Foundry send something here" mistook it for an
// already-computed number, ran it through the numeric coercion, and got that
// helper's zero fallback for every single ability — proficient or not, high
// modifier or low, all six saves landed on the same wrong constant. Each one
// must come out different here, matching its own ability modifier and
// proficiency, or the object is winning again.
{
  const modern = parseFoundryActor({
    type: "character",
    name: "Echo",
    system: {
      id: "dnd5e",
      abilities: {
        cha: { value: 16, save: { roll: { max: null, min: null, mode: 0 } }, proficient: 1 },
        dex: { value: 16, save: { roll: { max: null, min: null, mode: 0 } }, proficient: 1 },
        con: { value: 11, save: { roll: { max: null, min: null, mode: 0 } }, proficient: 0 },
        wis: { value: 12, save: { roll: { max: null, min: null, mode: 0 } }, proficient: 0 },
      },
      attributes: { prof: 3 },
    },
    items: [],
  });
  const st = modern.sheet.stats.savingThrows;
  assert.equal(st.cha.modifier, 6, "proficient +3 cha should be 3 (mod) + 3 (prof) = 6"); // 3 + 3
  assert.equal(st.dex.modifier, 6, "proficient +3 dex should be 3 (mod) + 3 (prof) = 6"); // 3 + 3
  assert.equal(st.con.modifier, 0, "non-proficient +0 con should stay 0"); // 0, not proficient
  assert.equal(st.wis.modifier, 1, "non-proficient +1 wis should stay 1"); // 1, not proficient
  assert.equal(st.cha.proficient, true);
  assert.equal(st.con.proficient, false);
}

// Multiclass proficiency uses TOTAL level: 5 + 2 = 7 -> +3.
{
  const multi = parseFoundryActor({
    type: "character", name: "M",
    system: { id: "dnd5e", abilities: {}, attributes: {} },
    items: [
      { type: "class", name: "Wizard", system: { levels: 5, identifier: "wizard" } },
      { type: "class", name: "Rogue", system: { levels: 2, identifier: "rogue" } },
    ],
  });
  assert.equal(multi.sheet.stats.proficiencyBonus, 3);
}

// --- values the vestige-foundry module computed for us ----------------------
// dnd5e derives AC, walking speed and the rest at runtime, so an export
// carries none of them. What the module sends from inside Foundry wins over
// anything this parser could work out on its own.
{
  const pushed = parseFoundryActor({
    type: "character",
    name: "Pushed",
    flags: {
      vestige: {
        derived: {
          ac: 17,
          speed: 40,
          proficiencyBonus: 3,
          abilities: { str: { mod: 4, save: 7 } },
          skills: { ath: 9 },
        },
      },
    },
    system: {
      id: "dnd5e",
      // Everything below would derive to something different.
      abilities: { str: { value: 18, proficient: 1 } },
      attributes: { ac: { calc: "default" }, movement: { walk: null } },
      skills: { ath: { value: 1, ability: "str" } },
    },
    items: [],
  });
  assert.equal(pushed.sheet.stats.ac, 17);
  assert.equal(pushed.sheet.stats.speed, 40);
  assert.equal(pushed.sheet.stats.abilities.str.modifier, 4);
  assert.equal(pushed.sheet.stats.savingThrows.str.modifier, 7);
  assert.equal(pushed.sheet.stats.skills.Athletics.modifier, 9);
}

// A hand-uploaded export has no such flag, and must still derive as before.
{
  const uploaded = parseFoundryActor({
    type: "character",
    name: "Uploaded",
    system: {
      id: "dnd5e",
      abilities: { dex: { value: 14 } },
      attributes: { ac: { calc: "default" }, movement: { walk: 30 } },
    },
    items: [],
  });
  assert.equal(uploaded.sheet.stats.speed, 30);
  // 10 + Dex, the unarmoured default.
  assert.equal(uploaded.sheet.stats.ac, 12);
}

// A zero the module actually sent is a fact, not a missing field.
{
  const grappled = parseFoundryActor({
    type: "character",
    name: "Zero",
    flags: { vestige: { derived: { speed: 0 } } },
    system: { id: "dnd5e", abilities: {}, attributes: { movement: { walk: 30 } } },
    items: [],
  });
  assert.equal(grappled.sheet.stats.speed, 0);
}

// A real dnd5e 4.x export: movement carries no `walk` (the race item applies
// it at runtime), and neither `prof` nor `abilities.*.mod` survive the export.
{
  const real = parseFoundryActor({
    type: "character",
    name: "Echo",
    system: {
      id: "dnd5e",
      abilities: { cha: { value: 16, proficient: 1 } },
      attributes: {
        movement: { hover: false, units: null },
        spellcasting: "cha",
        prof: null,
        spelldc: null,
      },
    },
    items: [
      { type: "class", name: "Bard", system: { levels: 7 } },
      { type: "race", name: "Centaur", system: { movement: { walk: "40", climb: "10" } } },
    ],
  });
  assert.equal(real.sheet.stats.speed, 40);
  assert.equal(real.sheet.stats.proficiencyBonus, 3);
  // Charisma 16 is +3; 8 + 3 prof + 3 = 14, and the attack is 3 + 3.
  assert.equal(real.sheet.stats.spellcasting.saveDc, 14);
  assert.equal(real.sheet.stats.spellcasting.attackModifier, 6);
}

// Max hit points: dnd5e exports hp.max as null and derives it at runtime, so
// it is rebuilt from the class hit dice, the advancement record and Con.
{
  // Bard 7 on a d8 with Con 11 (+0): 8 at level 1, then six average rolls of 5.
  const bard = parseFoundryActor({
    type: "character",
    name: "Echo",
    system: {
      id: "dnd5e",
      abilities: { con: { value: 11 }, cha: { value: 16 } },
      attributes: { hp: { value: 38, max: null, temp: 0 } },
    },
    items: [
      {
        type: "class",
        name: "Bard",
        system: {
          levels: 7,
          hd: { denomination: "d8" },
          advancement: {
            a1: {
              type: "HitPoints",
              value: { 1: "max", 2: "avg", 3: "avg", 4: "avg", 5: "avg", 6: "avg", 7: "avg" },
            },
          },
        },
      },
    ],
  });
  assert.equal(bard.sheet.stats.hp.max, 38);
  assert.equal(bard.sheet.stats.hp.value, 38);

  // A maximum below the current total is provably missing a runtime bonus, so
  // none is claimed rather than showing one that can't be true.
  const boosted = parseFoundryActor({
    type: "character",
    name: "Arroth",
    system: {
      id: "dnd5e",
      abilities: { con: { value: 16 } },
      attributes: { hp: { value: 74, max: null, temp: 0 } },
    },
    items: [
      {
        type: "class",
        name: "Fighter",
        system: { levels: 7, hd: { denomination: "d10" } },
      },
    ],
  });
  assert.equal(boosted.sheet.stats.hp.max, 0);
  assert.equal(boosted.sheet.stats.hp.value, 74);

  // Rolled levels are used verbatim where the advancement recorded them.
  const rolled = parseFoundryActor({
    type: "character",
    name: "Rolled",
    system: {
      id: "dnd5e",
      abilities: { con: { value: 14 } },
      attributes: { hp: { value: 20, max: null } },
    },
    items: [
      {
        type: "class",
        name: "Rogue",
        system: {
          levels: 3,
          hd: { denomination: "d8" },
          advancement: { a: { type: "HitPoints", value: { 1: "max", 2: 7, 3: 3 } } },
        },
      },
    ],
  });
  // 8 + 7 + 3 dice, plus +2 Con across three levels.
  assert.equal(rolled.sheet.stats.hp.max, 24);
}

// A max Foundry did export is taken as given, derivation skipped.
{
  const exported = parseFoundryActor({
    type: "character",
    name: "Exact",
    flags: { vestige: { derived: { hpMax: 81 } } },
    system: {
      id: "dnd5e",
      abilities: { con: { value: 16 } },
      attributes: { hp: { value: 74 } },
    },
    items: [{ type: "class", name: "Fighter", system: { levels: 7, hd: { denomination: "d10" } } }],
  });
  assert.equal(exported.sheet.stats.hp.max, 81);
}

// Values Foundry did compute still win over the derived ones.
{
  const exported = parseFoundryActor({
    type: "character",
    name: "Exported",
    flags: { vestige: { derived: { spellDc: 17, spellAttack: 9 } } },
    system: {
      id: "dnd5e",
      abilities: { int: { value: 20 } },
      attributes: { spellcasting: "int", movement: { walk: 30 } },
    },
    items: [{ type: "class", name: "Wizard", system: { levels: 5 } }],
  });
  assert.equal(exported.sheet.stats.spellcasting.saveDc, 17);
  assert.equal(exported.sheet.stats.spellcasting.attackModifier, 9);
  // The race item is only consulted when system movement has no walk.
  assert.equal(exported.sheet.stats.speed, 30);
}

// Hostile input must not throw.
for (const junk of [null, undefined, 42, "nope", [], { items: "not-an-array" }]) {
  assert.equal(parseFoundryActor(junk).ok, false);
}
// An actor whose items array holds junk entries still parses.
const junkItems = parseFoundryActor({
  type: "character",
  name: "X",
  system: { id: "dnd5e", abilities: {} },
  items: [null, 5, "x", { type: "weapon", name: "Axe", system: null }],
});
assert.equal(junkItems.ok, true);
assert.equal(junkItems.sheet.items.length, 1);
assert.equal(junkItems.sheet.items[0].name, "Axe");

// Race, background, class and subclass items each carry their own icon
// (dnd5e ships one per compendium entry), and each is kept as its own path —
// not merged into one field — since a multiclass character has more than one
// class icon and there's no single field to fold them into.
{
  const iconed = parseFoundryActor({
    type: "character",
    name: "Echo",
    system: { id: "dnd5e", abilities: {} },
    items: [
      { type: "race", name: "Centaur", img: "modules/phb/icons/species/centaur.webp" },
      { type: "background", name: "Sage", img: "modules/phb/icons/backgrounds/sage.webp" },
      {
        type: "class",
        name: "Bard",
        img: "modules/phb/icons/classes/bard.webp",
        system: { levels: 7, identifier: "bard" },
      },
      {
        type: "subclass",
        name: "College of Lore",
        img: "modules/phb/icons/classes/lore.webp",
        system: { classIdentifier: "bard" },
      },
    ],
  });
  assert.equal(iconed.ok, true);
  assert.equal(iconed.sheet.identity.raceIconPath, "modules/phb/icons/species/centaur.webp");
  assert.equal(
    iconed.sheet.identity.backgroundIconPath,
    "modules/phb/icons/backgrounds/sage.webp",
  );
  assert.equal(iconed.sheet.identity.classes.length, 1);
  assert.equal(iconed.sheet.identity.classes[0].iconPath, "modules/phb/icons/classes/bard.webp");
  assert.equal(
    iconed.sheet.identity.classes[0].subclassIconPath,
    "modules/phb/icons/classes/lore.webp",
  );

  // The legacy string-based race/background (no item, just details.race) has
  // no icon to carry — the field stays undefined, not a broken empty string.
  const legacyNoIcon = parseFoundryActor({
    type: "character",
    name: "Old",
    system: { id: "dnd5e", abilities: {}, details: { race: "Dwarf", background: "Soldier" } },
    items: [],
  });
  assert.equal(legacyNoIcon.sheet.identity.race, "Dwarf");
  assert.equal(legacyNoIcon.sheet.identity.raceIconPath, undefined);
  assert.equal(legacyNoIcon.sheet.identity.backgroundIconPath, undefined);

  // An http(s)-hosted icon (never happens in practice, but imagePath()
  // deliberately drops those — they're not a Foundry-relative path the
  // artwork step could resolve) is dropped, not kept as a broken reference.
  const httpIcon = parseFoundryActor({
    type: "character",
    name: "Hosted",
    system: { id: "dnd5e", abilities: {} },
    items: [{ type: "race", name: "Elf", img: "https://example.com/elf.webp" }],
  });
  assert.equal(httpIcon.sheet.identity.raceIconPath, undefined);
}

console.log("foundry parser: all assertions passed");
