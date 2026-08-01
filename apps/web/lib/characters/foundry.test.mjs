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
        properties: ["finesse", "thrown"],
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
assert.deepEqual(dagger.properties, ["finesse", "thrown"]);
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

console.log("foundry parser: all assertions passed");
