"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { ProfileEditor } from "./ProfileEditor";

type Props = {
  firstName: string;
  email: string;
  characterName: string;
  displayName: string;
  avatarUrl?: string;
  variant?: "default" | "banner";
};

/**
 * Account chip in the header that opens the profile editor as an overlay
 * "layer" (same surface design as the invite screen) instead of navigating
 * to a separate page.
 */
export function ProfileDialog({
  firstName,
  email,
  characterName,
  displayName,
  avatarUrl,
  variant = "default",
}: Props) {
  const onBanner = variant === "banner";
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Edit profile"
        className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 shadow-sm ${
          onBanner
            ? "border-white/30 bg-black/25 hover:bg-black/40"
            : "border-hairline bg-surface hover:bg-parchment"
        }`}
      >
        <Avatar src={avatarUrl} alt={firstName} size={30} />
        <span className={`max-w-[100px] truncate font-body text-sm font-bold sm:max-w-[160px] ${onBanner ? "text-surface" : "text-ink"}`}>
          {firstName}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <button
            aria-label="Close"
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-[480px] rounded-xl border border-hairline bg-surface p-8 shadow-parchment sm:p-10">
            <header className="flex flex-col items-center gap-1 text-center">
              <p className="small-caps">Council of Days</p>
              <h1 className="font-display text-2xl text-ink">Your profile</h1>
              <p className="font-body text-xs text-ink-soft">
                Signed in as{" "}
                <span className="font-display text-ink">{email}</span>
              </p>
            </header>

            <div className="mt-6">
              <ProfileEditor
                initial={{
                  character_name: characterName,
                  display_name: displayName,
                  avatar_url: avatarUrl ?? null,
                }}
                mode="dialog"
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
