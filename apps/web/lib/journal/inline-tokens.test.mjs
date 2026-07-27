// Everything the editor's toolbar can write must tokenize, not survive as
// literal asterisks on the page.
import assert from "node:assert/strict";
import { autoLinkTokens, tokenizeInline } from "./inline-tokens.ts";
import { buildAutoLinker } from "./auto-link.ts";

/** Compact, readable rendering of the token tree. */
function s(tokens) {
  return tokens
    .map((t) =>
      t.type === "text" ? t.value
      : t.type === "bold" ? `<b>${s(t.children)}</b>`
      : t.type === "italic" ? `<i>${s(t.children)}</i>`
      : t.type === "code" ? `<c>${t.value}</c>`
      : t.type === "ref" ? `<${t.kind}:${t.id}>${t.label}</>`
      : `<a ${t.href}>${t.label}</a>`,
    )
    .join("");
}
const r = (text) => s(tokenizeInline(text));
const UUID = "11111111-2222-3333-4444-555555555555";

// The exact strings from the reported page.
assert.equal(r("the unsettling sight of the **Sacrifice Engine** — a pit"),
  "the unsettling sight of the <b>Sacrifice Engine</b> — a pit");
assert.equal(r("plants that were, unmistakably, *alive* —"),
  "plants that were, unmistakably, <i>alive</i> —");
assert.equal(r("a towering **firbolg** named **Foghome**, follower"),
  "a towering <b>firbolg</b> named <b>Foghome</b>, follower");

// Bold wins over italic at the same position.
assert.equal(r("**bold** and *it*"), "<b>bold</b> and <i>it</i>");

// Codex mentions still parse, and survive being wrapped in bold.
assert.equal(r(`[Larry](codex:${UUID})`), `<codex:${UUID}>Larry</>`);
assert.equal(r(`**[Larry](codex:${UUID})**`), `<b><codex:${UUID}>Larry</></b>`);
assert.equal(r(`[Session 4](session:${UUID})`), `<session:${UUID}>Session 4</>`);

// External links and code.
assert.equal(r("see [the map](https://example.com/m)"), "see <a https://example.com/m>the map</a>");
assert.equal(r("roll `2d6+3` now"), "roll <c>2d6+3</c> now");

// Plain text is untouched; stray markers stay literal.
assert.equal(r("nothing special here"), "nothing special here");
assert.equal(r("2 * 3 = 6"), "2 * 3 = 6");
assert.equal(r("a lone ** marker"), "a lone ** marker");
assert.equal(r("the field_name_here value"), "the field_name_here value");
assert.equal(r(""), "");

// --- auto-linking codex names in bare prose ---------------------------------

const ID_A = "aaaaaaaa-2222-3333-4444-555555555555";
const ID_B = "bbbbbbbb-2222-3333-4444-555555555555";
const CODEX = [
  { id: ID_A, name: "Larry" },
  { id: ID_B, name: "Sacrifice Engine" },
  { id: "cccccccc-2222-3333-4444-555555555555", name: "Ox" }, // too short
];
const linker = buildAutoLinker(CODEX);
const a = (text, seen = new Set()) =>
  s(autoLinkTokens(tokenizeInline(text), linker, seen));

// The plain case, and case-insensitive matching that keeps the prose's casing.
assert.equal(a("Larry drew his blade"), `<codex:${ID_A}>Larry</> drew his blade`);
assert.equal(a("then LARRY spoke"), `then <codex:${ID_A}>LARRY</> spoke`);

// Longest name first, so the two-word entry wins over any substring of it.
assert.equal(a("the Sacrifice Engine hummed"), `the <codex:${ID_B}>Sacrifice Engine</> hummed`);

// Once per chapter: the shared `seen` set stops the second mention linking.
const seen = new Set();
assert.equal(a("Larry ran", seen), `<codex:${ID_A}>Larry</> ran`);
assert.equal(a("Larry fell", seen), "Larry fell");

// Emphasis is recursed into; code and existing links are left alone.
assert.equal(a("**Larry** shouted"), `<b><codex:${ID_A}>Larry</></b> shouted`);
assert.equal(a("run `Larry` now"), "run <c>Larry</c> now");
assert.equal(a(`[Larry](codex:${UUID})`), `<codex:${UUID}>Larry</>`);
assert.equal(a("see [Larry](https://x.co/l)"), "see <a https://x.co/l>Larry</a>");

// Word boundaries: no matching inside a longer word, but possessives and
// trailing punctuation still link the name itself.
assert.equal(a("the Larryson family"), "the Larryson family");
assert.equal(a("McLarry waved"), "McLarry waved");
assert.equal(a("Larry's pack"), `<codex:${ID_A}>Larry</>'s pack`);
assert.equal(a("(Larry)"), `(<codex:${ID_A}>Larry</>)`);

// Names under three characters are skipped — "Ox" would match inside prose.
assert.equal(a("an Ox stood there"), "an Ox stood there");

// An empty or all-too-short codex produces no matcher at all.
assert.equal(buildAutoLinker([]), null);
assert.equal(buildAutoLinker([{ id: ID_A, name: "Ox" }]), null);

// Regex metacharacters in a name must be escaped, not compiled — "St. Cael
// (the Younger)" would otherwise be a group with a wildcard in it.
const meta = buildAutoLinker([{ id: ID_A, name: "St. Cael (the Younger)" }]);
assert.equal(
  s(autoLinkTokens(tokenizeInline("we met St. Cael (the Younger) there"), meta, new Set())),
  `we met <codex:${ID_A}>St. Cael (the Younger)</> there`,
);
// The escaped dot must not match any character.
assert.equal(
  s(autoLinkTokens(tokenizeInline("we met Stx Cael (the Younger) there"), meta, new Set())),
  "we met Stx Cael (the Younger) there",
);

// A name whose markdown the tokenizer claims first (asterisks, backticks)
// simply doesn't auto-link — the emphasis wins, and that's the right call.
const starred = buildAutoLinker([{ id: ID_B, name: "The *Rift*" }]);
assert.equal(
  s(autoLinkTokens(tokenizeInline("beyond The *Rift* lies"), starred, new Set())),
  "beyond The <i>Rift</i> lies",
);

console.log("inline-tokens: all assertions passed");
