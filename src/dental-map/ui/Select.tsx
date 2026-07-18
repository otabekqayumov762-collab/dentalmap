"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "./cn";

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
  error
}: SelectProps) {
  const generatedId = useId();
  const selectId = `select-${generatedId.replace(/:/g, "")}`;
  const hasEmptyOption = options.some((option) => option.value === "");

  return (
    <label htmlFor={selectId} className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
      <span className={cn("relative block", className)}>
        <select
          id={selectId}
          name={name}
          value={value}
          aria-invalid={error || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full appearance-none rounded-2xl bg-surface-50 px-4 py-3 pr-11 text-ink-900",
            "transition-colors focus:outline-none focus:ring-2",
            error
              ? "border border-danger focus:border-danger focus:ring-danger/30"
              : "border border-surface-200 focus:border-brand-400 focus:ring-brand-100"
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
    </label>
  );
}
