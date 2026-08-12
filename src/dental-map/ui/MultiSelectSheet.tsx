"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "./cn";
import type { Option } from "./OptionGrid";
import { Sheet } from "./Sheet";
import { SheetTriggerField } from "./SheetTriggerField";
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
    // No listboxId, so the trigger keeps the plain button role: a toggle list
    // that stays open is not a combobox, and aria-invalid is unsupported there.
    // The danger border plus the role="alert" message below carry that state.
    <SheetTriggerField
      label={label}
      name={name}
      formValue={value.join(",")}
      summary={summary}
      placeholder={placeholder}
      open={open}
      onOpen={() => setOpen(true)}
      disabled={disabled || isEmpty}
      invalid={invalid}
      errorText={errorText}
      emptyHint={emptyHint}
      showEmptyHint={isEmpty}
    >
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
                  "flex items-center justify-between gap-3 rounded-card border px-4 py-3 text-left text-sm transition-colors",
                  active ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-control-border bg-control text-ink-700"
                )}
              >
                <span className="min-w-0">{option.label}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border transition-colors",
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
    </SheetTriggerField>
  );
}
