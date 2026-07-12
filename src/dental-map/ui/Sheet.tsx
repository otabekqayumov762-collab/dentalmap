"use client";

import { X } from "lucide-react";
import { useId, useRef, type PointerEvent, type ReactNode } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { cn } from "./cn";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Bottom sheet — slides up, closes on backdrop tap, Escape, the X button, or a
 *  downward drag on the grab handle. */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<number | null>(null);
  const titleId = useId();
  useDialogA11y(open, onClose, sheetRef);

  if (!open) {
    return null;
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null || !sheetRef.current) {
      return;
    }
    const delta = event.clientY - dragStart.current;
    if (delta > 0) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null || !sheetRef.current) {
      return;
    }
    const delta = event.clientY - dragStart.current;
    sheetRef.current.style.transform = "";
    dragStart.current = null;
    if (delta > 90) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Tanlash oynasi"}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-sheet bg-surface-0 p-5 pb-7 shadow-float animate-[sheet-in_0.22s_ease-out] no-scrollbar",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="-mt-1 cursor-grab touch-none pb-2 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="mx-auto block h-1.5 w-10 rounded-pill bg-surface-200" aria-hidden="true" />
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 id={titleId} className="text-lg font-bold text-ink-900">{title}</h2> : <span />}
          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-surface-100"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
