import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const controlClass =
  "w-full rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-ink-900 " +
  "placeholder:text-ink-400 transition-colors focus:border-brand-400 focus:bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-brand-100";

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-ink-700">{children}</span>;
}

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
};

/** Labelled text input. Spread the rest onto the native input (name, value…). */
export function Field({ label, hint, className, ...rest }: FieldProps) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <input className={cn(controlClass, className)} {...rest} />
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
      <textarea className={cn(controlClass, "min-h-24 resize-y", className)} {...rest} />
      {hint && <small className="mt-1 block text-xs text-ink-400">{hint}</small>}
    </label>
  );
}
