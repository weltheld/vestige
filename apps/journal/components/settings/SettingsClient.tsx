"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, CalendarDays, BookOpen, ImagePlus } from "lucide-react";
import { PageTitle } from "@vestige/ui";
import type { CampaignSettings } from "@/lib/campaign-settings";
import { journal } from "@/lib/links";
import {
  renameCampaign,
  setMemberDm,
  removeMember,
  inviteMembers,
  setModules,
  deleteCampaign,
} from "@/app/c/[campaignId]/settings/actions";

export function SettingsClient({ settings }: { settings: CampaignSettings }) {
  const router = useRouter();
  const { id, isCreator } = settings;
  const [name, setName] = useState(settings.name);
  const [modules, setLocalModules] = useState(settings.modulesEnabled);
  const [invites, setInvites] = useState("");
  const refresh = () => router.refresh();

  async function toggleModule(key: "calendar" | "journal") {
    const next = { ...modules, [key]: !modules[key] };
    if (key === "calendar" && modules.calendar) {
      const ok = window.confirm(
        "Disabling the Calendar will hide all polls and scheduling for this campaign. Existing data is preserved. Continue?",
      );
      if (!ok) return;
    }
    setLocalModules(next);
    await setModules(id, next);
    refresh();
  }

  return (
    <main className="mx-auto mt-20 w-full max-w-[720px] px-6 pb-24">
      <div className="flex flex-col gap-7 rounded-2xl bg-surface p-10">
        <div className="flex items-center justify-between">
          <PageTitle title={name || "Campaign"} />
          <Link
            href={journal.campaign(id)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-hairline text-ink-soft hover:text-wine"
          >
            <X size={18} />
          </Link>
        </div>

        {!isCreator && (
          <p className="rounded-[10px] bg-cod-soft px-3.5 py-3 font-body text-[12px] italic text-ink-soft">
            Only the campaign creator can change these settings.
          </p>
        )}

        <Section label="Campaign Name">
          <div className="flex items-center gap-3">
            <input
              value={name}
              disabled={!isCreator}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 border-b border-hairline bg-transparent py-1 font-body text-[16px] text-ink outline-none disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!isCreator}
              onClick={async () => {
                await renameCampaign(id, name.trim());
                refresh();
              }}
              className="rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Section>

        <Divider />
        <Section label="Campaign Cover">
          <div className="group relative h-[100px] w-[140px] overflow-hidden rounded-lg bg-cod-soft">
            {settings.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 hidden items-center justify-center bg-black/40 text-[11px] text-white group-hover:flex">
              <ImagePlus size={14} className="mr-1" /> Change
            </div>
          </div>
        </Section>

        <Divider />
        <Section label={`Members (${settings.members.length})`}>
          <div className="flex flex-col">
            {settings.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-wine text-[12px] text-parchment">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    m.name.charAt(0)
                  )}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-display text-[13px] text-ink">{m.name}</span>
                  <span className="font-body text-[11px] text-muted">
                    {m.isDm ? "Dungeon Master" : "Player"}
                    {m.characterName ? ` · ${m.characterName}` : ""}
                  </span>
                </span>
                {isCreator && (
                  <>
                    <select
                      value={m.isDm ? "dm" : "player"}
                      onChange={async (e) => {
                        await setMemberDm(id, m.userId, e.target.value === "dm");
                        refresh();
                      }}
                      className="rounded-md border border-hairline bg-transparent px-2 py-1 font-body text-[12px] text-ink-soft"
                    >
                      <option value="player">Player</option>
                      <option value="dm">Dungeon Master</option>
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Remove ${m.name} from this campaign?`)) return;
                        await removeMember(id, m.userId);
                        refresh();
                      }}
                      className="font-body text-[11px] text-muted hover:text-vote-no"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          {isCreator && (
            <div className="mt-3 flex items-center gap-3">
              <input
                value={invites}
                onChange={(e) => setInvites(e.target.value)}
                placeholder="Add emails, separated by commas"
                className="flex-1 border-b border-hairline bg-transparent py-1 font-body text-[13px] text-ink outline-none placeholder:text-muted"
              />
              <button
                type="button"
                onClick={async () => {
                  await inviteMembers(id, invites.split(","));
                  setInvites("");
                  refresh();
                }}
                className="rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
              >
                Send invites
              </button>
            </div>
          )}
        </Section>

        <Divider />
        <Section label="Modules">
          <div className="flex gap-4">
            <ModuleToggle
              icon={<CalendarDays size={18} />}
              label="Calendar"
              on={modules.calendar}
              disabled={!isCreator}
              onToggle={() => toggleModule("calendar")}
            />
            <ModuleToggle
              icon={<BookOpen size={18} />}
              label="Journal"
              on={modules.journal}
              disabled={!isCreator}
              onToggle={() => toggleModule("journal")}
            />
          </div>
        </Section>

        {isCreator && (
          <>
            <Divider />
            <Section label="Danger Zone" tone="wine">
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Permanently delete "${name}" and all its sessions? This cannot be undone.`)) return;
                  await deleteCampaign(id);
                }}
                className="font-body text-[13px] text-wine underline underline-offset-2"
              >
                Delete campaign
              </button>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "wine";
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2
        className={`font-display text-[11px] font-semibold uppercase tracking-[0.1em] ${tone === "wine" ? "text-wine" : "text-muted"}`}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="h-px bg-hairline" />;
}

function ModuleToggle({
  icon,
  label,
  on,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`flex flex-1 items-center gap-3 rounded-xl border p-4 text-left transition ${
        on ? "border-gold bg-[#faf5e6]" : "border-hairline bg-surface opacity-70"
      } disabled:cursor-default`}
    >
      <span className={on ? "text-gold" : "text-muted"}>{icon}</span>
      <span className="flex flex-1 flex-col">
        <span className="font-display text-[14px] text-ink">{label}</span>
        <span className="font-body text-[11px] text-muted">{on ? "Enabled" : "Disabled"}</span>
      </span>
      <span className={`h-5 w-9 rounded-full p-0.5 ${on ? "bg-wine" : "bg-hairline"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
