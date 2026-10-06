/**
 * Validation for image uploads that go through the service-role client.
 *
 * The service role bypasses a bucket's own size and MIME limits, so they are
 * enforced here. The stored content type is always chosen from this allowlist
 * and never taken from the client: a public bucket serves whatever type the
 * object was stored with, so `text/html` or `image/svg+xml` would otherwise be
 * served as a page that can run scripts on the storage domain.
 */
const BY_MIME: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "image/avif": "image/avif",
};

const BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export const MAX_IMAGE_BYTES = 5_000_000;

/** The allowlisted content type for this file, or null if it isn't one. SVG
 *  is deliberately absent. Falls back to the extension for clients that send
 *  no type (the Foundry module's fetches often don't). */
export function allowedImageType(file: File): string | null {
  const byMime = BY_MIME[file.type.toLowerCase()];
  if (byMime) return byMime;
  if (file.type && file.type !== "application/octet-stream") return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[ext] ?? null;
}

/** An error message for a file that must not be stored, else null. Checks the
 *  real size, not a header the client controls. */
export function imageUploadError(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (file.size === 0) return "The image is empty.";
  if (file.size > maxBytes) {
    return `The image is too large (max ${Math.round(maxBytes / 1_000_000)} MB).`;
  }
  if (!allowedImageType(file)) return "Only JPEG, PNG, WebP, GIF or AVIF images are allowed.";
  return null;
}
