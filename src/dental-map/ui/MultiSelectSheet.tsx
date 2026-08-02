"use client";

import { Check, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "./cn";
import {
  ControlLabel,
  controlHeight,
  controlTriggerBase,
  controlTriggerDanger,
  controlTriggerIdle,
  errorTextClass,
  hintClass
} from "./Field";
import type { Option } from "./OptionGrid";
import { Sheet } from "./Sheet";
import { useSettledEmpty } from "./useSettledEmpty";

export type MultiSelectSheetProps = {
  label?: ReactNode;
  title?: string;
  name?: string;
  value: string[];
  options: Option[];
  onToggle: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  errorText?: ReactNode;
  disabled?: boolean;
  /** Shown when the list arrives empty. States plainly that the field can be
   *  left as it is, so a missing catalogue never reads as a dead end. */
  emptyHint?: ReactNode;
};

/**
 * Compact multi-select: a field-like trigger showing the current selection that
 * opens a bottom sheet with toggleable options. Keeps long option lists out of
 * the form flow. Submits a comma-joined value via a hidden input.
 */
export function MultiSelectSheet({
  label,
  title,
  name,
  value,
  options,
  onToggle,
  placeholder = "Tanlang",
  error,
  errorText,
  disabled,
  emptyHint = "Ro'yxat hozircha bo'sh — bu maydonsiz ham davom etish mumkin."
}: MultiSelectSheetProps) {
  const [open, setOpen] = useState(false);
  const invalid = Boolean(error || errorText);
  // Opening a sheet with nothing in it is a dead end, so the trigger closes
  // itself off — but only once the list has settled, never mid-load.
  const isEmpty = useSettledEmpty(options.length === 0);
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? ""
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  return (
    <div className="block">
      {label && <ControlLabel>{label}</ControlLabel>}
      {name && <input type="hidden" name={name} value={value.join(",")} />}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || isEmpty}
        // No aria-invalid: it is not supported on the implicit button role.
        // The danger border plus the role="alert" message below carry the state.
        className={cn(
          controlTriggerBase,
          controlHeight,
          invalid ? controlTriggerDanger : controlTriggerIdle,
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className={cn("truncate", summary ? "text-ink-900" : "text-ink-400")}>{summary || placeholder}</span>
        <ChevronRight
          size={18}
          className={cn("shrink-0 text-ink-400 motion-safe:transition-transform", open && "rotate-90")}
        />
      </button>
      {errorText ? (
        <small className={errorTextClass} role="alert">
          {errorText}
        </small>
      ) : (
        isEmpty &&
        emptyHint && (
          <small className={hintClass} role="status">
            {emptyHint}
          </small>
        )
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={title || label}>
        {/* Fraction of the TELEGRAM viewport: 55vh of the layout viewport left this
            nested scroller taller than the sheet that contains it on a short
            Telegram window, so the "Tayyor" button ended up below the fold. */}
        <div className="flex max-h-[calc(var(--tg-viewport-height,100svh)*0.55)] flex-col gap-1.5 overflow-auto no-scrollbar">
          {options.map((option) => {
            const active = value.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(option.value)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-card border px-4 py-3 text-left text-[0.95rem] transition-colors",
                  active ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-control-border bg-control text-ink-700"
                )}
              >
                <span className="min-w-0">{option.label}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active ? "border-brand-500 bg-brand-500 text-white" : "border-surface-200 text-transparent"
                  )}
                >
                  <Check size={13} />
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 h-12 w-full rounded-pill bg-brand-500 font-semibold text-white shadow-card transition-colors hover:bg-brand-600"
        >
          Tayyor{value.length ? ` (${value.length})` : ""}
        </button>
      </Sheet>
    </div>
  );
}
