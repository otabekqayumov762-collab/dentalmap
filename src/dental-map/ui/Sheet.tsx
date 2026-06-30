"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "./cn";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Bottom sheet that slides up from the bottom — ideal for pickers on mobile. */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm" />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-sheet bg-surface-0 p-5 pb-7 shadow-float",
          "animate-[sheet-in_0.22s_ease-out]",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="mx-auto mb-4 block h-1.5 w-10 rounded-pill bg-surface-200" aria-hidden="true" />
        {title && <h2 className="mb-3 text-lg font-bold text-ink-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
