"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { isDarkActive, setPreference, type ThemePreference } from "../lib/theme";
import { cn } from "../ui";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Kunduzgi", Icon: Sun },
  { value: "dark", label: "Tungi", Icon: Moon }
];

/**
 * Light/dark segmented control. Seeded from the `.dark` class the no-flash
 * script (app/layout.tsx) already applied to <html>; persists explicit picks
 * via setPreference so they win over Telegram/system on the next load.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(isDarkActive());
  }, []);

  function select(pref: ThemePreference) {
    setPreference(pref);
    setIsDark(pref === "dark");
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-surface-200 bg-surface-50 p-1",
        className
      )}
      role="radiogroup"
      aria-label="Ko'rinish"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = value === "dark" ? isDark : !isDark;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-surface-0 text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-700"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
