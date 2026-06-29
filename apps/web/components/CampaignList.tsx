import Link from "next/link";
import { CalendarDays, ScrollText, Shield } from "lucide-react";
import type { CampaignSummary } from "@vestige/domain";

export function CampaignList({ campaigns }: { campaigns: CampaignSummary[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-hairline bg-parchment/40 p-10 text-center">
        <p className="font-display text-lg text-ink">No campaigns yet</p>
        <p className="mt-1 font-body text-sm text-ink-soft">
          When you create or join a campaign, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {campaigns.map((c) => (
        <li key={c.id}>
          <Link
            href={`/app/c/${c.id}`}
            className="block rounded-card border border-hairline bg-parchment/60 p-5 shadow-parchment transition hover:border-gold"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl text-ink">{c.name}</h3>
              {c.viewerIsDm && (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface px-2 py-0.5 font-body text-xs text-dm-gold">
                  <Shield size={12} /> DM
                </span>
              )}
            </div>
            {c.description && (
              <p className="mt-1.5 line-clamp-2 font-body text-sm text-ink-soft">
                {c.description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2">
              {c.modulesEnabled.calendar && (
                <ModuleChip icon={<CalendarDays size={13} />} label="Calendar" />
              )}
              {c.modulesEnabled.journal && (
                <ModuleChip icon={<ScrollText size={13} />} label="Journal" />
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ModuleChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-hairline bg-surface px-2.5 py-1 font-body text-xs text-ink-soft">
      {icon}
      {label}
    </span>
  );
}
