"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm" />
      <div
        ref={sheetRef}
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-sheet bg-surface-0 p-5 pb-7 shadow-float animate-[sheet-in_0.22s_ease-out]",
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
          {title ? <h2 className="text-lg font-bold text-ink-900">{title}</h2> : <span />}
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
