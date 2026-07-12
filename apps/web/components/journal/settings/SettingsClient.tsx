"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ImagePlus, Loader2, Copy, Check, VenetianMask, LogOut } from "lucide-react";
import type { CampaignSettings } from "@/lib/journal/campaign-settings";
import type { ManageData } from "@/lib/manage";
import { journal } from "@/lib/journal/links";
import {
  renameCampaign,
  setCampaignCover,
  setMemberDm,
  deleteCampaign,
  leaveCampaign,
} from "@/app/journal/c/[campaignId]/settings/actions";
import {
  sendInvite,
  cancelInvite,
  resendInvite,
  addExistingMember,
  removeMember,
} from "@/app/app/c/[campaignId]/manage/actions";
import { pickImageFile, uploadCampaignBanner } from "@/lib/journal/upload";
import { FamiliarSettings } from "./FamiliarSettings";
import { AiKeySettings } from "./AiKeySettings";

type TabKey = "campaign" | "players" | "familiar" | "codex";

type Props = {
  settings: CampaignSettings;
  /** Invites/roster data (the former Manage-campaign surface). */
  manage: ManageData;
  magicLink: string;
  /**
   * "page" (default) — the standalone route, reached by a direct visit.
   * "modal" — rendered by the `(.)settings` intercepted route, as a layer
   * above the current Journal page (blurred backdrop + close-X), matching
   * the platform's "Edit profile" overlay.
   */
  variant?: "page" | "modal";
};

/**
 * The merged campaign Settings layer — one dialog, four tabs:
 * Campaign / Players & Invites / Familiar / Codex. Absorbs the former
 * standalone Manage-campaign screen (invites, join code, roster) so there
 * is a single "Settings" entry point. Non-creators get the first two tabs
 * read-only (plus Leave); Familiar and Codex are creator-only.
 */
export function SettingsClient({ settings, manage, magicLink, variant = "page" }: Props) {
  const router = useRouter();
  const { id, isCreator } = settings;
  const [tab, setTab] = useState<TabKey>("campaign");
  const close = () => (variant === "modal" ? router.back() : router.push(journal.campaign(id)));

  const TABS: Array<{ key: TabKey; label: string; creatorOnly?: boolean }> = [
    { key: "campaign", label: "Campaign" },
    { key: "players", label: "Players & Invites" },
    { key: "familiar", label: "Familiar", creatorOnly: true },
    { key: "codex", label: "Codex", creatorOnly: true },
  ];
  const visibleTabs = TABS.filter((t) => !t.creatorOnly || isCreator);

  const card = (
    <div className="relative w-full max-w-[620px] rounded-xl border border-hairline bg-surface p-8 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.35)] sm:p-10">
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
        <h1 className="font-display text-2xl text-ink">{settings.name || "Campaign"}</h1>
        <p className="font-body text-xs text-muted">Settings</p>
      </header>

      {/* Tab bar — same segmented-track chrome as the header's module
          switcher, so it reads as the platform's one tab idiom. */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))] p-[3px]">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-body text-[13px] transition ${
                tab === t.key
                  ? "bg-surface font-medium text-wine shadow-[0_1px_2px_rgba(43,33,24,0.14)]"
                  : "text-ink-soft hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] hover:text-wine"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        {tab === "campaign" && <CampaignTab settings={settings} />}
        {tab === "players" && (
          <PlayersTab settings={settings} manage={manage} magicLink={magicLink} />
        )}
        {tab === "familiar" && isCreator && settings.familiar && (
          <FamiliarSettings campaignId={id} connection={settings.familiar} />
        )}
        {tab === "codex" && isCreator && (
          <div className="flex flex-col gap-3">
            <SectionLabel>AI summaries</SectionLabel>
            <AiKeySettings campaignId={id} current={settings.ai} />
          </div>
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

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-parchment px-4 py-10 sm:px-8">
      {card}
    </div>
  );
}

/* ─── Campaign tab — name, banner, danger zone ──────────────────────── */

