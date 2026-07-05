"use client";

import { Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Sheet, TextareaField, cn } from "../ui";

/** Uzbek rating captions surfaced under the star row (index = value - 1). */
const RATING_LABELS = ["Yomon", "Qoniqarsiz", "O'rtacha", "Yaxshi", "A'lo"] as const;

export type RatingPromptSheetProps = {
  open: boolean;
  /** Doctor being rated — shown as the sheet subtitle. */
  doctorName: string;
  /**
   * Persist the review. Return a non-empty string to surface an inline error and
   * keep the sheet open; return "" / void on success (the parent closes the sheet).
   */
  onSubmit: (rating: number, comment: string) => Promise<string | void>;
  /** "Keyinroq" / backdrop / X — dismiss without rating. */
  onDismiss: () => void;
};

/**
 * Yandex-style post-visit rating prompt: a big row of five tappable stars, an
 * optional comment, and a submit gated on a chosen star. Reuses the shared Sheet
 * primitive so it matches every other bottom sheet in the app.
 */
export function RatingPromptSheet({ open, doctorName, onSubmit, onDismiss }: RatingPromptSheetProps) {
  const [rating, setRating] = useState(0);
  // Hover preview (desktop) — falls back to the committed rating for the fill.
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fresh state every time the sheet is (re)opened.
  useEffect(() => {
    if (open) {
      setRating(0);
      setHover(0);
      setComment("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const activeValue = hover || rating;

  async function submit() {
    if (rating === 0) {
      setError("Iltimos, avval baho tanlang.");
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(rating, comment.trim());
    setSubmitting(false);
    if (typeof result === "string" && result) {
      setError(result);
      return;
    }
    // Success: the parent flips `open` to false and unmounts the sheet.
  }

  return (
    <Sheet open={open} onClose={onDismiss} title="Qabulingizni baholang">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          <span className="font-semibold text-ink-700">{doctorName}</span> bilan qabulingiz qanday o&apos;tdi?
        </p>

        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-50 py-5">
          <div
            className="flex items-center gap-2"
            aria-label="Reyting tanlash"
            onMouseLeave={() => setHover(0)}
          >
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              const filled = value <= activeValue;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} yulduz`}
                  aria-pressed={value <= rating}
                  onClick={() => {
                    setRating(value);
                    setError("");
                  }}
                  onMouseEnter={() => setHover(value)}
                  className={cn(
                    "transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-full active:scale-90",
                    filled ? "text-warning" : "text-surface-200 hover:text-ink-400"
                  )}
                >
                  <Star size={40} strokeWidth={1.75} className={cn(filled && "fill-warning")} />
                </button>
              );
            })}
          </div>
          <span
            className={cn(
              "text-sm font-semibold transition-colors",
              activeValue ? "text-ink-700" : "text-ink-400"
            )}
          >
            {activeValue ? RATING_LABELS[activeValue - 1] : "Yulduzni tanlang"}
          </span>
        </div>

        <TextareaField
          label="Izoh (ixtiyoriy)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Shifokor haqida fikringiz"
        />

        {error && <small className="text-xs font-medium text-danger">{error}</small>}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            type="button"
            disabled={rating === 0 || submitting}
            onClick={() => void submit()}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} />}
            {submitting ? "Yuborilmoqda…" : "Yuborish"}
          </Button>
          <Button variant="ghost" size="lg" type="button" disabled={submitting} onClick={onDismiss}>
            Keyinroq
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
