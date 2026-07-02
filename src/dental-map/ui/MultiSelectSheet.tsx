"use client";

import { Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "./cn";
import type { Option } from "./OptionGrid";
import { Sheet } from "./Sheet";

export type MultiSelectSheetProps = {
  label?: string;
  title?: string;
  name?: string;
  value: string[];
  options: Option[];
  onToggle: (value: string) => void;
  placeholder?: string;
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
  placeholder = "Tanlang"
}: MultiSelectSheetProps) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? ""
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  return (
    <div className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
      {name && <input type="hidden" name={name} value={value.join(",")} />}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-left transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
      >
        <span className={cn("truncate", summary ? "text-ink-900" : "text-ink-400")}>{summary || placeholder}</span>
        <ChevronRight size={18} className={cn("shrink-0 text-ink-400 transition-transform", open && "rotate-90")} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={title || label}>
        <div className="flex max-h-[55vh] flex-col gap-1.5 overflow-auto no-scrollbar">
          {options.map((option) => {
            const active = value.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(option.value)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[0.95rem] transition-colors",
                  active ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-surface-200 bg-surface-0 text-ink-700"
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
