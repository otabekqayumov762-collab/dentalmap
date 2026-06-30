import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "solid" | "soft" | "ghost";

const variants: Record<Variant, string> = {
  solid: "bg-brand-500 text-white hover:bg-brand-600",
  soft: "bg-surface-100 text-ink-700 hover:bg-surface-200",
  ghost: "bg-transparent text-ink-500 hover:bg-surface-100"
};

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  active?: boolean;
  children: ReactNode;
};

export function IconButton({ variant = "soft", active = false, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95",
        active ? "bg-brand-500 text-white" : variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
