/**
 * What the toast list becomes when a new message arrives.
 *
 * Pulled out of the provider so it can be tested: the two behaviours here were
 * both born from a screenshot of the app with FIVE identical error toasts
 * stacked over the form, and neither is provable while it lives inside a React
 * callback wired to timers.
 */

export type ToastVariant = "error" | "success" | "info";

export type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
  /** Bumped each time the same message arrives while this toast is up. The host
   *  keys the toast on it so the entry animation replays: without a bump the
   *  refresh is invisible and a second tap looks like a dead button. */
  repeats: number;
};

/** Above this the stack hides the very form the messages are about. Three shows
 *  that more than one thing is wrong without taking the screen. */
export const MAX_VISIBLE_TOASTS = 3;

export type ToastQueueResult = {
  toasts: ToastItem[];
  /** Set when the incoming message matched one already on screen, so the caller
   *  restarts THAT toast's timer instead of arming a new one. */
  refreshedId: number | null;
  /** Toasts pushed off the end by the cap; their timers must be cleared. */
  droppedIds: number[];
};

export function reduceToasts(
  current: ToastItem[],
  incoming: ToastItem,
  cap: number = MAX_VISIBLE_TOASTS
): ToastQueueResult {
  const duplicate = current.find(
    (item) => item.variant === incoming.variant && item.message === incoming.message
  );

  // A repeat restarts the clock rather than stacking a copy. Refreshing rather
  // than ignoring matters: a user who taps twice needs to see that the tap
  // registered, and silence reads as a dead button. Moving it to the end is only
  // visible when something else is stacked above it, so the repeat count carries
  // the feedback in the one-toast case -- which is the case in the screenshot.
  if (duplicate) {
    const refreshed = { ...duplicate, repeats: duplicate.repeats + 1 };
    return {
      toasts: [...current.filter((item) => item.id !== duplicate.id), refreshed],
      refreshedId: duplicate.id,
      droppedIds: []
    };
  }

  // Distinct messages still pile up -- a form with four bad fields would bury
  // the form under its own complaints. Oldest goes first so the newest, which
  // is what the last action produced, is always the one on screen.
  const grown = [...current, incoming];
  const overflow = Math.max(0, grown.length - cap);
  return {
    toasts: grown.slice(overflow),
    refreshedId: null,
    droppedIds: grown.slice(0, overflow).map((item) => item.id)
  };
}
