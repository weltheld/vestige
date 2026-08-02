// Path matching decides whether a player's artwork appears at all, and the
// user picks the folder — so it has to survive them picking the wrong level.
import assert from "node:assert/strict";
import { collectImagePaths, normalisePath, matchFiles, isImage } from "./art.ts";

const f = (relativePath) => ({ name: relativePath.split("/").pop(), relativePath });

// Collected once each, from every part of the sheet.
{
  const paths = collectImagePaths({
    identity: { portraitPath: "worlds/w/eldrin.webp" },
    items: [{ imgPath: "icons/sword.webp" }, { imgPath: "icons/sword.webp" }],
    features: [{ imgPath: "icons/feat.webp" }, {}],
    spells: [{ imgPath: "icons/spell.webp" }],
  });
  assert.deepEqual(paths.sort(), [
    "icons/feat.webp", "icons/spell.webp", "icons/sword.webp", "worlds/w/eldrin.webp",
  ]);
}
assert.deepEqual(collectImagePaths({}), []);

// Normalisation: backslashes, leading slash, case, URL escapes.
// Windows separators. Built from a char code so the backslashes can't be
// eaten by whatever writes this file.
const BS = String.fromCharCode(92);
assert.equal(normalisePath(`Icons${BS}Weapons${BS}Sword.webp`), "icons/weapons/sword.webp");
assert.equal(normalisePath("/icons/a%20b.webp"), "icons/a b.webp");
assert.equal(normalisePath("icons/100%.webp"), "icons/100%.webp"); // malformed escape kept

// The user picked the Data folder itself.
{
  const { matched, missing } = matchFiles(
    ["icons/weapons/sword.webp"],
    [f("icons/weapons/sword.webp"), f("icons/potion.webp")],
  );
  assert.equal(matched.get("icons/weapons/sword.webp").name, "sword.webp");
  assert.deepEqual(missing, []);
}

// The user picked the PARENT of Data — paths carry an extra prefix.
{
  const { matched } = matchFiles(
    ["icons/weapons/sword.webp"],
    [f("FoundryData/Data/icons/weapons/sword.webp")],
  );
  assert.ok(matched.has("icons/weapons/sword.webp"));
}

// Two files share a filename: the deeper path agreement must win, or a
// module's unrelated "sword.webp" would shadow the real icon.
{
  const { matched } = matchFiles(
    ["icons/weapons/sword.webp"],
    [f("modules/junk/sword.webp"), f("Data/icons/weapons/sword.webp")],
  );
  assert.equal(matched.get("icons/weapons/sword.webp").relativePath,
    "Data/icons/weapons/sword.webp");
}

// Nothing matched is reported, not silently dropped.
{
  const { matched, missing } = matchFiles(["icons/missing.webp"], [f("icons/other.webp")]);
  assert.equal(matched.size, 0);
  assert.deepEqual(missing, ["icons/missing.webp"]);
}

// Case and separators differ between export and filesystem.
{
  const { matched } = matchFiles(
    ["Icons/Weapons/Sword.WEBP"],
    [f("data/icons/weapons/sword.webp")],
  );
  assert.equal(matched.size, 1);
}

assert.ok(isImage("a.webp") && isImage("A.PNG") && isImage("b.jpeg"));
assert.ok(!isImage("world.db") && !isImage("readme.md") && !isImage("noext"));

console.log("character art matching: all assertions passed");
