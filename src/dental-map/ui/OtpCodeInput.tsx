"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "./cn";
import { errorTextClass } from "./Field";

export const OTP_CODE_LENGTH = 6;

export type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the six digits are complete (typing, pasting or SMS autofill). */
  onComplete?: (value: string) => void;
  error?: boolean;
  errorText?: string;
  disabled?: boolean;
  /** Move focus to the first empty box when the pane becomes visible. */
  autoFocus?: boolean;
  label?: string;
};

/**
 * Six single-digit boxes behaving as one field.
 *
 * Six real inputs (rather than one input with letter-spacing) is what buys the
 * native mobile behaviours: a numeric keypad per box, per-digit caret placement
 * on a touch screen, and iOS SMS autofill — which only offers the code when it
 * finds `autocomplete="one-time-code"`, and only on the FIRST box, otherwise
 * iOS proposes the same code six times.
 */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  error,
  errorText,
  disabled,
  autoFocus,
  label = "Tasdiqlash kodi"
}: OtpCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const invalid = Boolean(error || errorText);
  const digits = value.slice(0, OTP_CODE_LENGTH).split("");

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }
    const target = Math.min(value.length, OTP_CODE_LENGTH - 1);
    inputsRef.current[target]?.focus();
    // Intentionally keyed on autoFocus/disabled only: refocusing on every
    // keystroke would fight the caret the user just moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  function focusBox(index: number) {
    inputsRef.current[Math.max(0, Math.min(index, OTP_CODE_LENGTH - 1))]?.focus();
  }

  function commit(next: string, caret: number) {
    const clean = next.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH);
    onChange(clean);
    focusBox(caret);
    if (clean.length === OTP_CODE_LENGTH) {
      onComplete?.(clean);
    }
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      // A deletion via the keypad: drop this digit and stay on the box.
      commit(value.slice(0, index) + value.slice(index + 1), index);
      return;
    }
    // Autofill and fast typing both deliver more than one character at once.
    const head = value.slice(0, index);
    const merged = (head + typed).slice(0, OTP_CODE_LENGTH);
    const tail = value.slice(head.length + typed.length);
    commit(merged + tail, merged.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      commit(value.slice(0, index - 1) + value.slice(index), index - 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === "ArrowRight" && index < OTP_CODE_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) {
      return;
    }
    event.preventDefault();
    commit(pasted, Math.min(pasted.length, OTP_CODE_LENGTH - 1));
  }

  return (
    <div className="block">
      <div className="grid grid-cols-6 gap-2" role="group" aria-label={label}>
        {Array.from({ length: OTP_CODE_LENGTH }, (_, index) => {
          const digit = digits[index] ?? "";

          return (
            <input
              key={index}
              ref={(node) => {
                inputsRef.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              // FIRST box only — see the component note on iOS autofill.
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={OTP_CODE_LENGTH}
              disabled={disabled}
              aria-label={`${index + 1}-raqam`}
              aria-invalid={invalid || undefined}
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              onFocus={(event) => event.currentTarget.select()}
              className={cn(
                "h-14 w-full rounded-card border bg-control text-center text-xl font-black tabular-nums text-ink-900",
                "transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-55",
                invalid
                  ? "border-danger ring-2 ring-danger/30"
                  : digit
                    ? "border-brand-500 focus:border-brand-500 focus:shadow-card focus:ring-brand-500/40"
                    : "border-control-border focus:border-brand-500 focus:shadow-card focus:ring-brand-500/40"
              )}
            />
          );
        })}
      </div>
      {errorText && (
        <small className={errorTextClass} role="alert">
          {errorText}
        </small>
      )}
    </div>
  );
}
