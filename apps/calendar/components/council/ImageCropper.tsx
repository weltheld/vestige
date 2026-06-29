"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WaxButton } from "./WaxButton";

type Props = {
  file: File;
  /** width / height of the crop. 1 = square. */
  aspect?: number;
  /** Circular mask (for avatars). */
  round?: boolean;
  /** On-screen crop width in px. */
  viewWidth?: number;
  /** Exported image width in px. */
  outputWidth?: number;
  title?: string;
  hint?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
};

/**
 * Pan/zoom image cropper. Drag to move, slide to zoom, then export a JPEG
 * of the visible region at the requested aspect ratio.
 */
export function ImageCropper({
  file,
  aspect = 1,
  round = false,
  viewWidth = 256,
  outputWidth = 512,
  title = "Position your image",
  hint = "Drag to move, slide to zoom.",
  onCancel,
  onConfirm,
}: Props) {
  const viewHeight = Math.round(viewWidth / aspect);
  const outputHeight = Math.round(outputWidth / aspect);

  const [url, setUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const clampOffset = useCallback(
    (x: number, y: number, s: number, w: number, h: number) => ({
      x: Math.min(0, Math.max(viewWidth - w * s, x)),
      y: Math.min(0, Math.max(viewHeight - h * s, y)),
    }),
    [viewWidth, viewHeight],
  );

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const cover = Math.max(viewWidth / w, viewHeight / h);
    setNat({ w, h });
    setMinScale(cover);
    setScale(cover);
    setOffset({
      x: (viewWidth - w * cover) / 2,
      y: (viewHeight - h * cover) / 2,
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !nat) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clampOffset(nx, ny, scale, nat.w, nat.h));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function onZoom(e: React.ChangeEvent<HTMLInputElement>) {
    if (!nat) return;
    const next = Number(e.target.value);
    const cx = viewWidth / 2;
    const cy = viewHeight / 2;
    const ratio = next / scale;
    const nx = cx - (cx - offset.x) * ratio;
    const ny = cy - (cy - offset.y) * ratio;
    setScale(next);
    setOffset(clampOffset(nx, ny, next, nat.w, nat.h));
  }

  async function confirm() {
    if (!imgRef.current || !nat) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");
      const sW = viewWidth / scale;
      const sH = viewHeight / scale;
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      ctx.drawImage(
        imgRef.current,
        sx,
        sy,
        sW,
        sH,
        0,
        0,
        outputWidth,
        outputHeight,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not process image.");
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cancel"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-xl border border-hairline bg-surface p-6 shadow-parchment">
        <h2 className="text-center font-display text-xl text-ink">{title}</h2>
        <p className="mt-1 text-center font-body text-xs text-ink-soft">
          {hint}
        </p>

        <div className="mt-5 flex justify-center">
          <div
            className={`relative touch-none overflow-hidden border-2 border-dm-gold bg-parchment ${
              round ? "rounded-full" : "rounded-md"
            }`}
            style={{ width: viewWidth, height: viewHeight }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={url}
                alt="Image to crop"
                onLoad={onImgLoad}
                draggable={false}
                className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
                style={
                  nat
                    ? {
                        width: nat.w * scale,
                        height: nat.h * scale,
                        left: offset.x,
                        top: offset.y,
                      }
                    : { visibility: "hidden" }
                }
              />
            )}
          </div>
        </div>

        <input
          type="range"
          min={minScale}
          max={minScale * 4}
          step={minScale / 100}
          value={scale}
          onChange={onZoom}
          className="mt-5 w-full accent-wine"
          aria-label="Zoom"
        />

        <div className="mt-5 flex justify-end gap-2">
          <WaxButton variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </WaxButton>
          <WaxButton onClick={confirm} disabled={busy || !nat}>
            {busy ? "Saving..." : "Use image"}
          </WaxButton>
        </div>
      </div>
    </div>
  );
}
