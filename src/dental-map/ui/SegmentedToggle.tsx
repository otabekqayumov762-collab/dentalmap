"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  Icon?: LucideIcon;
};

export type SegmentedToggleProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Names the group for screen readers ("Rol tanlash", "Kirish rejimi"). */
  ariaLabel: string;
  /** Fires before the click so a lazy chunk can be prefetched on touch-down. */
  onOptionPointerDown?: (value: T) => void;
  className?: string;
};

/**
 * The ONE two-way switch in the app. Both the login/register mode toggle and
 * the mijoz/shifokor role toggle render through it, so they can no longer drift
 * into two different shapes (they were a 24px-radius pill row and a pair of
 * 86px-tall tiles). Same pill, same height, same gradient for the active side —
 * ~52px instead of ~102px of vertical space, which matters on a Telegram
 * viewport where the wizard has to fit above the keyboard.
 */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  onOptionPointerDown,
  className
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "grid grid-cols-2 gap-1 rounded-pill border border-control-border/50 bg-control p-1",
        className
      )}
    >
      {options.map(({ value: optionValue, label, Icon }) => {
        const active = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            onPointerDown={() => onOptionPointerDown?.(optionValue)}
            onClick={() => onChange(optionValue)}
            className={cn(
              "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-pill px-2 text-sm font-bold",
              "motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0",
              active
                // A raised neutral, NOT the brand gradient. Three identical
                // gradient pills used to compete on one screen — the mode
                // toggle, the role toggle and the primary CTA — so nothing read
                // as the primary action. The gradient now means exactly one
                // thing: the button that moves you forward.
                ? "bg-surface-0 text-ink-900 shadow-card dark:bg-surface-50"
                : "text-ink-500 hover:text-ink-900"
            )}
          >
            {Icon && <Icon size={16} aria-hidden="true" className="shrink-0" />}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