function CampaignTab({ settings }: { settings: CampaignSettings }) {
  const router = useRouter();
  const { id, isCreator } = settings;
  const [name, setName] = useState(settings.name);
  const [coverUrl, setCoverUrl] = useState(settings.coverUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      setCoverError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SectionLabel>Campaign name</SectionLabel>
        <div className="flex items-center gap-3">
          <input
            value={name}
            disabled={!isCreator}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border-b border-hairline bg-transparent py-1 font-body text-[16px] text-ink outline-none disabled:opacity-60"
          />
          {isCreator && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await renameCampaign(id, name.trim());
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Campaign banner</SectionLabel>
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
            {uploadingCover ? (
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-[12px] text-white">
                <Loader2 size={15} className="animate-spin" /> Uploading…
              </div>
            ) : !coverUrl && isCreator ? (
              <span className="flex flex-col items-center gap-1 text-muted">
                <ImagePlus size={20} />
                <span className="font-body text-[11px] italic">Add a banner</span>
              </span>
            ) : (
              isCreator && (
                <div className="absolute inset-0 hidden items-center justify-center gap-1.5 bg-black/40 text-[12px] text-white group-hover:flex">
                  <ImagePlus size={14} /> Change
                </div>
              )
            )}
          </button>
          {coverError && <p className="font-body text-[12px] text-vote-no">{coverError}</p>}
        </div>
      </section>

      {isCreator ? (
        <section className="flex flex-col gap-3 border-t border-hairline pt-5">
          <SectionLabel tone="wine">Danger zone</SectionLabel>
          <button
            type="button"
            onClick={async () => {
              if (
                !window.confirm(
                  `Permanently delete "${name}" and all its sessions? This cannot be undone.`,
                )
              )
                return;
              await deleteCampaign(id);
            }}
            className="self-start font-body text-[13px] text-wine underline underline-offset-2"
          >
            Delete campaign
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-3 border-t border-hairline pt-5">
          <SectionLabel tone="wine">Leave campaign</SectionLabel>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Leave "${name}"? You'll need a new invite or join code to come back.`))
                return;
              await leaveCampaign(id);
            }}
            className="inline-flex items-center gap-2 self-start font-body text-[13px] text-wine underline underline-offset-2"
          >
            <LogOut size={13} />
            Leave campaign
          </button>
        </section>
      )}
    </div>
  );
}

/* ─── Players & Invites tab — roster, pending invites, invite tools ──── */

