"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up from zero when it first comes into view.
 *
 * Two rules it must not break.
 *
 * It never shows a number larger than the real one, not even for a frame: the
 * whole point of these counters is that they are the true counts, and an
 * animation that overshoots and settles back would be showing a figure that was
 * never true. The easing is therefore clamped to end exactly on the value.
 *
 * And it respects prefers-reduced-motion by rendering the final number outright.
 * Counting digits are exactly the kind of movement that setting exists for.
 */
export function CountUp({ value, durationMs = 1600 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(0);
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const startedFor = useRef<number | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    if (value <= 0) {
      setShown(0);
      return;
    }
    // Re-run when the value changes (a later API response), but never restart
    // the same number just because the element scrolled past twice.
    if (startedFor.current === value) {
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      startedFor.current = value;
      setShown(value);
      return;
    }

    let frame = 0;
    const run = () => {
      startedFor.current = value;
      const started = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / durationMs);
        // Ease-out cubic: fast first, settling gently. Math.min on the result as
        // well as the progress, so rounding can never print value + 1.
        const eased = 1 - Math.pow(1 - progress, 3);
        setShown(Math.min(value, Math.round(value * eased)));
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        }
      };
      frame = requestAnimationFrame(step);
    };

    if (typeof IntersectionObserver !== "function") {
      run();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={nodeRef} className="tabular-nums">
      {shown.toLocaleString("uz-UZ").replace(/,/g, " ")}
    </span>
  );
}
