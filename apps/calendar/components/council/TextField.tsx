"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const TextField = React.forwardRef<HTMLInputElement, Props>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    // Hooks must run unconditionally — id ?? React.useId() would skip the
    // hook call whenever an id prop is passed, violating rules-of-hooks.
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block small-caps text-ink-soft">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // bg-surface/80 and placeholder-ink-soft/50 (opacity MODIFIERS on
            // our var(--x)-based custom colors) silently compile to no CSS —
            // Tailwind can't apply a slash-opacity to a plain CSS variable
            // color. That left the input with the browser's native white
            // background while text-ink (unaffected, a plain class) still
            // resolved to a theme's light ink colour — invisible text on
            // dark themes. Fixed with color-mix as an arbitrary value and a
            // plain (non-opacity) placeholder colour.
            "w-full h-11 px-3 rounded-md border bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] text-ink placeholder-ink-soft",
            "transition focus:bg-surface focus:border-gold",
            error ? "border-vote-no" : "border-hairline",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-vote-no">{error}</p>
        ) : hint ? (
          <p className="text-xs text-ink-soft">{hint}</p>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = "TextField";
