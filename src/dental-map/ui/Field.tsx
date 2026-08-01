"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from "react";
import { cn } from "./cn";

/* ── Control tokens: the SINGLE source of truth ────────────────────────────
   Every other primitive (Select, PhoneField, OptionGrid, MultiSelectSheet,
   RegionDistrictField, WorkTimeField, LocationPickerField) imports from here
   instead of declaring its own strings. Four heights (py-3 / h-12 / h-14 /
   min-h-12) and three radii had drifted apart across the registration surface,
   which is exactly why the flow read as unstyled defaults.

   The base is deliberately color-agnostic so the idle vs. danger border can be
   selected conditionally — cn is a plain join, not tailwind-merge, so appending
   a second border color would NOT override the first.

   Focus carries THREE cues at once (border + ring + elevation); a single pale
   ring is invisible against surface-50 on a phone in daylight. */
export const controlHeight = "h-12";
export const controlBase =
  "w-full rounded-card bg-control px-4 text-ink-900 placeholder:text-ink-400 " +
  "transition-all duration-150 focus:bg-surface-0 focus:outline-none focus:ring-2";
export const controlIdle =
  "border border-control-border focus:border-brand-500 focus:ring-brand-500/40 focus:shadow-card";
export const controlDanger = "border border-danger focus:border-danger focus:ring-danger/30";

/** Wrapper variant for controls whose real <input> is nested (a prefix, an icon,
 *  a pair of time inputs) — same three cues, driven by focus-within. */
export const controlShellBase =
  "flex w-full items-center rounded-card bg-control transition-all duration-150 " +
  "focus-within:ring-2";
export const controlShellIdle =
  "border border-control-border focus-within:border-brand-500 focus-within:ring-brand-500/40 focus-within:shadow-card";
export const controlShellDanger =
  "border border-danger focus-within:border-danger focus-within:ring-danger/30";

/** Button-shaped controls that open a sheet: keyboard focus only, so the cues
 *  ride focus-visible instead of focus/focus-within. */
export const controlTriggerBase =
  "flex w-full items-center justify-between gap-2 rounded-card bg-control px-4 text-left " +
  "transition-all duration-150 focus:outline-none focus-visible:ring-2";
export const controlTriggerIdle =
  "border border-surface-200 hover:border-brand-300 focus-visible:border-brand-400 " +
  "focus-visible:ring-brand-500/40 focus-visible:shadow-card";
export const controlTriggerDanger =
  "border border-danger focus-visible:border-danger focus-visible:ring-danger/30";

export const labelClass = "mb-1.5 block text-sm font-semibold text-ink-700";
export const hintClass = "mt-1.5 block text-xs font-medium text-ink-400";
export const errorTextClass = "mt-1.5 block text-xs font-semibold text-danger";

export function ControlLabel({ children }: { children: ReactNode }) {
  return <span className={labelClass}>{children}</span>;
}

/** Trailing "— ixtiyoriy" marker so an optional field reads as optional inside
 *  the label instead of needing a separate hint line. */
export function OptionalMark() {
  return <span className="font-medium text-ink-400"> — ixtiyoriy</span>;
}

/**
 * Error text, else the hint. Never both: stacking them pushes the next control
 * down by two lines and makes the pane jump on every failed validation.
 *
 * It carries an id and is wired with aria-describedby rather than living inside
 * a wrapping <label>. Inside the label its text is concatenated into the field's
 * ACCESSIBLE NAME, so a screen reader announced "Parolni takrorlang Parollar bir
 * xil emas." as the label itself — and the name changed every time validation
 * ran, which is also what makes such fields unaddressable in tests.
 */
function FootNote({
  id,
  errorText,
  hint
}: {
  id: string;
  errorText?: ReactNode;
  hint?: ReactNode;
}) {
  if (errorText) {
    return (
      <small id={id} className={errorTextClass} role="alert">
        {errorText}
      </small>
    );
  }
  return hint ? (
    <small id={id} className={hintClass}>
      {hint}
    </small>
  ) : null;
}

/** Stable DOM id for a control + its note, so the label's htmlFor and the
 *  aria-describedby link survive re-renders. */
