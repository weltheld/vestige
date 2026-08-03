import assert from "node:assert/strict";
import { cleanLead } from "./criticalrole-lead.ts";

/**
 * The lead-extraction rules, pinned against the shape Fandom actually returns.
 * No network: `lookupCriticalRole` is all transport, but the HTML wrangling is
 * where the bugs live, and this is the part worth locking down.
 */

// A real `action=parse&section=0` body, trimmed: an empty spacer paragraph, a
// portable infobox, the lead prose, and MediaWiki's grouped-ref complaint.
const ZADASH = `<div class="mw-content-ltr mw-parser-output" lang="en" dir="ltr"><p class="mw-empty-elt">
</p><aside role="region" class="portable-infobox pi-background">
<h2 class="pi-item pi-title">Zadash</h2>
<div class="pi-data"><p>Should not be quoted</p></div>
</aside>
<figure class="thumb"><figcaption>A view of the city</figcaption></figure>
<p><b>Zadash</b> is a large city south of <a href="/wiki/Rexxentrum">Rexxentrum</a> in the Dwendalian Empire.<sup class="reference">[1]</sup> It is built around a trio of towers.</p>
<p>Cite error: &lt;ref&gt; tags exist for a group named "art", but no corresponding &lt;references group="art"/&gt; tag was found</p></div>`;

const lead = cleanLead(ZADASH);

// The prose, and only the prose.
assert.ok(lead.startsWith("Zadash is a large city south of Rexxentrum"), lead);
assert.ok(lead.endsWith("built around a trio of towers."), lead);

// The infobox is not prose, even though it contains a <p>.
assert.ok(!lead.includes("Should not be quoted"), "infobox content leaked");
assert.ok(!lead.includes("A view of the city"), "figure caption leaked");

// Reference markers go; the grouped-ref error must never reach a codex entry.
assert.ok(!lead.includes("[1]"), "reference marker survived");
assert.ok(!/Cite error/i.test(lead), "MediaWiki cite error survived");

// No tags, no entities, no doubled whitespace.
assert.ok(!/[<>]/.test(lead), "markup survived");
assert.ok(!lead.includes("&"), "unescaped entity survived");
assert.ok(!/\s{2}/.test(lead), "collapsed whitespace expected");

// Entities are decoded rather than dropped.
assert.equal(cleanLead("<p>Ale &amp; Ashes&nbsp;Tavern</p>"), "Ale & Ashes Tavern");
assert.equal(cleanLead("<p>The &quot;Nein&quot;</p>"), 'The "Nein"');

// A page with no prose at all yields nothing, so the caller can say why
// instead of pasting an empty summary.
assert.equal(cleanLead('<div><aside><p>only an infobox</p></aside></div>'), "");
assert.equal(cleanLead("<p class=\"mw-empty-elt\">\n</p>"), "");

// Long leads are truncated on a word boundary with an ellipsis.
const long = cleanLead(`<p>${"word ".repeat(400)}</p>`, 60);
assert.ok(long.length <= 61, `expected truncation, got ${long.length}`);
assert.ok(long.endsWith("…"), long);
assert.ok(!long.endsWith(" …"), "should trim before the ellipsis");

console.log("critical role wiki lead extraction: all assertions passed");
