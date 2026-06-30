import type { ReactNode } from "react";
import { cn } from "./cn";

export type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

/** Selectable pill — used for filters, gender/role toggles, service pickers. */
export function Chip({ active = false, onClick, className, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97]",
        active
          ? "bg-brand-500 text-white shadow-card"
          : "border border-surface-200 bg-surface-0 text-ink-600 hover:border-brand-300 hover:bg-brand-50/40",
        className
      )}
    >
      {children}
    </button>
  );
}
