"use client";

import { useState } from "react";
import { cn } from "../../ui";
import { controlBase, controlHeight, controlIdle, labelClass } from "../../ui/Field";

// No local `control` string: the shared control tokens are the single source of
// truth, so a time input cannot drift away from every other field's height.
const control = cn(controlBase, controlHeight, controlIdle);

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
          <span className="text-xs font-medium text-ink-400">Dan</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className={control} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-400">Gacha</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className={control} />
        </label>
      </div>
    </fieldset>
  );
}
