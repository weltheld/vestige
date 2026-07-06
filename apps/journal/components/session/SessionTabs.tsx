"use client";

import { useState } from "react";

type Tab = "recap" | "changelog";

export function SessionTabs({
  recap,
  changelog,
  revisionCount,
}: {
  recap: React.ReactNode;
  changelog: React.ReactNode;
  revisionCount: number;
}) {
  const [tab, setTab] = useState<Tab>("recap");

  const tabs: { key: Tab; label: string }[] = [
    { key: "recap", label: "Recap" },
    { key: "changelog", label: `Change Log (${revisionCount})` },
  ];

  return (
    <div className="w-full max-w-[640px]">
      <div className="flex border-b border-hairline">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={[
                "relative px-[18px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] transition",
                active ? "text-ink" : "text-muted hover:text-ink-soft",
              ].join(" ")}
            >
              {t.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" />}
            </button>
          );
        })}
      </div>

      {tab === "recap" && recap}
      {tab === "changelog" && changelog}
    </div>
  );
}
