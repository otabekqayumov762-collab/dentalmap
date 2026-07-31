"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { cn } from "./cn";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Centered dialog with backdrop, Escape-to-close and scroll lock. */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useDialogA11y(open, onClose, dialogRef);

  if (!open) {
    return null;
  }

  return (
    // Centred inside the TELEGRAM viewport, not the layout viewport — otherwise
    // the dialog sits visually low by half the host-chrome height.
    <div className="fixed inset-x-0 top-0 z-50 flex h-[var(--tg-viewport-height,100svh)] items-center justify-center p-4">
      {/* Dismiss on the backdrop, not the wrapper, so a pointer-up over the
          backdrop after selecting text inside the panel no longer closes it. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 touch-none bg-black/55 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog oynasi"}
        tabIndex={-1}
        className={cn(
          // Without max-h + overflow, content taller than the viewport was
          // unreachable: the panel sat in a position:fixed box that never
          // scrolled, so a dialog's buttons fell off-screen with the keyboard up.
          "relative z-10 max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-card bg-surface-0 p-5 shadow-float no-scrollbar",
          "animate-[modal-in_0.18s_ease-out]",
          className
        )}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-bold text-ink-900">{title}</h2>
            <button
              type="button"
              aria-label="Yopish"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-surface-100"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
