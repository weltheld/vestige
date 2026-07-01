"use client";

import { useRef, useState } from "react";
import {
  Crop,
  ImagePlus,
  Pencil,
  Swords,
  Trash2,
  VenetianMask,
  X,
} from "lucide-react";
import type { BackgroundScene, Member, User, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { ImageCropper } from "./ImageCropper";

type MemberWithUser = Member & { user: User };

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

const BACKGROUNDS: { label: string; value: BackgroundScene; swatch: string }[] = [
  { label: "Tavern", value: "tavern", swatch: "bg-[#E7DFCE]" },
  { label: "Parchment", value: "parchment", swatch: "bg-parchment" },
  { label: "Wine", value: "wine", swatch: "bg-[#ECDDDB]" },
  { label: "Forest", value: "forest", swatch: "bg-[#E0E7DD]" },
];

type Props = {
  members: MemberWithUser[];
  creatorId: string;
  viableWeekdays: Weekday[];
  background: BackgroundScene;
  bannerUrl?: string;
  bannerOriginalUrl?: string;
  onToggleWeekday: (w: Weekday) => void;
  onChangeBackground: (bg: BackgroundScene) => void;
  onUploadBanner: (blob: Blob, original?: Blob) => Promise<void>;
  onRemoveBanner: () => void;
  onSetMemberDm: (userId: string, isDm: boolean) => void;
  onRemoveMember: (userId: string) => void;
  onClose: () => void;
  /** If true, no body padding is applied (use when embedded in sheet that already pads). */
  embedded?: boolean;
};

// Desktop shows the banner as a compact 4:3 thumbnail (mobile keeps the
// full-width strip, cropped from this same source via object-cover).
const BANNER_ASPECT = 4 / 3;

export function OwnerSettings({
  members,
  creatorId,
  viableWeekdays,
  background,
  bannerUrl,
  bannerOriginalUrl,
  onToggleWeekday,
  onChangeBackground,
  onUploadBanner,
  onRemoveBanner,
  onSetMemberDm,
  onRemoveMember,
  onClose,
  embedded = false,
}: Props) {
  const viable = new Set(viableWeekdays);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  // The full image to also store on confirm (only for a fresh upload).
  const [pendingOriginal, setPendingOriginal] = useState<Blob | null>(null);

  function onPickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be 5 MB or smaller.");
      return;
    }
    setUploadError(null);
    setPendingOriginal(file);
    setCropFile(file);
  }

  // Re-open the cropper on the previously uploaded image (no re-upload).
  async function onAdjustCrop() {
    setUploadError(null);
    try {
      let res = bannerOriginalUrl
        ? await fetch(bannerOriginalUrl, { cache: "no-store" })
        : null;
      if ((!res || !res.ok) && bannerUrl) {
        res = await fetch(bannerUrl, { cache: "no-store" });
      }
      if (!res || !res.ok) throw new Error("Could not load the image.");
      const blob = await res.blob();
      const file = new File([blob], "banner-source", {
        type: blob.type || "image/jpeg",
      });
      setPendingOriginal(null); // original already stored
      setCropFile(file);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not load the image.",
      );
    }
  }

  async function onCropConfirm(blob: Blob) {
    setUploading(true);
    try {
      await onUploadBanner(blob, pendingOriginal ?? undefined);
      setCropFile(null);
      setPendingOriginal(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("flex h-full flex-col", !embedded && "p-5")}>
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspect={BANNER_ASPECT}
          viewWidth={400}
          outputWidth={1600}
          title="Frame your banner"
          hint="Drag to move, slide to zoom. Shown as a compact image in your campaign header."
          onCancel={() => {
            setCropFile(null);
            setPendingOriginal(null);
          }}
          onConfirm={onCropConfirm}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Poll Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-ink-soft hover:bg-parchment hover:text-ink"
          aria-label="Close settings"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="my-4 h-px bg-hairline" />

      <section>
        <p className="small-caps">Roles</p>
        <ul className="mt-2 space-y-1.5">
          {members.map((m) => (
            <MemberRoleRow
              key={m.userId}
              member={m}
              isCreator={m.userId === creatorId}
              onSetMemberDm={onSetMemberDm}
              onRemoveMember={onRemoveMember}
            />
          ))}
        </ul>
      </section>

      <div className="my-4 h-px bg-hairline" />

      <section>
        <p className="small-caps">Viable Weekdays</p>
        <ul className="mt-2 space-y-1">
          {WEEKDAYS.map(({ label, value }) => {
            const on = viable.has(value);
            return (
              <li key={value}>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-hairline/60 bg-surface/60 px-3 py-2 hover:bg-parchment">
                  <span className="text-sm text-ink">{label}</span>
                  <Switch checked={on} onChange={() => onToggleWeekday(value)} />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="my-4 h-px bg-hairline" />

      <section>
        <p className="small-caps">Campaign Banner</p>
        <div className="mt-2">
          {bannerUrl ? (
            <div className="overflow-hidden rounded-md border border-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt="Campaign banner"
                className="h-24 w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-hairline bg-surface/60 text-xs text-ink-soft">
              No banner yet
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickBanner}
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface/60 px-3 py-1.5 text-xs font-display tracking-wider uppercase text-ink hover:bg-parchment disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : bannerUrl ? "Replace" : "Upload"}
            </button>
            {bannerUrl && (
              <button
                type="button"
                onClick={onAdjustCrop}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface/60 px-3 py-1.5 text-xs font-display tracking-wider uppercase text-ink hover:bg-parchment disabled:opacity-50"
              >
                <Crop className="h-3.5 w-3.5" />
                Adjust crop
              </button>
            )}
            {bannerUrl && (
              <button
                type="button"
                onClick={onRemoveBanner}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface/60 px-3 py-1.5 text-xs font-display tracking-wider uppercase text-vote-no hover:bg-parchment disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          {uploadError && (
            <p className="mt-2 text-xs text-vote-no">{uploadError}</p>
          )}
          <p className="mt-2 text-xs text-ink-soft">
            Shown across the top of the campaign calendar. Wide images
            (about 1600&times;400) look best.
          </p>
        </div>
      </section>

      <div className="my-4 h-px bg-hairline" />

      <section>
        <p className="small-caps">Group Background</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {BACKGROUNDS.map(({ label, value, swatch }) => {
            const active = background === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChangeBackground(value)}
                className={cn(
                  "flex items-center gap-2 rounded-md border-2 px-3 py-2 text-sm transition",
                  active
                    ? "border-dm-gold bg-dm-gold/10"
                    : "border-hairline bg-surface/60 hover:bg-parchment",
                )}
              >
                <span className={cn("h-5 w-5 rounded-full border border-ink/20", swatch)} />
                <span className="font-display tracking-wider uppercase text-xs">{label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Sets the calm background tint behind every player&apos;s calendar.
        </p>
      </section>
    </div>
  );
}

function MemberRoleRow({
  member,
  isCreator,
  onSetMemberDm,
  onRemoveMember,
}: {
  member: MemberWithUser;
  isCreator: boolean;
  onSetMemberDm: (userId: string, isDm: boolean) => void;
  onRemoveMember: (userId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const name =
    member.user.characterName || member.user.displayName || member.user.email;
  const RoleIcon = member.isDm ? VenetianMask : Swords;

  return (
    <li className="rounded-md border border-hairline/60 bg-surface/60 px-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <Avatar src={member.user.avatarUrl} alt={name} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{name}</p>
          <p className="flex items-center gap-1 text-[10px] font-display uppercase leading-none tracking-wider text-ink-soft">
            <RoleIcon className="h-3 w-3 shrink-0" />
            {member.isDm ? "Dungeon Master" : "Player"}
            {isCreator && " · Creator"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft hover:bg-parchment hover:text-ink"
          aria-label={`Edit ${name}'s role`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-hairline/60 pt-2">
          <button
            type="button"
            onClick={() => {
              onSetMemberDm(member.userId, true);
              setEditing(false);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-display uppercase tracking-wider transition",
              member.isDm
                ? "border-dm-gold bg-dm-gold/15 text-dm-gold"
                : "border-hairline text-ink-soft hover:bg-parchment",
            )}
          >
            <VenetianMask className="h-3 w-3" /> DM
          </button>
          <button
            type="button"
            onClick={() => {
              onSetMemberDm(member.userId, false);
              setEditing(false);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-display uppercase tracking-wider transition",
              !member.isDm
                ? "border-ink/40 bg-ink/10 text-ink"
                : "border-hairline text-ink-soft hover:bg-parchment",
            )}
          >
            <Swords className="h-3 w-3" /> Player
          </button>
          {!isCreator && (
            <button
              type="button"
              onClick={() => {
                onRemoveMember(member.userId);
                setEditing(false);
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1 text-[11px] font-display uppercase tracking-wider text-vote-no hover:bg-parchment"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-6 w-10 items-center rounded-full border transition",
        checked
          ? "bg-vote-yes/80 border-vote-yes"
          : "bg-ink-soft/15 border-hairline",
      )}
    >
      <span
        className={cn(
          "absolute h-4 w-4 rounded-full bg-parchment shadow transition",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}
