"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ImagePlus, Loader2 } from "lucide-react";
import type { CampaignSettings } from "@/lib/campaign-settings";
import { journal } from "@/lib/links";
import {
  renameCampaign,
  setCampaignCover,
  setMemberDm,
  removeMember,
  inviteMembers,
  deleteCampaign,
} from "@/app/c/[campaignId]/settings/actions";
import { pickImageFile, uploadCampaignBanner } from "@/lib/upload";
import { FamiliarSettings } from "./FamiliarSettings";

type Props = {
  settings: CampaignSettings;
  /**
   * "page" (default) — the standalone route, reached by a direct/cross-zone
   * visit. "modal" — rendered by the `(.)settings` intercepted route, as a
   * layer above the current Journal page (blurred backdrop + close-X),
   * matching the platform's "Edit profile" overlay. Only same-zone (Journal
   * → Journal) navigations can trigger the modal — Next.js route
   * interception doesn't cross Multi-Zones apps, so entering from Calendar
   * or Web always lands on the plain page instead.
   */
  variant?: "page" | "modal";
};

export function SettingsClient({ settings, variant = "page" }: Props) {
  const router = useRouter();
  const { id, isCreator } = settings;
  const [name, setName] = useState(settings.name);
  const [invites, setInvites] = useState("");
  const [coverUrl, setCoverUrl] = useState(settings.coverUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const refresh = () => router.refresh();
  const close = () => (variant === "modal" ? router.back() : router.push(journal.campaign(id)));

  async function changeCover() {
    const file = await pickImageFile();
    if (!file) return;
    setCoverError(null);
    setUploadingCover(true);
    try {
      const url = await uploadCampaignBanner(id, file);
      await setCampaignCover(id, url);
      setCoverUrl(url);
    } catch (err) {
      // Surface the real reason instead of silently doing nothing — the old
      // hover-only "Uploading…" hint made a failed upload look like a no-op,
      // especially on touch devices where there is no hover.
      setCoverError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  }

  const card = (
    // Same card chrome, header pattern (centered "Vestige" eyebrow + title),
    // and corner close-X as the platform's "Edit profile" overlay — the two
    // should read as the same family of layer regardless of which is open.
    <div className="relative w-full max-w-[560px] rounded-xl border border-hairline bg-surface p-8 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.35)] sm:p-10">
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-cod-soft hover:text-ink"
      >
        <X className="h-5 w-5" />
      </button>

      <header className="flex flex-col items-center gap-1 text-center">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Vestige
        </p>
        <h1 className="font-display text-2xl text-ink">{name || "Campaign"}</h1>
        <p className="font-body text-xs text-muted">Campaign settings</p>
      </header>

      <div className="mt-6 flex flex-col gap-7">
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
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!isCreator || uploadingCover}
              onClick={changeCover}
              className="group relative flex h-[120px] w-[200px] items-center justify-center overflow-hidden rounded-lg border border-hairline bg-cod-soft disabled:cursor-default"
            >
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              )}

              {/* Uploading state — always visible (not hover-gated), so it
                  gives feedback on touch devices too. */}
              {uploadingCover ? (
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-[12px] text-white">
                  <Loader2 size={15} className="animate-spin" /> Uploading…
                </div>
              ) : !coverUrl && isCreator ? (
                // Empty-state affordance so it's obviously an upload target
                // even without hover.
                <span className="flex flex-col items-center gap-1 text-muted">
                  <ImagePlus size={20} />
                  <span className="font-body text-[11px] italic">Add a cover</span>
                </span>
              ) : (
                isCreator && (
                  <div className="absolute inset-0 hidden items-center justify-center gap-1.5 bg-black/40 text-[12px] text-white group-hover:flex">
                    <ImagePlus size={14} /> Change
                  </div>
                )
              )}
            </button>
            {coverError && (
              <p className="font-body text-[12px] text-vote-no">{coverError}</p>
            )}
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

        {isCreator && settings.familiar && (
          <>
            <Divider />
            <Section label="Familiar — auto-recaps">
              <FamiliarSettings campaignId={id} connection={settings.familiar} />
            </Section>
          </>
        )}

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
    </div>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <button
          aria-label="Close"
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
          onClick={close}
        />
        {card}
      </div>
    );
  }

  // Direct/cross-zone visit — full page, but the same centered-card look
  // (matching ManageCampaignPage's own standalone-page wrapper).
  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-parchment px-4 py-10 sm:px-8">
      {card}
    </div>
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
