import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const base =
  "inline-flex items-center justify-center gap-2 rounded-card px-6 py-3 font-display text-sm uppercase tracking-[0.18em] transition disabled:opacity-60 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Wax-seal stamp (see .btn-wax in @vestige/ui/tokens.css)
  primary: "btn-wax",
  secondary:
    "border border-hairline bg-surface text-ink hover:border-gold hover:text-wine",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
