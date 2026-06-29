"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "wax" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export const WaxButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "wax", size = "md", ...props }, ref) => {
    const sizing =
      size === "sm" ? "h-9 px-4 text-sm" : size === "lg" ? "h-12 px-7 text-base" : "h-11 px-5 text-sm";
    const tone =
      variant === "wax"
        ? "btn-wax font-display tracking-wider uppercase"
        : variant === "outline"
          ? "border border-hairline bg-parchment/40 text-ink hover:bg-parchment"
          : "text-ink hover:bg-parchment/60";
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
          sizing,
          tone,
          className,
        )}
        {...props}
      />
    );
  },
);
WaxButton.displayName = "WaxButton";
