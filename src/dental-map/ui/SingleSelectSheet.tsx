"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { Sheet } from "./Sheet";
import { SheetTriggerField } from "./SheetTriggerField";
import { useSettledEmpty } from "./useSettledEmpty";

export type SingleSelectOption = { value: string; label: string };

export type SingleSelectSheetProps = {
  value: string;
  options: SingleSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: ReactNode;
  /** Sheet heading; falls back to the field label. */
  title?: string;
  name?: string;
  error?: boolean;
  errorText?: ReactNode;
  disabled?: boolean;
  /** Shown instead of the hint when the list arrives empty. An admin-managed
   *  list that nobody has filled in yet is a fact about the service, not a
   *  mistake the person in front of the form made — say so plainly. */
  emptyHint?: ReactNode;
};

// Same row language as RegionDistrictSheet, the other single-choice sheet.
// bg-control, not bg-surface-0: the sheet itself is surface-0, so a row drawn
// on it measured 1.00:1 and the list read as unmarked text with no rows at all.
const rowBase =
  "flex cursor-pointer items-center justify-between gap-3 rounded-card border px-4 py-3 text-left text-sm transition-colors";
const rowIdle = "border-control-border bg-control text-ink-700 hover:border-brand-400";
const rowActive = "border-brand-500 bg-brand-50 font-semibold text-brand-700";

/**
 * Single-choice sibling of MultiSelectSheet: the same trigger, the same bottom
 * sheet, one option at a time and the sheet closes on the pick.
 *
 * It exists because a native <select> hands the open dropdown to the operating
 * system to draw — on Android that is a flat grey system panel with system
 * radio buttons, sitting directly above this app's own sheet on the very same
 * step. No CSS on the <select> reaches that panel; the only fix is to stop
 * asking the OS to draw it.
 *
 * The keyboard behaviour a native select gives for free is rebuilt here rather
 * than dropped: the trigger is a combobox (Enter/Space opens), the sheet holds a
 * real listbox driven by aria-activedescendant (arrows move, Home/End jump,
 * Enter/Space picks), and Escape closes it and returns focus to the trigger.
 */
export function SingleSelectSheet({
  value,
  options,
  onChange,
  placeholder = "Tanlang",
  label,
  title,
  name,
  error,
  errorText,
  disabled,
  emptyHint = "Ro'yxat hozircha bo'sh — administrator to'ldirgach ko'rinadi."
}: SingleSelectSheetProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listboxId = `listbox-${useId().replace(/:/g, "")}`;
  const invalid = Boolean(error || errorText);
  // An empty picker with no explanation reads as a broken control; a disabled
  // one with a reason reads as "not ready yet", which is what it is.
  const isEmpty = useSettledEmpty(options.length === 0);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const summary = selectedIndex >= 0 ? options[selectedIndex].label : "";
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // Keyboard focus starts on the current choice, the way an open select does —
  // arrowing from the top of a long list to find where you already are is the
  // part of a custom picker that usually gets left out.
  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
    // Only on open: re-syncing on every value change would fight the arrows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!options.length) {
      return;
    }
    const last = options.length - 1;
    const move = (next: number) => {
      event.preventDefault();
      setActiveIndex(Math.min(Math.max(next, 0), last));
    };

    if (event.key === "ArrowDown") {
      move(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      move(activeIndex - 1);
    } else if (event.key === "Home") {
      move(0);
    } else if (event.key === "End") {
      move(last);
    } else if (event.key === "Enter" || event.key === " ") {
      // Space would scroll the page under the sheet on the way through.
      event.preventDefault();
      const option = options[activeIndex];
      if (option) {
        choose(option.value);
      }
    }
    // Escape is left alone: the dialog handles it, and it also restores focus
    // to the trigger, which a local handler here would skip.
  }

  return (
    <SheetTriggerField
      label={label}
      name={name}
      formValue={value}
      summary={summary}
      placeholder={placeholder}
      open={open}
      onOpen={() => setOpen(true)}
      disabled={disabled || isEmpty}
      invalid={invalid}
      errorText={errorText}
      emptyHint={emptyHint}
      showEmptyHint={isEmpty}
      listboxId={listboxId}
    >
      <Sheet open={open} onClose={() => setOpen(false)} title={title || label} initialFocusRef={listRef}>
        {/* Fraction of the TELEGRAM viewport, matching MultiSelectSheet: 55vh of
            the layout viewport left this nested scroller taller than the sheet
            containing it on a short Telegram window. overscroll-contain keeps a
            flick at the end of a long list from moving the page behind. */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={0}
          aria-label={typeof title === "string" ? title : undefined}
          aria-activedescendant={options.length ? optionId(activeIndex) : undefined}
          onKeyDown={onListKeyDown}
          className="flex max-h-[calc(var(--tg-viewport-height,100svh)*0.55)] flex-col gap-1.5 overflow-auto overscroll-contain no-scrollbar focus:outline-none"
        >
          {options.map((option, index) => {
            const selected = option.value === value;

            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                onClick={() => choose(option.value)}
                className={cn(
                  rowBase,
                  selected ? rowActive : rowIdle,
                  // Focus lives on the listbox, so the keyboard position needs a
                  // cue of its own or arrowing through is invisible.
                  index === activeIndex && "ring-2 ring-brand-500/40"
                )}
              >
                <span className="min-w-0">{option.label}</span>
                {selected && <Check size={16} className="shrink-0 text-brand-600" />}
              </div>
            );
          })}
        </div>
      </Sheet>
    </SheetTriggerField>
  );
}
