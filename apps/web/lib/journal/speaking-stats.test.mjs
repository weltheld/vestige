// The ingest accepts this straight off the wire, so the parser has to be
// hostile-input-proof, and the formatting has to never show a misleading zero.
import assert from "node:assert/strict";
import {
  parseSpeakingStats,
  totalSpokenSeconds,
  formatMinutes,
  formatSpan,
  shareOf,
} from "./speaking-stats.ts";

// The ordinary payload.
{
  const stats = parseSpeakingStats({
    spanSeconds: 12480,
    speakers: [
      { name: "DM", seconds: 4210 },
      { name: "Kharkh", seconds: 980 },
    ],
  });
  assert.deepEqual(stats, {
    spanSeconds: 12480,
    speakers: [
      { name: "DM", seconds: 4210 },
      { name: "Kharkh", seconds: 980 },
    ],
  });
  assert.equal(totalSpokenSeconds(stats), 5190);
}

// Re-sorted defensively — the card must not depend on Familiar's ordering.
{
  const stats = parseSpeakingStats({
    speakers: [
      { name: "Echo", seconds: 100 },
      { name: "DM", seconds: 900 },
    ],
  });
  assert.deepEqual(stats.speakers.map((s) => s.name), ["DM", "Echo"]);
  // A missing span is 0, not NaN — the footer just doesn't render.
  assert.equal(stats.spanSeconds, 0);
  assert.equal(formatSpan(0), "");
}

// Junk yields null, so the column stays NULL and no card renders.
for (const junk of [
  null,
  undefined,
  42,
  "nope",
  [],
  {},
  { speakers: "not-an-array" },
  { speakers: [] },
  { speakers: [null, 5, "x"] },
  { speakers: [{ name: "", seconds: 900 }] },
  { speakers: [{ name: "A", seconds: "900" }] },
  { speakers: [{ name: "A", seconds: NaN }] },
]) {
  assert.equal(parseSpeakingStats(junk), null, `expected null for ${JSON.stringify(junk)}`);
}

// A throat-clear doesn't earn a name on the card.
assert.equal(parseSpeakingStats({ speakers: [{ name: "A", seconds: 2 }] }), null);
{
  const stats = parseSpeakingStats({
    speakers: [{ name: "A", seconds: 600 }, { name: "Cough", seconds: 3 }],
  });
  assert.deepEqual(stats.speakers.map((s) => s.name), ["A"]);
}

// A malformed payload can't write an unbounded blob.
{
  const many = Array.from({ length: 200 }, (_, i) => ({ name: `P${i}`, seconds: 100 }));
  assert.equal(parseSpeakingStats({ speakers: many }).speakers.length, 30);
}
// Absurdly long names are truncated rather than rejected.
{
  const stats = parseSpeakingStats({ speakers: [{ name: "x".repeat(500), seconds: 60 }] });
  assert.equal(stats.speakers[0].name.length, 80);
}

// Formatting: never a bare "0 min" for someone who genuinely spoke.
assert.equal(formatMinutes(0), "<1 min");
assert.equal(formatMinutes(20), "<1 min");
assert.equal(formatMinutes(30), "1 min"); // rounds up at the half-minute
assert.equal(formatMinutes(60), "1 min");
assert.equal(formatMinutes(4210), "70 min");

assert.equal(formatSpan(12480), "3h 28m");
assert.equal(formatSpan(3600), "1h");
assert.equal(formatSpan(600), "10m");

assert.equal(shareOf(50, 200), 25);
assert.equal(shareOf(1, 0), 0); // no division by zero

console.log("speaking stats (vestige): all assertions passed");
