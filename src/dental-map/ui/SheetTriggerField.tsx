"use client";

import { ChevronRight } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "./cn";
import {
  ControlLabel,
  controlHeight,
  controlTriggerBase,
  controlTriggerDanger,
  controlTriggerIdle,
  errorTextClass,
  hintClass
} from "./Field";

export type SheetTriggerFieldProps = {
  label?: ReactNode;
  /** Submitted through a hidden input: a sheet picker is not a real form
   *  control, and several forms are read with FormData. */
  name?: string;
  formValue?: string;
  /** What the trigger reads when something is chosen; empty falls back to the
   *  placeholder in the muted tone. */
  summary: string;
  placeholder: string;
  open: boolean;
  onOpen: () => void;
  disabled?: boolean;
  invalid?: boolean;
  errorText?: ReactNode;
  emptyHint?: ReactNode;
  /** The hint replaces nothing when there is an error — never both, or the pane
   *  jumps by two lines on every failed validation. */
  showEmptyHint?: boolean;
  /** Present when the sheet holds a listbox: the trigger then takes role
   *  combobox, which — unlike the implicit button role — actually supports
   *  aria-expanded and aria-invalid. Omitted, it stays a plain button. */
  listboxId?: string;
  /** The sheet itself. */
  children?: ReactNode;
};

/**
 * The field-shaped trigger shared by the sheet pickers (MultiSelectSheet,
 * SingleSelectSheet): label, hidden input for FormData, the control-height
 * button carrying the current summary, and the error/empty note underneath.
 */
export function SheetTriggerField({
  label,
  name,
  formValue,
  summary,
  placeholder,
  open,
  onOpen,
  disabled,
  invalid,
  errorText,
  emptyHint,
  showEmptyHint,
  listboxId,
  children
}: SheetTriggerFieldProps) {
  const generated = useId().replace(/:/g, "");
  const labelId = `${generated}-label`;
  const noteId = `${generated}-note`;
  const showsEmptyHint = Boolean(showEmptyHint && emptyHint);
  const hasNote = Boolean(errorText) || showsEmptyHint;

  const comboboxProps = listboxId
    ? {
        role: "combobox",
        "aria-haspopup": "listbox" as const,
        "aria-expanded": open,
        "aria-controls": open ? listboxId : undefined,
        "aria-invalid": invalid || undefined,
        "aria-labelledby": label ? labelId : undefined,
        "aria-describedby": hasNote ? noteId : undefined
      }
    : null;

  return (
    <div className="block">
      {label && <ControlLabel id={labelId}>{label}</ControlLabel>}
      {name && <input type="hidden" name={name} value={formValue ?? ""} />}
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        {...comboboxProps}
        className={cn(
          controlTriggerBase,
          controlHeight,
          invalid ? controlTriggerDanger : controlTriggerIdle,
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className={cn("truncate", summary ? "text-ink-900" : "text-ink-400")}>{summary || placeholder}</span>
        <ChevronRight
          size={18}
          aria-hidden="true"
          className={cn("shrink-0 text-ink-400 motion-safe:transition-transform", open && "rotate-90")}
        />
      </button>
      {errorText ? (
        <small id={noteId} className={errorTextClass} role="alert">
          {errorText}
        </small>
      ) : (
        showsEmptyHint && (
          <small id={noteId} className={hintClass} role="status">
            {emptyHint}
          </small>
        )
      )}
      {children}
    </div>
  );
}
