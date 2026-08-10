"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadAvatarAction, setOwnAvatarAction } from "@/app/calendar/profile/actions";

const PENDING_AVATAR_KEY = "vestige-pending-avatar";

/**
 * Applies a portrait picked during sign-up (see SignUpForm), the first time
 * a signed-in page actually mounts after the magic link is redeemed.
 *
 * The sign-up form has no session to upload to yet, so it stages the
 * cropped image as a data URL in sessionStorage instead. This is that
 * staging area's other end: read once, upload, apply, clear — silently, so
 * a portrait that fails to carry through (private browsing, a different
 * device opening the link, a storage error) just leaves the account with
 * no portrait, exactly like not having picked one at all.
 */
export function PendingAvatarUploader() {
  const router = useRouter();

  useEffect(() => {
    let dataUrl: string | null;
    try {
      dataUrl = sessionStorage.getItem(PENDING_AVATAR_KEY);
      if (dataUrl) sessionStorage.removeItem(PENDING_AVATAR_KEY);
    } catch {
      return;
    }
    if (!dataUrl) return;

    (async () => {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const uploaded = await uploadAvatarAction(fd);
      if (!uploaded.ok) return;
      const applied = await setOwnAvatarAction(uploaded.url);
      if (applied.ok) router.refresh();
    })();
    // Runs once, on mount — deliberately not re-run on navigation within
    // the same session, since the pending key is already gone after the
    // first successful (or failed) read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
