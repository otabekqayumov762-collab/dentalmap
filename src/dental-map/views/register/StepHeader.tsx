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
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-200" aria-hidden="true">
        <div
          className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span role="heading" aria-level={2} className="min-w-0 truncate text-[15px] font-black text-ink-900">
          {title}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-400">
          {step}/{total}
        </span>
      </div>
    </div>
  );
}
