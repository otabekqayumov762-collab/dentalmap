"use client";

/**
 * Progress header for the doctor wizard.
 *
 * Replaces the hardcoded `grid grid-cols-3` bar strip, which could only ever
 * describe three steps. One continuous track with a proportional fill scales to
 * any N and, unlike N separate bars, does not shrink each segment to a sliver as
 * steps are added.
 *
 * The teal→blue fill is the one place the brand gradient shows up on EVERY page
 * of the flow; it is what makes seven separate panes read as one journey.
 */
export function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  const percent = Math.max(0, Math.min(100, (step / total) * 100));

  return (
    <div className="rounded-card border border-surface-200 bg-surface-0 p-4 shadow-card dark:bg-surface-50">
      {/* A real progressbar, not a decorative div: panes swap via a `hidden`
          class and nothing moves focus, so without this a screen-reader user got
          six silent transitions across the flow with no idea anything changed. */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-pill bg-control-border/40"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuetext={`${total} qadamdan ${step}-si: ${title}`}
      >
        <div
          className="h-full rounded-pill bg-gradient-to-r from-brand-700 to-accent-600 motion-safe:transition-[width] motion-safe:duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* aria-live on the wrapper, so the title AND the counter are announced
          together as one change rather than as two unrelated updates. */}
      <div className="mt-3 flex items-center justify-between gap-3" aria-live="polite">
        <span role="heading" aria-level={2} className="min-w-0 truncate text-sm font-black text-ink-900">
          {title}
        </span>
        {/* ink-500, not ink-400: in dark theme the unfilled track is the only
            other carrier of "how much is left", and it measures 1.23:1 against
            this card — so the counter was doing that job alone at 2.99:1. */}
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-500">
          {step}/{total}
        </span>
      </div>
    </div>
  );
}
