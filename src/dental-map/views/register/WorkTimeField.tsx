"use client";

import { useState } from "react";
import { cn } from "../../ui";
import { controlBase, controlHeight, controlIdle, labelClass } from "../../ui/Field";

// No local `control` string: the shared control tokens are the single source of
// truth, so a time input cannot drift away from every other field's height.
//
// The two exceptions are both about what the BROWSER draws inside this control
// rather than what we draw around it. A time input renders on the platform's
// clock, so a phone set to English shows "09:00 AM" where a 24-hour locale shows
// "09:00" -- three characters wider, in a half-width grid cell. At 360px that
// overflowed and the field read "09:00 AN", the M sliced off by the picker
// indicator. px-3 buys the room, and hiding the indicator buys the rest: it is
// pure decoration next to our own label, and tapping anywhere in the field opens
// the platform picker regardless.
// Two deviations from the shared tokens, both about what the BROWSER draws
// inside this control rather than what we draw around it. A time input renders
// on the platform clock, so a phone set to English shows "09:00 AM" where a
// 24-hour locale shows "09:00" -- three characters wider, in a half-width grid
// cell. At 360px the field read "09:00 AN", the M sliced off by the picker
// indicator; px-3 alone was measured and did not recover it. Hiding the
// indicator does: it is pure decoration beside our own "Dan"/"Gacha" labels, and
// the platform picker still opens on tapping or focusing the field.
const control = cn(
  controlBase,
  controlHeight,
  controlIdle,
  "px-3 [&::-webkit-calendar-picker-indicator]:hidden"
);

/**
 * Work-hours range picked with two native time inputs; submits "HH:MM - HH:MM"
 * via a hidden input so the format is always valid (the "mask").
 */
export function WorkTimeField({
  name,
  label = "Ish vaqti",
  defaultStart = "09:00",
  defaultEnd = "18:00"
}: {
  name: string;
  label?: string;
  defaultStart?: string;
  defaultEnd?: string;
}) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const value = start && end ? `${start} - ${end}` : "";

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={labelClass}>{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-500">Dan</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className={control} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-500">Gacha</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className={control} />
        </label>
      </div>
    </fieldset>
  );
}
