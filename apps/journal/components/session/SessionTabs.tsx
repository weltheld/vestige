"use client";

import { useState } from "react";

type Tab = "recap" | "comments" | "changelog";

export function SessionTabs({
  recap,
  commentCount,
  revisionCount,
}: {
  recap: React.ReactNode;
  commentCount: number;
  revisionCount: number;
}) {
  const [tab, setTab] = useState<Tab>("recap");

  const tabs: { key: Tab; label: string }[] = [
    { key: "recap", label: "Recap" },
    { key: "comments", label: `Comments (${commentCount})` },
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
      {tab === "comments" && <TabStub label="Comments" milestone={7} />}
      {tab === "changelog" && <TabStub label="Change Log" milestone={7} />}
    </div>
  );
}

function TabStub({ label, milestone }: { label: string; milestone: number }) {
  return (
    <div className="pt-10 text-center">
      <p className="font-body text-sm italic text-muted">
        {label} — built in Milestone {milestone}.
      </p>
    </div>
  );
}
