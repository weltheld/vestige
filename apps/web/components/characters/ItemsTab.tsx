"use client";

import { useState } from "react";
import type { SheetItem, SheetItemType } from "@vestige/db";
import { DetailPanel, PanelDescription, PanelField } from "./DetailPanel";

/** Group order and headings. Foundry's `type` is the grouping key, so this
 *  stays in step with whatever the export actually contained. */
const GROUPS: Array<{ type: SheetItemType; label: string }> = [
  { type: "weapon", label: "Weapons" },
  { type: "equipment", label: "Armour & equipment" },
  { type: "consumable", label: "Consumables" },
  { type: "tool", label: "Tools" },
  { type: "container", label: "Containers" },
  { type: "loot", label: "Loot" },
];

/** Rarity is the one place the sheet uses colour to mean something. Kept to
 *  the theme's own tokens rather than the usual VTT rainbow, which would fight
 *  the parchment palette. */
const RARITY_CLASS: Record<string, string> = {
  common: "text-muted",
  uncommon: "text-vote-yes",
  rare: "text-wine",
  "very rare": "text-wine",
  legendary: "text-gold",
  artifact: "text-gold",
};

export function ItemsTab({ items }: { items: SheetItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((i) => i.id === openId) ?? null;

  if (items.length === 0) {
    return <Empty>Nothing carried. Items appear here after an import that includes them.</Empty>;
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {GROUPS.map(({ type, label }) => {
          const group = items.filter((i) => i.type === type);
          if (group.length === 0) return null;
          return (
            <section key={type}>
              <GroupHeading label={label} count={group.length} />
              <ul className="flex flex-col rounded-xl bg-cod-soft px-4 py-1.5">
                {group.map((item) => (
                  <li key={item.id} className="border-b border-hairline last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenId(item.id)}
                      aria-expanded={openId === item.id}
                      className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-80"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-body text-[14px] text-ink">
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <span className="shrink-0 font-body text-[12px] text-muted">
                              ×{item.quantity}
                            </span>
                          )}
                          {item.equipped && (
                            <span className="shrink-0 rounded-full border border-gold px-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                              Equipped
                            </span>
                          )}
                        </span>
                        {item.rarity && (
                          <span
                            className={`font-body text-[11px] capitalize ${
                              RARITY_CLASS[item.rarity.toLowerCase()] ?? "text-muted"
                            }`}
                          >
                            {item.rarity}
                          </span>
                        )}
                      </span>
                      {item.weight > 0 && (
                        <span className="shrink-0 font-body text-[12px] tabular-nums text-muted">
                          {round(item.weight * item.quantity)} lb
                        </span>
                      )}
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
        subtitle={open ? subtitle(open) : undefined}
        onClose={() => setOpenId(null)}
      >
        {open && (
          <div className="flex flex-col gap-4">
            <div>
              {open.damage && (
                <PanelField
                  label="Damage"
                  value={`${open.damage.formula}${open.damage.type ? ` ${open.damage.type}` : ""}`}
                />
              )}
              {open.properties && open.properties.length > 0 && (
                <PanelField
                  label="Properties"
                  value={<span className="capitalize">{open.properties.join(", ")}</span>}
                />
              )}
              <PanelField label="Quantity" value={String(open.quantity)} />
              {open.weight > 0 && <PanelField label="Weight" value={`${round(open.weight)} lb each`} />}
              {open.rarity && (
                <PanelField label="Rarity" value={<span className="capitalize">{open.rarity}</span>} />
              )}
              <PanelField label="Equipped" value={open.equipped ? "Yes" : "No"} />
            </div>
            <PanelDescription text={open.description} />
          </div>
        )}
      </DetailPanel>
    </>
  );
}

function subtitle(item: SheetItem): string {
  const group = GROUPS.find((g) => g.type === item.type);
  return group ? group.label.replace(/s$/, "") : item.type;
}

/** Foundry weights carry floating-point noise (0.30000000000000004). */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function GroupHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5 pb-2">
      <span className="h-3.5 w-0.5 bg-gold" />
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </h2>
      <span className="font-body text-[11px] text-muted">{count}</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-cod-soft px-5 py-8 text-center font-body text-[13px] italic text-muted">
      {children}
    </p>
  );
}
