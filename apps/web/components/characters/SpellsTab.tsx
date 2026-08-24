"use client";

import { useState } from "react";
import type { CharacterSheetData, SheetSpell } from "@vestige/db";
import { DetailPanel, PanelDescription, PanelField } from "./DetailPanel";
import { Empty, GroupHeading } from "./ItemsTab";
import { Thumb } from "./Thumb";

const LEVEL_LABEL = [
  "Cantrips",
  "1st level",
  "2nd level",
  "3rd level",
  "4th level",
  "5th level",
  "6th level",
  "7th level",
  "8th level",
  "9th level",
];

/**
 * The spellbook — every known spell, grouped by level.
 *
 * All spells show, not just prepared ones: a spell you know but haven't
 * prepared today is still something you look up. Same row shape as the
 * Features tab (no proficiency mark) — prepared status is still there on
 * hover, in the row's own title, rather than as a separate visible mark.
 */
export function SpellsTab({
  spells,
  art,
}: {
  spells: SheetSpell[];
  art: CharacterSheetData["art"];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = spells.find((s) => s.id === openId) ?? null;

  if (spells.length === 0) {
    return <Empty>This character has no spells.</Empty>;
  }

  const levels = [...new Set(spells.map((s) => s.level))].sort((a, b) => a - b);

  return (
    <>
      <div className="flex flex-col gap-4">
        {levels.map((level) => {
          const group = spells.filter((s) => s.level === level);
          return (
            <section key={level}>
              <GroupHeading
                label={LEVEL_LABEL[level] ?? `Level ${level}`}
                count={group.length}
              />
              <ul className="flex flex-col rounded-lg border border-hairline px-3">
                {group.map((spell) => (
                  <li key={spell.id} className="border-b border-hairline last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenId(spell.id)}
                      aria-expanded={openId === spell.id}
                      title={spell.prepared ? spell.preparationMode : "Not prepared"}
                      className="flex w-full items-center gap-2.5 py-2 text-left transition hover:opacity-80"
                    >
                      <Thumb art={art} path={spell.imgPath} />
                      <span className="min-w-0 flex-1">
                        <span className="truncate font-body text-[14px] text-ink">
                          {spell.name}
                        </span>
                        {spell.school && (
                          <span className="block font-body text-[11px] text-muted">
                            {spell.school}
                          </span>
                        )}
                      </span>
                      {!spell.countsAgainstSpellLimit && (
                        <span
                          className="shrink-0 rounded-full border border-wine px-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.08em] text-wine"
                          title="Doesn't count against the character's known/prepared spell limit"
                        >
                          Bonus
                        </span>
                      )}
                      {/* The mode is a label, never flattened to prepared /
                          not prepared — "Pact Magic" and "At Will" are
                          different facts about how the spell works. */}
                      <span className="shrink-0 font-body text-[11px] text-muted">
                        {spell.preparationMode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <DetailPanel
        open={!!open}
        title={open?.name ?? ""}
        subtitle={
          open
            ? `${LEVEL_LABEL[open.level] ?? `Level ${open.level}`}${open.school ? ` · ${open.school}` : ""}`
            : undefined
        }
        onClose={() => setOpenId(null)}
      >
        {open && (
          <div className="flex flex-col gap-4">
            <Thumb art={art} path={open.imgPath} size={64} className="rounded-lg" />
            <div>
              <PanelField label="Casting time" value={open.castingTime} />
              <PanelField label="Range" value={open.range} />
              <PanelField label="Components" value={open.components} />
              <PanelField label="Duration" value={open.duration} />
              <PanelField label="Preparation" value={open.preparationMode} />
              <PanelField
                label="Counts against spell limit"
                value={open.countsAgainstSpellLimit ? "Yes" : "No"}
              />
            </div>
            <PanelDescription text={open.description} />
          </div>
        )}
      </DetailPanel>
    </>
  );
}
