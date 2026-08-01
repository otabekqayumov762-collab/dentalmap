import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gradient";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-pill transition-all duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 focus-visible:ring-offset-2 " +
  "disabled:opacity-55 disabled:pointer-events-none motion-safe:active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-card",
  secondary: "bg-surface-100 text-ink-700 hover:bg-surface-200",
  ghost: "bg-transparent text-brand-600 hover:bg-brand-50",
  danger: "bg-danger text-white hover:brightness-95 shadow-card",
  // The brand teal→blue gradient, declared ONCE. Call sites must not hand-roll
  // it; a second copy is how the flow ended up with four different primaries.
  // The brand's own teal->blue, at full strength. An earlier pass darkened these
  // stops to brand-700/accent-600 so WHITE text would clear 4.5:1 — it did, but
  // it drained the brand out of the primary button on every screen. Dark ink on
  // the bright ramp measures 6.11:1 and 4.76:1, so it reads BETTER than the
  // washed-out version did and the colour survives. Contrast was never a reason
  // to dull the palette; it was a reason to stop using white here.
  gradient:
    "bg-gradient-to-r from-brand-500 to-accent-500 text-ink-900 shadow-card hover:shadow-float " +
    "motion-safe:active:scale-[0.99]"
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-6 text-base w-full"
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}
