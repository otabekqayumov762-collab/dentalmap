"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from "react";
import { cn } from "./cn";

// Color-agnostic base so the idle vs. danger border can be selected
// conditionally (cn is a plain join, not tailwind-merge — appending a second
// border color would NOT override the first).
const controlBase =
  "w-full rounded-2xl bg-surface-50 px-4 py-3 text-ink-900 placeholder:text-ink-400 " +
  "transition-colors focus:bg-surface-0 focus:outline-none focus:ring-2";
const controlIdle = "border border-surface-200 focus:border-brand-400 focus:ring-brand-100";
const controlDanger = "border border-danger focus:border-danger focus:ring-danger/30";

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-ink-700">{children}</span>;
}

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  /** Swap the border to a danger tone when the field is invalid. */
  error?: boolean;
  /** Restrict input to digits only (inputMode numeric + strips non-digits on input/paste). */
  numeric?: boolean;
};

/** Labelled text input. Spread the rest onto the native input (name, value…). */
export function Field({ label, hint, className, error, numeric, type, onInput, ...rest }: FieldProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (reveal ? "text" : "password") : numeric ? "text" : type;

  const handleInput: InputHTMLAttributes<HTMLInputElement>["onInput"] = numeric
    ? (event) => {
        const target = event.currentTarget;
        const cleaned = target.value.replace(/\D/g, "");
        if (target.value !== cleaned) {
          target.value = cleaned;
        }
        onInput?.(event);
      }
    : onInput;

  const input = (
    <input
      {...rest}
      type={resolvedType}
      onInput={handleInput}
      {...(numeric ? { inputMode: "numeric" as const, pattern: "[0-9]*" } : null)}
      className={cn(controlBase, error ? controlDanger : controlIdle, isPassword && "pr-11", className)}
    />
  );

  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      {isPassword ? (
        <span className="relative block">
          {input}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Parolni yashirish" : "Parolni ko'rsatish"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 transition-colors hover:text-ink-600"
          >
            {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      ) : (
        input
      )}
      {hint && <small className="mt-1 block text-xs text-ink-400">{hint}</small>}
    </label>
  );
}

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
};

export function TextareaField({ label, hint, className, ...rest }: TextareaFieldProps) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <textarea className={cn(controlBase, controlIdle, "min-h-24 resize-y", className)} {...rest} />
      {hint && <small className="mt-1 block text-xs text-ink-400">{hint}</small>}
    </label>
  );
}
