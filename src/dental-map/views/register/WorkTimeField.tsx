"use client";

import { useState } from "react";

const control =
  "w-full rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-ink-900 " +
  "transition-colors focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100";

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
      <legend className="mb-1.5 block text-sm font-medium text-ink-700">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-400">Dan</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className={control} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-400">Gacha</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className={control} />
        </label>
      </div>
    </fieldset>
  );
}
