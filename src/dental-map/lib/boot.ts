/**
 * Boot watchdog: turn a silent blank screen into a readable message.
 *
 * The statically exported shell for `/` is a spinner and nothing else. Every
 * distinct client-side failure — a script that never arrives, a hydration that
 * never runs, a JS error before the first paint — therefore looks identical to
 * the user and identical to us: a teal spinner that never stops. "It doesn't
 * open" is all anybody can report, and a white screen is indistinguishable from
 * "the app is broken".
 *
 * So the prerendered HTML carries its own fallback: an inline, dependency-free
 * script (it must run even when nothing else does) that reveals a real message
 * after {@link BOOT_WATCHDOG_TIMEOUT_MS} unless the React root has signalled
 * that it mounted.
 */

/** Element that holds the failure message; hidden until the watchdog fires. */
export const BOOT_FALLBACK_ID = "dental-boot-fallback";

/** Reload button inside the fallback. Wired up by the watchdog, not by React —
 * the whole point is that React may never have run. It cannot be an `onclick`
 * attribute either: the CSP sets `script-src-attr 'none'`. */
export const BOOT_RETRY_ID = "dental-boot-retry";

/** Set on <html> once the React root mounts. The watchdog's only "all good" signal. */
export const BOOT_READY_ATTRIBUTE = "data-dental-map-ready";

/**
 * How long to wait before declaring the boot failed.
 *
 * A healthy open hydrates in about 2s. useTelegram then polls up to 2.5s for the
 * Telegram SDK, so anything under ~5s would accuse a merely slow network.
 */
export const BOOT_WATCHDOG_TIMEOUT_MS = 8000;

/**
 * Inline watchdog source, injected verbatim into <head>.
 *
 * Deliberately ES5: this is the one script that has to survive the oldest
 * WebView in the fleet, because it is what explains the failure on devices where
 * the app itself may not run.
 */
export const bootWatchdogScript = `(function(){var d=document;window.setTimeout(function(){if(d.documentElement.getAttribute(${JSON.stringify(
  BOOT_READY_ATTRIBUTE
)})==="1"){return;}var f=d.getElementById(${JSON.stringify(
  BOOT_FALLBACK_ID
)});if(!f){return;}f.hidden=false;var r=d.getElementById(${JSON.stringify(
  BOOT_RETRY_ID
)});if(r){r.addEventListener("click",function(){window.location.reload();});}},${BOOT_WATCHDOG_TIMEOUT_MS});})();`;

/**
 * Called from an effect in the React root: proves hydration completed.
 *
 * Also re-hides the fallback, for the case where the app came up *after* the
 * watchdog gave up — a late boot should not leave the error covering a working app.
 */
export function markAppMounted(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute(BOOT_READY_ATTRIBUTE, "1");
  const fallback = document.getElementById(BOOT_FALLBACK_ID);
  if (fallback) {
    fallback.hidden = true;
  }
}