function PlayersTab({
  settings,
  manage,
  magicLink,
}: {
  settings: CampaignSettings;
  manage: ManageData;
  magicLink: string;
}) {
  const router = useRouter();
  const { id, isCreator } = settings;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okNotice?: string,
  ): Promise<boolean> => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return false;
      }
      if (okNotice) setNotice(okNotice);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SectionLabel>Players ({settings.members.length})</SectionLabel>
        <ul className="flex flex-col gap-2">
          {settings.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3 rounded-md border border-hairline bg-cod-soft px-3 py-2"
            >
              <Avatar url={m.avatarUrl} name={m.name} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-[13px] text-ink">{m.name}</span>
                <span className="truncate font-body text-[11px] text-muted">
                  {m.isDm ? "Dungeon Master" : "Player"}
                  {m.characterName ? ` · ${m.characterName}` : ""}
                </span>
              </span>
              {isCreator ? (
                <>
                  <select
                    value={m.isDm ? "dm" : "player"}
                    disabled={busy}
                    onChange={(e) =>
                      run(async () => {
                        try {
                          await setMemberDm(id, m.userId, e.target.value === "dm");
                          return { ok: true };
                        } catch (err) {
                          return {
                            ok: false,
                            error: err instanceof Error ? err.message : "Could not change the role.",
                          };
                        }
                      })
                    }
                    className="rounded-md border border-hairline bg-transparent px-2 py-1 font-body text-[12px] text-ink-soft"
                  >
                    <option value="player">Player</option>
                    <option value="dm">Dungeon Master</option>
                  </select>
                  {m.userId !== manage.viewerId && (
                    <button
                      type="button"
                      aria-label={`Remove ${m.name}`}
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Remove ${m.name} from this campaign?`)) return;
                        run(() => removeMember(id, m.userId), `${m.name} removed.`);
                      }}
                      className="rounded p-1 text-muted transition hover:bg-vote-no/10 hover:text-vote-no"
                    >
                      <X size={14} />
                    </button>
                  )}
                </>
              ) : (
                m.isDm && (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] uppercase tracking-wider text-gold">
                    <VenetianMask className="h-3.5 w-3.5" /> DM
                  </span>
                )
              )}
            </li>
          ))}
          {isCreator &&
            manage.invitations.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-md border border-hairline bg-cod-soft/60 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar url={i.avatarUrl} name={i.name ?? i.email} />
                  <span className="min-w-0">
                    <span className="block truncate font-body text-[14px] text-ink">
                      {i.name ?? i.email}
                    </span>
                    {i.name && (
                      <span className="block truncate font-body text-[11px] text-muted">{i.email}</span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-display text-[11px] uppercase tracking-wider text-gold">
                    Pending
                  </span>
                  {i.emailInvite && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => resendInvite(id, i.id), "Invitation resent.")}
                      className="font-body text-[11px] text-ink-soft hover:text-ink"
                    >
                      Resend
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => cancelInvite(id, i.id))}
                    className="font-body text-[11px] text-ink-soft hover:text-vote-no"
                  >
                    Cancel
                  </button>
                </span>
              </li>
            ))}
        </ul>
      </section>

      {isCreator && (
        <>
          <section className="flex flex-col gap-2">
            <SectionLabel>Invite via magic link</SectionLabel>
            <CopyRow value={magicLink} mono />
            <p className="font-body text-[11px] text-muted">
              Anyone with this link can sign in by email and join.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <SectionLabel>Invite via code</SectionLabel>
            <CopyRow value={manage.joinCode} mono wide={false} />
            <p className="font-body text-[11px] text-muted">
              Anyone can enter this code on their Vestige home screen to join — no email needed.
            </p>
          </section>

          {manage.addableUsers.length > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <SectionLabel>Add a player you invited</SectionLabel>
                <p className="mt-1 font-body text-[11px] text-muted">
                  These people signed up but aren&apos;t in any campaign yet.
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {manage.addableUsers.map((u) => (
                  <li
                    key={u.userId}
                    className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-cod-soft px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar url={u.avatarUrl} name={u.name || u.email} />
                      <span className="min-w-0">
                        <span className="block truncate font-body text-[14px] text-ink">
                          {u.name || u.email}
                        </span>
                        {u.name && (
                          <span className="block truncate font-body text-[11px] text-muted">
                            {u.email}
                          </span>
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => addExistingMember(id, u.userId), "Player added.")}
                      className="rounded-md border border-hairline px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-parchment hover:text-ink"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => sendInvite(id, email), "Invitation sent.").then((ok) => {
                if (ok) setEmail("");
              });
            }}
            className="flex flex-col gap-2"
          >
            <SectionLabel>Invite via e-mail</SectionLabel>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adventurer@example.com"
                className="h-11 flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 font-body text-ink outline-none transition focus:border-gold"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-11 rounded-lg bg-wine px-5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </>
      )}

      {error && (
        <p className="rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 font-body text-[12px] text-vote-no">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="rounded-md border border-vote-yes/40 bg-vote-yes/10 px-3 py-2 font-body text-[12px] text-vote-yes">
          {notice}
        </p>
      )}
    </div>
  );
}

/* ─── Shared bits ───────────────────────────────────────────────────── */

function SectionLabel({ children, tone }: { children: React.ReactNode; tone?: "wine" }) {
  return (
    <h2
      className={`font-display text-[11px] font-semibold uppercase tracking-[0.1em] ${
        tone === "wine" ? "text-wine" : "text-muted"
      }`}
    >
      {children}
    </h2>
  );
}

function CopyRow({ value, mono, wide = true }: { value: string; mono?: boolean; wide?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        className={`h-11 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 text-ink ${
          wide ? "flex-1" : "w-32 text-center uppercase tracking-widest"
        } ${mono ? "font-mono text-[12px]" : "font-body text-[13px]"}`}
      />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex h-11 items-center gap-1.5 rounded-md border border-hairline px-4 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink"
      >
        {copied ? <Check size={14} className="text-vote-yes" /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[12px] text-white">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
