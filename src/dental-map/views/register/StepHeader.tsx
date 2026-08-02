"use client";

/**
 * Where you are in the wizard.
 *
 * The previous version said the same thing three ways — a continuous bar, a
 * title, and a "4/6" counter — inside a card of its own, so a two-line fact took
 * four lines and a border.
 *
 * One segment per step says more than a percentage does: in a six-pane flow the
 * question is "how many screens left", and discrete marks answer it at a glance,
 * where 66% still has to be converted. The title becomes the page's actual
 * heading rather than a caption under a graphic, and the counter disappears
 * because the segments already carry it.
 */
export function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  const clamped = Math.max(1, Math.min(step, total));

  return (
    <div className="flex flex-col gap-2.5 px-1">
      <h2
        // aria-live because panes swap via a `hidden` class and nothing moves
        // focus — without it the flow is six silent transitions.
        aria-live="polite"
        className="text-xl font-black leading-tight tracking-tight text-ink-900"
      >
        {title}
      </h2>
      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuetext={`${total} qadamdan ${clamped}-si: ${title}`}
      >
        {Array.from({ length: total }, (_, index) => {
          const done = index < clamped;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={[
                "h-1 flex-1 rounded-pill motion-safe:transition-colors motion-safe:duration-300",
                // The completed run reads as one continuous stroke because the
                // segments share the brand ramp; the only visible boundary is the
                // one to the remaining steps, which is the boundary that matters.
                done ? "bg-gradient-to-r from-brand-500 to-accent-500" : "bg-control-border/40"
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
