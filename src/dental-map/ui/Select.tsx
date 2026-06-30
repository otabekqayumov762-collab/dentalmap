"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type SelectOption = { value: string; label: ReactNode };

export type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: ReactNode;
  name?: string;
  className?: string;
};

/** Accessible custom dropdown with a styled option list (closes on outside click / Escape). */
export function Select({ value, options, onChange, placeholder = "Tanlang", label, name, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
      <div ref={rootRef} className={cn("relative", className)}>
        {name && <input type="hidden" name={name} value={value} />}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-left",
            "transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100",
            open && "border-brand-400 ring-2 ring-brand-100"
          )}
        >
          <span className={cn("truncate", selected ? "text-ink-900" : "text-ink-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={18} className={cn("shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-surface-100 bg-surface-0 p-1.5 shadow-float"
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[0.95rem] transition-colors",
                      active ? "bg-brand-50 text-brand-700 font-semibold" : "text-ink-700 hover:bg-surface-100"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && <Check size={16} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
