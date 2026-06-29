import Image from "next/image";
import { cn } from "@/lib/utils";
import { Crest } from "./Crest";

type AvatarProps = {
  src?: string;
  alt: string;
  size?: number;
  ring?: "default" | "gold";
  className?: string;
};

export function Avatar({ src, alt, size = 56, ring = "default", className }: AvatarProps) {
  const ringClass = ring === "gold" ? "ring-2 ring-dm-gold" : "ring-1 ring-hairline";
  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden rounded-full bg-surface shadow-sm",
        ringClass,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-parchment">
          <Crest size={size} />
        </span>
      )}
    </span>
  );
}
