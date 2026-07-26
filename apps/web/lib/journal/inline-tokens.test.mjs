// Everything the editor's toolbar can write must tokenize, not survive as
// literal asterisks on the page.
import assert from "node:assert/strict";
import { tokenizeInline } from "./inline-tokens.ts";

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

console.log("inline-tokens: all assertions passed");
