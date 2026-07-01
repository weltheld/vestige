"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Link as LinkIcon,
  Lock,
  Plus,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/council/Avatar";
import { Crest } from "@/components/council/Crest";
import { TextField } from "@/components/council/TextField";
import { WaxButton } from "@/components/council/WaxButton";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/basePath";
import {
  createCampaignAction,
  inviteByEmailAction,
  launchCampaignAction,
  toggleInviteExistingUserAction,
} from "./actions";

type LiteUser = {
  id: string;
  email: string;
  displayName: string;
  characterName: string;
  avatarUrl?: string;
};

type CreatedCampaign = { id: string; slug: string; name: string };

export function CampaignWizardClient({
  currentUserEmail,
  otherUsers,
}: {
  currentUserEmail: string;
  otherUsers: LiteUser[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedCampaign | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
  const [emailInvites, setEmailInvites] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isCreated = !!created;
  const signUpLink = created
    ? `${typeof window === "undefined" ? "" : window.location.origin}${withBasePath(`/login?next=/g/${created.slug}`)}`
    : "Create campaign to generate link";

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCampaignAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreated({ id: result.id, slug: result.slug, name: result.name });
    });
  }

  function onToggleUser(userId: string) {
    if (!created) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleInviteExistingUserAction(created.id, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInvitedUserIds((prev) => {
        const next = new Set(prev);
        if (result.invited) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
  }

  function onAddEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!created) return;
    setError(null);
    startTransition(async () => {
      const result = await inviteByEmailAction(created.id, emailDraft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmailInvites((prev) => [...prev, emailDraft.trim().toLowerCase()]);
      setEmailDraft("");
    });
  }

  function onLaunch() {
    if (!created) return;
    setError(null);
    startTransition(async () => {
      const result = await launchCampaignAction(created.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/g/${result.slug}`);
      router.refresh();
    });
  }

  return (
    <div className="relative min-h-screen bg-parchment">
      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex flex-col items-center text-center gap-2">
          <Crest size={48} />
          <p className="small-caps">
            Calendar · signed in as {currentUserEmail}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-ink">
            Forge a campaign-poll
          </h1>
        </header>

        {error && (
          <p className="rounded-md border border-vote-no/40 bg-vote-no/10 px-4 py-2 text-sm text-vote-no">
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Campaign Form */}
          <section className="rounded-card border border-hairline bg-surface p-6 sm:p-8 shadow-parchment">
            <Pill icon={ScrollText} label="Step 1 · Campaign" />

            <h2 className="mt-4 font-display text-2xl text-ink">
              {isCreated
                ? `${created!.name} is ready for invites`
                : "Create a campaign-poll"}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {isCreated
                ? "The creator owns the invite controls before the voting calendar opens."
                : "Start with a campaign name. Invites can be prepared immediately after creation."}
            </p>

            <form onSubmit={onCreate} className="mt-5 space-y-4">
              <TextField
                label="Campaign name"
                placeholder="Ashes of June"
                value={isCreated ? created!.name : name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreated || pending}
                required
              />

              <div className="flex items-start gap-2 rounded-md border border-dm-gold/30 bg-dm-gold/10 px-3 py-2.5">
                <Lock className="mt-0.5 h-4 w-4 flex-none text-dm-gold" />
                <p className="text-xs text-ink-soft">
                  Only the campaign creator can generate links or add existing
                  users before launch.
                </p>
              </div>

              {!isCreated ? (
                <WaxButton
                  type="submit"
                  className="w-full justify-center"
                  disabled={pending}
                >
                  {pending ? "Forging..." : "Create campaign-poll"}
                </WaxButton>
              ) : (
                <WaxButton
                  type="button"
                  onClick={onLaunch}
                  className="w-full justify-center"
                  disabled={pending}
                >
                  {pending ? "Launching..." : "Launch campaign-poll \u2192"}
                </WaxButton>
              )}

              <div className="rounded-md border border-hairline/70 bg-parchment/40 px-3 py-2.5">
                <p className="small-caps">
                  {isCreated ? "Ready to launch" : "Starting state"}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {isCreated
                    ? "Campaign saved. Launch dispatches magic-link invitations and opens the voting view."
                    : "No calendar votes yet. The next step creates invite options without entering the voting view."}
                </p>
              </div>
            </form>
          </section>

          {/* Right: Invite Panel */}
          <section
            className={cn(
              "rounded-card border border-hairline bg-surface p-6 sm:p-8 shadow-parchment transition",
              !isCreated && "opacity-90",
            )}
          >
            <Pill icon={Sparkles} label="Creator-only invites" />
            <h2 className="mt-4 font-display text-2xl text-ink">
              Invite participants
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {isCreated
                ? "Add anyone by email \u2014 they'll get a magic-link email on launch. Or pick from registered users below."
                : "Invite tools appear here as soon as the campaign-poll is created."}
            </p>

            <div className="mt-5 space-y-2">
              <p className="small-caps">New participants · Sign-up link</p>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-2.5 font-mono text-sm",
                    isCreated
                      ? "border-hairline bg-surface/80 text-wine"
                      : "border-hairline bg-parchment/40 text-ink-soft/70",
                  )}
                >
                  <LinkIcon className="h-4 w-4 flex-none text-dm-gold" />
                  <span className="min-w-0 flex-1 truncate">{signUpLink}</span>
                </div>
                <button
                  type="button"
                  disabled={!isCreated}
                  onClick={() => {
                    if (!isCreated) return;
                    navigator.clipboard?.writeText(signUpLink);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                  className={cn(
                    "inline-flex h-10 flex-none items-center gap-1.5 rounded-md px-4 font-display text-xs tracking-wider uppercase",
                    isCreated
                      ? "bg-wine text-parchment hover:bg-wine/90"
                      : "bg-parchment/60 text-ink-soft/60 cursor-not-allowed",
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCreated && (
              <form onSubmit={onAddEmail} className="mt-4 space-y-2">
                <p className="small-caps">Invite by email</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      type="email"
                      placeholder="adventurer@example.com"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                    />
                  </div>
                  <WaxButton type="submit" variant="outline" disabled={pending}>
                    Add
                  </WaxButton>
                </div>
                {emailInvites.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {emailInvites.map((e) => (
                      <li
                        key={e}
                        className="rounded-full border border-hairline bg-parchment/50 px-3 py-1 text-xs text-ink-soft"
                      >
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
              </form>
            )}

            <div className="mt-6 space-y-2">
              <p className="small-caps">Existing platform users</p>
              {!isCreated ? (
                <div className="rounded-md border border-hairline/70 bg-parchment/40 p-5 text-center">
                  <Users className="mx-auto h-6 w-6 text-dm-gold" />
                  <p className="mt-2 font-display text-sm text-ink">
                    No invitees selected yet
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Registered users can be selected after the campaign-poll
                    exists.
                  </p>
                </div>
              ) : otherUsers.length === 0 ? (
                <div className="rounded-md border border-hairline/70 bg-parchment/40 p-5 text-center text-sm text-ink-soft">
                  No other registered users yet. Use the email invite above.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {otherUsers.map((u) => {
                    const selected = invitedUserIds.has(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onToggleUser(u.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition",
                            selected
                              ? "border-vote-yes/40 bg-vote-yes/10"
                              : "border-hairline/60 bg-surface/60 hover:bg-parchment/40",
                            pending && "opacity-60",
                          )}
                        >
                          <Avatar src={u.avatarUrl} alt={u.displayName} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">
                              {u.displayName || u.characterName || u.email}
                            </p>
                            <p className="truncate text-xs text-ink-soft">{u.email}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
                              selected
                                ? "bg-vote-yes text-parchment"
                                : "border-2 border-dm-gold/40 text-dm-gold",
                            )}
                          >
                            {selected ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Pill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-dm-gold/15 px-3 py-1 text-[11px] font-display tracking-wider uppercase text-dm-gold">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
