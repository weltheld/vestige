// Round-trip check: what the editor saves must come back as the right block
// kind, and anchors must not shift (they're what comments hang off).
import assert from "node:assert/strict";
import { blocksFor } from "./notes.ts";

// 1. What the editor writes for Heading / Subheading / Body copy.
const authored = "## The Ambush\n\nThey were waiting at the ford.\n\n### Aftermath\n\nTwo dead.";
const b = blocksFor("notes", authored);
assert.deepEqual(
  b.map((x) => [x.anchor, x.heading ?? null, x.text]),
  [
    ["notes:0", 1, "The Ambush"],
    ["notes:1", null, "They were waiting at the ford."],
    ["notes:2", 2, "Aftermath"],
    ["notes:3", null, "Two dead."],
  ],
);

// 2. Familiar's recap sections (### ...) — previously rendered as literal text.
const fromFamiliar = "### Party Decisions\n\nThey went east.\n\n### Combat\n\nA brief scuffle.";
assert.deepEqual(
  blocksFor("summary", fromFamiliar).map((x) => [x.heading ?? null, x.text]),
  [[2, "Party Decisions"], [null, "They went east."], [2, "Combat"], [null, "A brief scuffle."]],
);

// 3. Anchors are unchanged for content with no headings — existing comments
//    must stay attached to the same paragraphs.
const plain = "First para.\n\nSecond para.\n\nThird para.";
assert.deepEqual(
  blocksFor("summary", plain).map((x) => x.anchor),
  ["summary:0", "summary:1", "summary:2"],
);
assert.equal(blocksFor("summary", plain).every((x) => x.heading === undefined), true);

// 4. A "#" that isn't a heading (no space) stays body copy.
assert.equal(blocksFor("notes", "#3 on the list was the culprit").at(0).heading, undefined);

// 5. Deep levels clamp to the minor heading rather than vanishing.
assert.equal(blocksFor("notes", "###### Tiny").at(0).heading, 2);

// 6. Dividers, in all three markdown spellings, carry no text.
for (const rule of ["---", "***", "___", "- - -".replace(/ /g, "")]) {
  const d = blocksFor("notes", `Before.\n\n${rule}\n\nAfter.`);
  assert.equal(d[1].divider, true, `"${rule}" should be a divider`);
  assert.equal(d[1].text, "");
  assert.equal(d[0].divider, undefined);
  assert.equal(d[2].text, "After.");
}

// 7. A line of dashes is a divider, but a sentence with dashes is not.
assert.equal(blocksFor("notes", "He paused — then ran.").at(0).divider, undefined);

// 8. Empty / null sections still yield nothing.
assert.deepEqual(blocksFor("notes", null), []);
assert.deepEqual(blocksFor("notes", "   "), []);

console.log("notes.blocksFor: all assertions passed");
