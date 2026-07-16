"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModuleBottomNav } from "@vestige/ui";
import { PlatformHeader } from "@/components/council/PlatformHeader";
import { PlatformFooter } from "@/components/council/PlatformFooter";
import { CalendarPanel } from "@/components/council/CalendarPanel";
import { QuickFillBar } from "@/components/council/QuickFillBar";
import { BannerParty } from "@/components/council/BannerParty";
import { CharacterDialog } from "@/components/council/CharacterDialog";
import type { CalendarDay } from "@/lib/calendar/calendar";
import { buildMonthGrid, isoDate } from "@/lib/calendar/calendar";
import type {
  Group,
  Member,
  User,
  Vote,
  VoteValue,
  Weekday,
} from "@/lib/calendar/types";
import { cn } from "@/lib/calendar/utils";
import { getBrowserSupabase } from "@vestige/db/client";
import { setSessionAction } from "@/app/calendar/g/[slug]/sessionActions";

type MemberWithUser = Member & { user: User };

type Props = {
  group: Group;
  members: MemberWithUser[];
  votes: Vote[];
  currentUser: User;
  /** ISO dates marked as game sessions. */
  sessionDates: string[];
  /** Play-dates from the user's OTHER campaigns (date → which campaign). */
  crossSessions: { date: string; campaignName: string }[];
  /** The user's own votes in OTHER campaigns (for the align overlay). */
  crossVotes: { date: string; value: VoteValue; campaignName: string }[];
  /** All campaigns this user belongs to, for the header's campaign switcher. */
  switcherCampaigns: { id: string; slug: string; name: string; imageUrl: string | null }[];
};

