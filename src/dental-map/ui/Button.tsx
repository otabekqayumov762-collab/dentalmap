import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-pill transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 " +
  "disabled:opacity-55 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-card",
  secondary: "bg-surface-100 text-ink-700 hover:bg-surface-200",
  ghost: "bg-transparent text-brand-600 hover:bg-brand-50",
  danger: "bg-danger text-white hover:brightness-95 shadow-card"
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
