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
  const dragDelta = useRef(0);
  const rafId = useRef<number | null>(null);
  const titleId = useId();
  useDialogA11y(open, onClose, sheetRef);

  if (!open) {
    return null;
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    const sheet = sheetRef.current;
    if (sheet) {
      // `sheet-in` animates `transform` too, and a CSS animation outranks an
      // author inline style — without neutralising it the drag does nothing at
      // all for the first 220ms while the sheet is still animating in.
      sheet.style.animation = "none";
      sheet.style.transition = "none";
    }
  };

  const paintDrag = () => {
    rafId.current = null;
    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }
    // Clearing on non-positive delta matters: dragging down then back up used to
    // leave the sheet stuck at the last positive offset.
    sheet.style.transform = dragDelta.current > 0 ? `translateY(${dragDelta.current}px)` : "";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) {
      return;
    }
    dragDelta.current = event.clientY - dragStart.current;
    if (rafId.current === null) {
      rafId.current = window.requestAnimationFrame(paintDrag);
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    if (dragStart.current === null || !sheet) {
      return;
    }
    const delta = event.clientY - dragStart.current;
    dragStart.current = null;
    dragDelta.current = 0;
    if (rafId.current !== null) {
      window.cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (delta > 90) {
      onClose();
      return;
    }
    // Spring back instead of teleporting; the element carries no transition class.
    sheet.style.transition = "transform 200ms ease-out";
    sheet.style.transform = "";
  };

  return (
    // Sized to the TELEGRAM viewport, not the layout viewport: `vh` includes the
    // Telegram host chrome on iOS, which pushed a tall sheet under the header.
    <div className="fixed inset-x-0 top-0 z-50 flex h-[var(--tg-viewport-height,100svh)] items-end justify-center pt-8">
      {/* Dismiss lives on the backdrop, not the wrapper, so a drag that starts in
          the panel and ends over the backdrop no longer closes the sheet.
          `touch-none` stops a backdrop pan from scrolling the page behind it. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 touch-none bg-black/55 backdrop-blur-sm"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Tanlash oynasi"}
        tabIndex={-1}
        className={cn(
          // `max-h-full` = 100% of the wrapper's content box, so the wrapper's
          // pt-8 is what leaves the breathing room at the top.
          "relative z-10 flex max-h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-sheet bg-surface-0 p-5 pb-7 shadow-float animate-[sheet-in_0.22s_ease-out] no-scrollbar",
          className
        )}
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
