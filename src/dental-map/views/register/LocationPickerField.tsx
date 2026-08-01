"use client";

import { MapPin } from "lucide-react";
import { useId, useState } from "react";
import { isSafeMapUrl, mapUrlHasCoordinates } from "../../lib/url";
import { cn } from "../../ui";
import {
  controlHeight,
  controlShellBase,
  controlShellDanger,
  controlShellIdle,
  errorTextClass,
  labelClass
} from "../../ui/Field";

export const MAP_COORDINATE_REQUIRED_MESSAGE =
  "Karta linki aniq nuqtadan olingan bo'lishi kerak. Google yoki Yandex Maps'da klinika joyini tanlab, Share link yuboring.";

export function mapLinkValidationError(value: string) {
  if (!isSafeMapUrl(value)) {
    return "Klinika lokatsiyasiga Yandex yoki Google Maps linkini kiriting.";
  }
  if (!mapUrlHasCoordinates(value)) {
    return MAP_COORDINATE_REQUIRED_MESSAGE;
  }
  return "";
}

export function isSupportedMapLink(value: string) {
  return !mapLinkValidationError(value);
}

export function LocationPickerField({
  name,
  label = "Klinika lokatsiyasi linki",
  defaultValue = "",
  required = false,
  error = false,
  errorText
}: {
  name: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
  /** Forced danger state from the host form (empty value the user never touched). */
  error?: boolean;
  errorText?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const cleanValue = value.trim();
  // Live feedback only once something has been typed; an untouched empty field
  // is not "wrong" yet, it is just empty.
  const liveError = cleanValue ? mapLinkValidationError(cleanValue) : "";
  const message = liveError || errorText || "";
  const generatedId = useId().replace(/:/g, "");
  const inputId = `location-${generatedId}`;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(liveError) || error || Boolean(errorText);

  return (
    <div className="block">
      {/* htmlFor, not a bare <span>: the label text was never associated with the
          input, so the field had no accessible name at all. */}
      <label htmlFor={inputId} className={labelClass}>
        {label}
      </label>
      <div
        className={cn(
          controlShellBase,
          controlHeight,
          "gap-3 px-4",
          invalid ? controlShellDanger : controlShellIdle
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <MapPin size={17} />
        </span>
        <input
          id={inputId}
          name={name}
          value={value}
          required={required}
          inputMode="url"
          autoComplete="url"
          aria-invalid={invalid || undefined}
          aria-describedby={message ? errorId : undefined}
          placeholder="https:// Google yoki Yandex Maps linki"
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
        />
      </div>
      {message && (
        <small id={errorId} className={errorTextClass} role="alert">
          {message}
        </small>
      )}
    </div>
  );
}
