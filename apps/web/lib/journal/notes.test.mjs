// Round-trip check: what the editor saves must come back as the right block
// kind, and anchors must not shift (they're what comments hang off).
import assert from "node:assert/strict";
import { blocksFor, chaptersFor } from "./notes.ts";

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

// --- chaptersFor: the commenting unit is a heading and its body ---

// 9. A heading opens a chapter; following paragraphs belong to it.
const ch = chaptersFor(
  blocksFor("notes", "## The Ambush\n\nOne.\n\nTwo.\n\n### Aftermath\n\nThree."),
);
assert.equal(ch.length, 2);
assert.equal(ch[0].heading.text, "The Ambush");
assert.deepEqual(ch[0].blocks.map((b) => b.text), ["One.", "Two."]);
assert.deepEqual(ch[0].anchors, ["notes:0", "notes:1", "notes:2"]);
assert.equal(ch[0].anchor, "notes:0"); // new comments land on the heading
assert.equal(ch[1].heading.text, "Aftermath");
assert.deepEqual(ch[1].blocks.map((b) => b.text), ["Three."]);

// 10. Text before any heading is one untitled chapter — and a section with
//     no headings at all is therefore a single unit, not one per paragraph.
const none = chaptersFor(blocksFor("summary", "A.\n\nB.\n\nC."));
assert.equal(none.length, 1);
assert.equal(none[0].heading, null);
assert.equal(none[0].blocks.length, 3);
assert.deepEqual(none[0].anchors, ["summary:0", "summary:1", "summary:2"]);

// 11. Intro text followed by a heading splits into untitled + titled.
const mixed = chaptersFor(blocksFor("summary", "Intro.\n\n## Later\n\nBody."));
assert.equal(mixed.length, 2);
assert.equal(mixed[0].heading, null);
assert.deepEqual(mixed[0].blocks.map((b) => b.text), ["Intro."]);
assert.equal(mixed[1].heading.text, "Later");

// 12. Every anchor survives grouping — no comment can be orphaned.
const src = "## H\n\nA.\n\n---\n\nB.\n\n### H2\n\nC.";
const all = blocksFor("notes", src).map((b) => b.anchor);
const grouped = chaptersFor(blocksFor("notes", src)).flatMap((c) => c.anchors);
assert.deepEqual(grouped, all);

// 13. Empty input yields no chapters.
assert.deepEqual(chaptersFor([]), []);

console.log("notes.blocksFor + chaptersFor: all assertions passed");
