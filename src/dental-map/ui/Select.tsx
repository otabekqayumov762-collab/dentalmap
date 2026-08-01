"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "./cn";
import {
  ControlLabel,
  controlBase,
  controlDanger,
  controlHeight,
  controlIdle,
  errorTextClass,
  hintClass
} from "./Field";
import { useSettledEmpty } from "./useSettledEmpty";

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: ReactNode;
  name?: string;
  className?: string;
  error?: boolean;
  errorText?: ReactNode;
  disabled?: boolean;
  /** Shown instead of the hint when the list arrives empty. An admin-managed
   *  list that nobody has filled in yet is a fact about the service, not a
   *  mistake the person in front of the form made — say so plainly. */
  emptyHint?: ReactNode;
};

/** Native select semantics provide reliable keyboard, focus, screen-reader and
 * mobile-picker behaviour without recreating the ARIA combobox state machine. */
export function Select({
  value,
  options,
  onChange,
  placeholder = "Tanlang",
  label,
  name,
  className,
  error,
  errorText,
  disabled,
  emptyHint = "Ro'yxat hozircha bo'sh — administrator to'ldirgach ko'rinadi."
}: SelectProps) {
  const generatedId = useId();
  const selectId = `select-${generatedId.replace(/:/g, "")}`;
  const hasEmptyOption = options.some((option) => option.value === "");
  const invalid = Boolean(error || errorText);
  // An empty picker with no explanation reads as a broken control; a disabled
  // one with a reason reads as "not ready yet", which is what it is.
  const isEmpty = useSettledEmpty(options.length === 0);

  return (
    <label htmlFor={selectId} className="block">
      {label && <ControlLabel>{label}</ControlLabel>}
      <span className={cn("relative block", className)}>
        <select
          id={selectId}
          name={name}
          value={value}
          disabled={disabled || isEmpty}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            controlBase,
            controlHeight,
            invalid ? controlDanger : controlIdle,
            "appearance-none pr-11 disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {!hasEmptyOption && !value && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400"
        />
      </span>
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
    </label>
  );
}
