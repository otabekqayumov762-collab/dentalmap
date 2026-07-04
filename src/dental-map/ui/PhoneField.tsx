"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

/** Strips to national digits (drops the 998 country code), max 9 digits. */
function parseDigits(value?: string | null) {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("998")) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/** "901234567" → "90 123 45 67" (Uzbek grouping 2-3-2-2). */
function formatNational(digits: string) {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}

function fullValue(digits: string) {
  return digits ? `+998 ${formatNational(digits)}` : "";
}

export type PhoneFieldProps = {
  label?: ReactNode;
  name?: string;
  /** Controlled full value (e.g. "+998 90 123 45 67"). Omit for uncontrolled use. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (fullValue: string) => void;
  required?: boolean;
  className?: string;
  /** Swap the border to a danger tone when the field is invalid. */
  error?: boolean;
};

/**
 * Phone input with a fixed +998 prefix and a 90 123 45 67 mask. Submits the full
 * "+998 90 123 45 67" string via a hidden input (uncontrolled forms) and/or
 * onValueChange (controlled). Empty input submits "".
 */
export function PhoneField({
  label,
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  className,
  error
}: PhoneFieldProps) {
  const controlled = value !== undefined;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [digits, setDigits] = useState(() => parseDigits(value ?? defaultValue ?? ""));

  // Sync from an external value only when the user is NOT typing here, so the
  // controlled round-trip can't drop characters mid-entry.
  useEffect(() => {
    if (!controlled || document.activeElement === inputRef.current) {
      return;
    }
    const next = parseDigits(value);
    setDigits((current) => (current === next ? current : next));
  }, [controlled, value]);

  function update(raw: string) {
    const next = parseDigits(raw);
    setDigits(next);
    onValueChange?.(fullValue(next));
  }

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
      <div
        className={cn(
          "flex h-12 items-center rounded-2xl bg-surface-50 transition-colors focus-within:bg-surface-0 focus-within:ring-2",
          error
            ? "border border-danger focus-within:border-danger focus-within:ring-danger/30"
            : "border border-surface-200 focus-within:border-brand-400 focus-within:ring-brand-100",
          className
        )}
      >
        <span className="select-none pl-4 pr-2 font-medium text-ink-500">+998</span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          className="min-w-0 flex-1 bg-transparent pr-4 text-ink-900 outline-none placeholder:text-ink-400"
          value={formatNational(digits)}
          onChange={(event) => update(event.target.value)}
          placeholder="90 123 45 67"
          required={required}
        />
      </div>
      {name && <input type="hidden" name={name} value={fullValue(digits)} />}
    </label>
  );
}