export function GroupViewClient(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [group, setGroup] = useState(props.group);
  const [votes, setVotes] = useState<Vote[]>(props.votes);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [bestDayIso, setBestDayIso] = useState<string | null>(null);
  const [currentMonthDays, setCurrentMonthDays] = useState<CalendarDay[]>(
    () => { const d = new Date(); return buildMonthGrid(d.getFullYear(), d.getMonth()); }
  );
  const [sessions, setSessions] = useState<Set<string>>(
    () => new Set(props.sessionDates),
  );
  useEffect(
    () => setSessions(new Set(props.sessionDates)),
    [props.sessionDates],
  );

  // Cross-campaign overlays. Conflicts (other campaigns' play-dates) are
  // always shown; the align overlay (my yes/maybe elsewhere) is toggled.
  const [showAlign, setShowAlign] = useState(false);
  const [showVotes, setShowVotes] = useState(true);
  const conflictByDate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of props.crossSessions) {
      const arr = m.get(s.date) ?? [];
      if (!arr.includes(s.campaignName)) arr.push(s.campaignName);
      m.set(s.date, arr);
    }
    return m;
  }, [props.crossSessions]);
  const alignByDate = useMemo(() => {
    const m = new Map<string, { value: VoteValue; campaignName: string }[]>();
    for (const v of props.crossVotes) {
      const arr = m.get(v.date) ?? [];
      arr.push({ value: v.value, campaignName: v.campaignName });
      m.set(v.date, arr);
    }
    return m;
  }, [props.crossVotes]);
  const alignCampaignCount = useMemo(
    () => new Set(props.crossVotes.map((v) => v.campaignName)).size,
    [props.crossVotes],
  );

  // Keep local state in sync if the server re-renders with new props
  // (e.g. after router.refresh()).
  useEffect(() => setGroup(props.group), [props.group]);
  useEffect(() => setVotes(props.votes), [props.votes]);

  const supabase = getBrowserSupabase();

  // Auto-decline days the user is already booked for elsewhere. Runs once,
  // and only for future, votable days they haven't already voted on — so it
  // never overwrites a deliberate choice and is fully reversible by clicking.
  const autoNoApplied = useRef(false);
  useEffect(() => {
    if (autoNoApplied.current) return;
    if (props.crossSessions.length === 0) return;
    autoNoApplied.current = true;

    const todayIso = isoDate(new Date());
    const viable = new Set(props.group.viableWeekdays);
    const myVoteDates = new Set(
      props.votes
        .filter((v) => v.userId === props.currentUser.id)
        .map((v) => v.date),
    );
    const toBlock = Array.from(
      new Set(props.crossSessions.map((s) => s.date)),
    ).filter((d) => {
      if (d < todayIso) return false;
      if (myVoteDates.has(d)) return false;
      const [y, mo, da] = d.split("-").map(Number);
      return viable.has(new Date(y, mo - 1, da).getDay() as Weekday);
    });
    if (toBlock.length === 0) return;

    setVotes((prev) => [
      ...prev,
      ...toBlock.map((date) => ({
        groupId: props.group.id,
        userId: props.currentUser.id,
        date,
        value: "no" as VoteValue,
      })),
    ]);
    void supabase.from("votes").upsert(
      toBlock.map((date) => ({
        campaign_id: props.group.id,
        user_id: props.currentUser.id,
        date,
        value: "no" as const,
      })),
      { onConflict: "campaign_id,user_id,date" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.crossSessions]);

  const isCreator = currentUserMatches(props.currentUser.id, group.creatorId);
  const firstName =
    props.currentUser.displayName?.split(" ")[0] ||
    props.currentUser.characterName ||
    props.currentUser.email?.split("@")[0] ||
    "Adventurer";

  // Deep link from the home card's "Edit" button — poll settings live in
  // the platform Settings layer now, so forward there.
  useEffect(() => {
    if (isCreator && searchParams.get("settings") === "open") {
      router.replace(`/journal/c/${group.id}/settings`);
    }
  }, [isCreator, searchParams, router, group.id]);

  const [members, setMembers] = useState(props.members);
  useEffect(() => setMembers(props.members), [props.members]);

  const dmUserIds = members.filter((m) => m.isDm).map((m) => m.userId);
  const nameByUserId = Object.fromEntries(
    members.map((m) => [
      m.userId,
      m.user.characterName || m.user.displayName || m.user.email,
    ]),
  );
  const handleCycle = useCallback(
    async (date: string, current: VoteValue | undefined) => {
      const next: VoteValue | null =
        current === "yes"
          ? "maybe"
          : current === "maybe"
            ? "no"
            : current === "no"
              ? null
              : "yes";

      // Optimistic update.
      setVotes((prev) => {
        const without = prev.filter(
          (v) =>
            !(
              v.groupId === group.id &&
              v.userId === props.currentUser.id &&
              v.date === date
            ),
        );
        return next === null
          ? without
          : [...without, { groupId: group.id, userId: props.currentUser.id, date, value: next }];
      });

      if (next === null) {
        await supabase
          .from("votes")
          .delete()
          .eq("campaign_id", group.id)
          .eq("user_id", props.currentUser.id)
          .eq("date", date);
      } else {
        await supabase.from("votes").upsert(
          {
            campaign_id: group.id,
            user_id: props.currentUser.id,
            date,
            value: next,
          },
          { onConflict: "campaign_id,user_id,date" },
        );
      }
    },
    [supabase, group.id, props.currentUser.id],
  );

  const handleBulkFill = useCallback(
    async (_weekdays: Weekday[], value: VoteValue, isoDates: string[]) => {
      setVotes((prev) => {
        const without = prev.filter(
          (v) =>
            !(
              v.groupId === group.id &&
              v.userId === props.currentUser.id &&
              isoDates.includes(v.date)
            ),
        );
        const added: Vote[] = isoDates.map((date) => ({
          groupId: group.id,
          userId: props.currentUser.id,
          date,
          value,
        }));
        return [...without, ...added];
      });

      if (isoDates.length === 0) return;
      await supabase.from("votes").upsert(
        isoDates.map((date) => ({
          campaign_id: group.id,
          user_id: props.currentUser.id,
          date,
          value,
        })),
        { onConflict: "campaign_id,user_id,date" },
      );
    },
    [supabase, group.id, props.currentUser.id],
  );

  const handleResetMonth = useCallback(
    async (isoDates: string[]) => {
      if (isoDates.length === 0) return;
      const dateSet = new Set(isoDates);
      setVotes((prev) =>
        prev.filter(
          (v) =>
            !(v.userId === props.currentUser.id && dateSet.has(v.date)),
        ),
      );
      await supabase
        .from("votes")
        .delete()
        .eq("campaign_id", group.id)
        .eq("user_id", props.currentUser.id)
        .in("date", isoDates);
    },
    [supabase, group.id, props.currentUser.id],
  );

  // Weekday viability + member roles are edited in the platform Settings
  // layer (Poll / Players & Invites tabs) — no local handlers here anymore.

  // QuickFill handlers for use in the sidebar (need current month days).
  const handleBulkFillFromSidebar = useCallback(
    (weekdays: Weekday[], value: VoteValue) => {
      const set = new Set(weekdays);
      const isoDates = currentMonthDays
        .filter((d) => d.inCurrentMonth && set.has(d.weekday as Weekday))
        .map((d) => d.iso);
      handleBulkFill(weekdays, value, isoDates);
    },
    [currentMonthDays, handleBulkFill],
  );

  const handleResetFromSidebar = useCallback(() => {
    const isoDates = currentMonthDays
      .filter((d) => d.inCurrentMonth)
      .map((d) => d.iso);
    handleResetMonth(isoDates);
  }, [currentMonthDays, handleResetMonth]);

  const handleToggleSession = useCallback(
    async (iso: string) => {
      const willBeSession = !sessions.has(iso);
      // Optimistic update.
      setSessions((prev) => {
        const next = new Set(prev);
        if (willBeSession) next.add(iso);
        else next.delete(iso);
        return next;
      });
      const result = await setSessionAction(group.id, iso, willBeSession);
      if (!result.ok) {
        // Revert on failure.
        setSessions((prev) => {
          const next = new Set(prev);
          if (willBeSession) next.delete(iso);
          else next.add(iso);
          return next;
        });
      }
    },
    [group.id, sessions],
  );

  // After saving the per-campaign character, reflect it immediately in the
  // banner/roster, then resync from the server.
  const handleCharacterSaved = useCallback(
    (name: string, imageUrl: string | null) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === props.currentUser.id
            ? {
                ...m,
                user: {
                  ...m.user,
                  characterName: name,
                  avatarUrl: imageUrl ?? undefined,
                },
              }
            : m,
        ),
      );
      router.refresh();
    },
    [props.currentUser.id, router],
  );

  const me = members.find((m) => m.userId === props.currentUser.id);

  // Sorted members: DMs first.
  const sortedMembers = [...members].sort((a, b) =>
    a.isDm === b.isDm ? 0 : a.isDm ? -1 : 1,
  );

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col",
        `bg-scene-${group.background}`,
      )}
    >
      <div className="relative flex min-h-screen flex-col pb-[calc(58px+env(safe-area-inset-bottom))] lg:pb-0">
        <PlatformHeader
          firstName={firstName}
          email={props.currentUser.email}
          characterName={props.currentUser.characterName}
          displayName={props.currentUser.displayName}
          avatarUrl={props.currentUser.avatarUrl}
          campaign={{ id: group.id, slug: group.slug, name: group.name, imageUrl: group.bannerUrl ?? null }}
          campaigns={props.switcherCampaigns}
          // Poll settings live in the platform Settings layer now (Poll tab).
          onOpenPollSettings={
            isCreator ? () => router.push(`/journal/c/${group.id}/settings`) : undefined
          }
        />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:grid lg:grid-cols-[280px_1fr]">
          {/* Left sidebar: banner + party, quick fill, best day (desktop only) —
              moving the banner + avatars in here (instead of a full-width row
              above the grid) gives the calendar column more room. */}
          <aside className="hidden border-r border-hairline lg:block">
            <div className="flex flex-col gap-4 p-5">
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-xl shadow-parchment",
                  group.bannerUrl ? "aspect-[4/3]" : "flex items-end pb-3 pt-4 min-h-[140px]",
                )}
              >
                {group.bannerUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={group.bannerUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* top scrim for avatars */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-transparent" />
                    {/* bottom scrim for title */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  </>
                )}

                {/* Party avatars — top-left */}
                <div className="absolute left-3 top-3">
                  <BannerParty
                    members={sortedMembers}
                    hasBanner={!!group.bannerUrl}
                    currentUserId={props.currentUser.id}
                    onEditSelf={() => setCharacterOpen(true)}
                  />
                </div>

                {/* Campaign name — bottom-left */}
                {group.bannerUrl ? (
                  <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
                    {/* Always white over the banner image (never the themed
                        surface colour, which goes dark and vanishes on dark
                        photos). Layered shadows keep it legible over any
                        image — light or dark. */}
                    <h1 className="border-l-2 border-dm-gold pl-2.5 font-display text-lg font-bold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.7)]">
                      {group.name}
                    </h1>
                  </div>
                ) : (
                  <h1 className="pl-3 font-display text-lg font-bold leading-tight text-ink">
                    {group.name}
                  </h1>
                )}
              </div>

              <QuickFillBar
                viableWeekdays={group.viableWeekdays}
                onApply={handleBulkFillFromSidebar}
                onReset={handleResetFromSidebar}
                showVotes={showVotes}
                onToggleVotes={() => setShowVotes((v) => !v)}
                showAlign={showAlign}
                onToggleAlign={() => setShowAlign((v) => !v)}
                alignAvailable={alignCampaignCount > 0}
              />

              {/* No settings button here — poll settings live in the
                  platform Settings layer (header menu → Settings → Poll). */}
            </div>
          </aside>

          {/* Calendar column */}
          <div className="flex flex-col">
            {/* Mobile: quick fill directly below the month selector */}
            <div className="lg:hidden">
              <CalendarPanel
                dmUserIds={dmUserIds}
                nameByUserId={nameByUserId}
                myUserId={props.currentUser.id}
                votes={votes}
                viableWeekdays={group.viableWeekdays}
                onCycleDay={handleCycle}
                onBestDayChange={setBestDayIso}
                onDaysChange={setCurrentMonthDays}
                isCreator={isCreator}
                sessionDates={sessions}
                onToggleSession={isCreator ? handleToggleSession : undefined}
                conflictByDate={conflictByDate}
                alignByDate={alignByDate}
                showAlign={showAlign}
                showVotes={showVotes}
                belowHeader={
                  <QuickFillBar
                    viableWeekdays={group.viableWeekdays}
                    onApply={handleBulkFillFromSidebar}
                    onReset={handleResetFromSidebar}
                    showVotes={showVotes}
                    onToggleVotes={() => setShowVotes((v) => !v)}
                    showAlign={showAlign}
                    onToggleAlign={() => setShowAlign((v) => !v)}
                    alignAvailable={alignCampaignCount > 0}
                  />
                }
              />
            </div>
            {/* Desktop calendar (no QuickFillBar inside) */}
            <div className="hidden lg:flex lg:flex-col lg:flex-1">
              <CalendarPanel
                dmUserIds={dmUserIds}
                nameByUserId={nameByUserId}
                myUserId={props.currentUser.id}
                votes={votes}
                viableWeekdays={group.viableWeekdays}
                onCycleDay={handleCycle}
                onBestDayChange={setBestDayIso}
                onDaysChange={setCurrentMonthDays}
                isCreator={isCreator}
                sessionDates={sessions}
                onToggleSession={isCreator ? handleToggleSession : undefined}
                conflictByDate={conflictByDate}
                alignByDate={alignByDate}
                showAlign={showAlign}
                showVotes={showVotes}
              />
            </div>
          </div>

        </main>

        <PlatformFooter />

        <ModuleBottomNav
          active="calendar"
          calendarHref={`/calendar/g/${group.slug}`}
          journalHref={`/journal/c/${group.id}`}
          codexHref={`/journal/c/${group.id}/codex`}
        />

      </div>

      {characterOpen && (
        <CharacterDialog
          campaignId={group.id}
          initialName={
            me?.user.characterName || props.currentUser.characterName || ""
          }
          initialImageUrl={me?.user.avatarUrl ?? props.currentUser.avatarUrl}
          profileImageUrl={props.currentUser.avatarUrl}
          onClose={() => setCharacterOpen(false)}
          onSaved={handleCharacterSaved}
        />
      )}

      {/* Hint: when the data model changes via server actions elsewhere
          (e.g. a new member joins), the parent server component re-runs
          via revalidatePath; this client just receives fresh props. */}
      <RefreshOnFocus onFocus={() => router.refresh()} />
    </div>
  );
}

function currentUserMatches(myId: string, creatorId: string) {
  return myId === creatorId;
}

// The party-votes / campaign-votes view toggles live inside QuickFillBar's
// "Show on calendar" chips now (positive semantics: on = visible).

function RefreshOnFocus({ onFocus }: { onFocus: () => void }) {
  useEffect(() => {
    function visibility() {
      if (document.visibilityState === "visible") onFocus();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [onFocus]);
  return null;
}

