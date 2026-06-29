"use client";

import { Crest } from "@/components/council/Crest";
import { ProfileEditor } from "@/components/council/ProfileEditor";

type Initial = {
  character_name: string;
  display_name: string;
  avatar_url: string | null;
};

export function ProfileForm({
  email,
  initial,
}: {
  email: string;
  initial: Initial;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-scene-parchment px-4 py-10 sm:px-8">
      <div className="w-full max-w-[560px] rounded-xl border border-hairline bg-surface p-8 shadow-parchment sm:p-10">
        <header className="flex flex-col items-center text-center gap-3">
          <Crest size={56} />
          <p className="small-caps">Council of Days</p>
          <h1 className="font-display text-3xl text-ink">
            Take your seat at the table
          </h1>
          <p className="font-body text-ink-soft max-w-[42ch]">
            Signed in as{" "}
            <span className="font-display text-ink">{email}</span>.
          </p>
        </header>

        <div className="mt-7">
          <ProfileEditor initial={initial} mode="onboarding" />
        </div>
      </div>
    </div>
  );
}
