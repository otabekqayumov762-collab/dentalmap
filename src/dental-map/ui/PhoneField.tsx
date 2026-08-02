"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";
import {
  controlHeight,
  controlShellBase,
  controlShellDanger,
  controlShellIdle,
  errorTextClass,
  labelClass
} from "./Field";

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
  /** Message rendered under the control. */
  errorText?: ReactNode;
  disabled?: boolean;
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
  error,
  errorText,
  disabled
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

  const invalid = Boolean(error || errorText);
  const generatedId = useId().replace(/:/g, "");
  const inputId = `phone-${generatedId}`;
  const errorId = `${inputId}-error`;

  function update(raw: string) {
    const next = parseDigits(raw);
    setDigits(next);
    onValueChange?.(fullValue(next));
  }

  return (
    // A DIV, not a wrapping <label>: inside one, the "+998" prefix and any error
    // text are concatenated into the input's accessible name, so the field
    // announced itself as "Telefon raqam +998" and renamed itself on every
    // validation pass. htmlFor keeps the click-to-focus behaviour.
    <div className="block">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <div
        className={cn(
          controlShellBase,
          controlHeight,
          invalid ? controlShellDanger : controlShellIdle,
          disabled && "opacity-60",
          className
        )}
      >
        <span className="select-none pl-4 pr-2 font-semibold text-ink-500">+998</span>
        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          aria-invalid={invalid || undefined}
          aria-describedby={errorText ? errorId : undefined}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent pr-4 text-ink-900 outline-none placeholder:text-ink-500"
          value={formatNational(digits)}
          onChange={(event) => update(event.target.value)}
          placeholder="90 123 45 67"
          required={required}
        />
      </div>
      {name && <input type="hidden" name={name} value={fullValue(digits)} />}
      {errorText && (
        <small id={errorId} className={errorTextClass} role="alert">
          {errorText}
        </small>
      )}
    </div>
  );
}
