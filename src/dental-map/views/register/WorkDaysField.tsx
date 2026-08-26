"use client";

import { useState } from "react";
import { cn } from "../../ui";
import { errorTextClass, hintClass, labelClass } from "../../ui/Field";

/**
 * Which days of the week the doctor works.
 *
 * The numbers submitted are the API's, not JavaScript's. `WeeklyAvailability`
 * numbers Monday as 0 and Sunday as 6; `Date.getDay()` numbers Sunday as 0. A
 * form that quietly submitted the browser's numbering would book patients one
 * day off for six days out of seven, and Sunday would land on Monday -- the kind
 * of defect that is invisible in a screenshot and obvious to a patient standing
 * outside a closed clinic. So the mapping is written down here once.
 */
const DAYS = [
  { api: 0, short: "Du", full: "Dushanba" },
  { api: 1, short: "Se", full: "Seshanba" },
  { api: 2, short: "Ch", full: "Chorshanba" },
  { api: 3, short: "Pa", full: "Payshanba" },
  { api: 4, short: "Ju", full: "Juma" },
  { api: 5, short: "Sh", full: "Shanba" },
  { api: 6, short: "Ya", full: "Yakshanba" },
] as const;

/** The two patterns nearly every clinic here actually uses. */
const PRESETS = [
  { label: "Dush–Juma", days: [0, 1, 2, 3, 4] },
  { label: "Dush–Shan", days: [0, 1, 2, 3, 4, 5] },
] as const;

export function WorkDaysField({
  name,
  label = "Ish kunlari",
  defaultDays = [],
  error = false,
}: {
  name: string;
  label?: string;
  /** Empty on purpose: nothing is pre-selected, so a doctor cannot register a
   *  week they never looked at. */
  defaultDays?: number[];
  /** Forced danger state from the host form when it submits with none chosen. */
  error?: boolean;
}) {
  const [chosen, setChosen] = useState<number[]>(defaultDays);
  const [touched, setTouched] = useState(defaultDays.length > 0);

  function toggle(api: number) {
    setTouched(true);
    setChosen((current) =>
      current.includes(api) ? current.filter((d) => d !== api) : [...current, api].sort((a, b) => a - b)
    );
  }

  function applyPreset(days: readonly number[]) {
    setTouched(true);
    // Replaces rather than adds: a preset is "my week is this", and merging it
    // into an existing pick produced a set the doctor did not ask for.
    setChosen([...days]);
  }

  const invalid = error && chosen.length === 0;
  const sameAsPreset = (days: readonly number[]) =>
    days.length === chosen.length && days.every((d) => chosen.includes(d));

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={labelClass}>{label}</legend>
      {/* The value the form posts: the API's weekday numbers, comma separated. */}
      <input type="hidden" name={name} value={chosen.join(",")} />

      <div className="mb-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.days)}
            aria-pressed={sameAsPreset(preset.days)}
            className={cn(
              "h-8 rounded-pill border px-3 text-xs font-bold transition-colors",
              sameAsPreset(preset.days)
                ? "border-brand-500 bg-brand-500 text-on-brand"
                : "border-control-border/60 bg-control text-ink-700 hover:bg-surface-0"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Seven equal columns rather than a wrapping row: at 360px a wrap put one
          lonely day on a second line, which reads as a separate control. */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((day) => {
          const on = chosen.includes(day.api);
          return (
            <button
              key={day.api}
              type="button"
              onClick={() => toggle(day.api)}
              aria-pressed={on}
              aria-label={day.full}
              title={day.full}
              className={cn(
                // h-11 keeps every target at the 44px minimum the rest of the
                // form uses, which is what makes seven of them tappable at all.
                "flex h-11 items-center justify-center rounded-control border text-sm font-bold transition-colors motion-safe:active:scale-95",
                on
                  ? "border-brand-500 bg-brand-500 text-on-brand"
                  : invalid
                    ? "border-danger bg-control text-ink-700"
                    : "border-control-border/60 bg-control text-ink-700 hover:bg-surface-0"
              )}
            >
              {day.short}
            </button>
          );
        })}
      </div>

      {invalid ? (
        <small className={errorTextClass} role="alert">
          Kamida bitta ish kunini tanlang.
        </small>
      ) : (
        <small className={hintClass}>
          {chosen.length === 0
            ? touched
              ? "Hech qanday kun tanlanmadi."
              : "Qaysi kunlar ishlaysiz — tanlang."
            : `${chosen.length} kun tanlandi`}
        </small>
      )}
    </fieldset>
  );
}
