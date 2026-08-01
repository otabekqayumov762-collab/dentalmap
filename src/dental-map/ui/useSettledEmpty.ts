"use client";

import { useEffect, useState } from "react";

/**
 * True once `empty` has stayed true for `delayMs` without interruption.
 *
 * Admin-managed option lists (specialties, services) arrive over the network, so
 * a control renders with zero options for the first few hundred milliseconds of
 * a cold start. Announcing "the list is empty" in that window would be a lie
 * that corrects itself — the delay lets a normal load win the race, and only a
 * list that is genuinely empty ever explains itself.
 */
export function useSettledEmpty(empty: boolean, delayMs = 600) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!empty) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [empty, delayMs]);

  return settled;
}
