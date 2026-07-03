"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "../../ui";

export function LocationPickerField({
  name,
  label = "Klinika lokatsiyasi linki",
  defaultValue = "",
  required = false
}: {
  name: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const cleanValue = value.trim();
  const supported =
    !cleanValue ||
    /(^https?:\/\/)?([^/]+\.)?(yandex|google)\./i.test(cleanValue) ||
    /(^https?:\/\/)?maps\.app\.goo\.gl/i.test(cleanValue);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      <label
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-2xl border px-4 transition-colors",
          supported
            ? "border-surface-200 bg-surface-50 focus-within:border-brand-400 focus-within:bg-surface-0"
            : "border-danger/40 bg-danger/5"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <MapPin size={17} />
        </span>
        <input
          name={name}
          value={value}
          aria-required={required}
          inputMode="url"
          autoComplete="url"
          placeholder="Google yoki Yandex Maps linki"
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink-900 outline-none placeholder:text-ink-400"
        />
      </label>
      <small className={cn("block text-xs font-medium", supported ? "text-ink-500" : "text-danger")}>
        {supported
          ? "Klinika lokatsiyasini Maps ilovasidan ulashish orqali oling."
          : "Faqat Yandex yoki Google Maps linki kiritiladi."}
      </small>
    </div>
  );
}