function useControlIds(explicitId?: string) {
  const generated = useId().replace(/:/g, "");
  const controlId = explicitId ?? `control-${generated}`;
  return { controlId, noteId: `${controlId}-note` };
}

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  /** Swap the border to a danger tone when the field is invalid. */
  error?: boolean;
  /** Message rendered under the control; implies `error` styling semantics. */
  errorText?: ReactNode;
  /** Restrict input to digits only (inputMode numeric + strips non-digits on input/paste). */
  numeric?: boolean;
  /** Unit pinned inside the control ("yil", "so'm"). A quantity reads as a
   *  quantity when its unit sits next to the digits instead of in a hint line. */
  suffix?: ReactNode;
};

/** Labelled text input. Spread the rest onto the native input (name, value…). */
export function Field({
  label,
  hint,
  className,
  error,
  errorText,
  numeric,
  suffix,
  type,
  onInput,
  ...rest
}: FieldProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (reveal ? "text" : "password") : numeric ? "text" : type;
  const invalid = Boolean(error || errorText);

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

  // A digit-only box has nothing to autofill: the browser offering a saved
  // address turns the numeric keypad into a dropdown mid-typing. Digits also get
  // tabular figures so a two-digit answer does not jitter as it is typed.
  const numericProps = numeric
    ? {
        inputMode: "numeric" as const,
        pattern: "[0-9]*",
        autoComplete: rest.autoComplete ?? "off"
      }
    : null;

  const hasSuffix = Boolean(suffix) && !isPassword;
  const { controlId, noteId } = useControlIds(rest.id);
  const hasNote = Boolean(errorText || hint);

  const input = (
    <input
      {...rest}
      id={controlId}
      type={resolvedType}
      onInput={handleInput}
      aria-invalid={invalid || undefined}
      aria-describedby={hasNote ? noteId : rest["aria-describedby"]}
      {...numericProps}
      className={cn(
        // Inside a suffix shell the border/background belong to the shell, so the
        // input keeps only its own typography and spacing.
        hasSuffix
          ? "min-w-0 flex-1 bg-transparent px-4 text-ink-900 outline-none placeholder:text-ink-400"
          : cn(controlBase, controlHeight, invalid ? controlDanger : controlIdle),
        numeric && "tabular-nums",
        isPassword && "pr-11",
        className
      )}
    />
  );

  return (
    <div className="block">
      {label && (
        <label htmlFor={controlId} className={labelClass}>
          {label}
        </label>
      )}
      {hasSuffix ? (
        <span
          className={cn(
            controlShellBase,
            controlHeight,
            invalid ? controlShellDanger : controlShellIdle
          )}
        >
          {input}
          <span className="select-none pr-4 text-sm font-semibold text-ink-400">{suffix}</span>
        </span>
      ) : isPassword ? (
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
      <FootNote id={noteId} errorText={errorText} hint={hint} />
    </div>
  );
}

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: boolean;
  errorText?: ReactNode;
};

export function TextareaField({
  label,
  hint,
  className,
  error,
  errorText,
  ...rest
}: TextareaFieldProps) {
  const invalid = Boolean(error || errorText);
  const { controlId, noteId } = useControlIds(rest.id);
  const hasNote = Boolean(errorText || hint);

  return (
    <div className="block">
      {label && (
        <label htmlFor={controlId} className={labelClass}>
          {label}
        </label>
      )}
      {/* The one control that is not h-12: a single-line textarea is a lie. */}
      <textarea
        {...rest}
        id={controlId}
        aria-invalid={invalid || undefined}
        aria-describedby={hasNote ? noteId : rest["aria-describedby"]}
        className={cn(
          controlBase,
          invalid ? controlDanger : controlIdle,
          "min-h-28 resize-y py-3",
          className
        )}
      />
      <FootNote id={noteId} errorText={errorText} hint={hint} />
    </div>
  );
}

/** Text-only actions (resend, change number, retry).
 *
 * They looked like links, so they were built like links: no height, no padding,
 * no focus ring — a hit box the size of the text line, around 20px, well under
 * the 44px touch minimum. These are the recovery paths on the panes where people
 * get stuck, so they were the hardest things on screen to tap. The negative
 * margin keeps the enlarged target from pushing the surrounding text apart. */
export const inlineActionClass =
  "inline-flex min-h-11 items-center gap-2 rounded-pill px-2 -mx-2 text-sm font-bold text-brand-600 " +
  "transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-brand-500/40 disabled:font-semibold disabled:text-ink-400";
