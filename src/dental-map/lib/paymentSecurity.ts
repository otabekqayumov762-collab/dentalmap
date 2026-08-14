/**
 * Payme checkout guard. The backend returns a hosted checkout URL and the app
 * navigates the doctor to it, so an attacker-influenced response must never be
 * able to send them to an arbitrary origin. Only an exact, build-configured
 * Payme host is accepted.
 *
 * The env var is read at CALL time, not at module load: under
 * `node --experimental-strip-types --test` nothing seeds NEXT_PUBLIC_* before the
 * module is imported, so a module-scope read would freeze an empty allowlist and
 * make every test assertion vacuously false.
 */
export function configuredPaymeCheckoutHosts() {
  const configured = process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS?.trim() || "";
  return new Set(
    configured
      .split(",")
      .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean)
  );
}

/** Accept only an exact, build-configured Payme host. Subdomains, credentials,
 *  non-standard ports and lookalike suffixes are rejected. */
export function isAllowedPaymeCheckoutUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      configuredPaymeCheckoutHosts().has(host)
    );
  } catch {
    return false;
  }
}

const RECEIPT_DOCUMENT_PATH_PREFIX = "/api/v1/billing/receipt-document/";

/**
 * The origin the signed receipt document is allowed to live on: the v1 API base
 * when it is configured, otherwise the plain API base (which the client suffixes
 * with `/api/v1`). Same precedence as `getApiV1Url`, but read straight from the
 * build-time env instead of importing it — this module has to stay dependency-free
 * so `tests/security.test.mjs` can load it under `node --experimental-strip-types`,
 * and an allowlist pinned to a configured value is stronger than one derived from
 * a runtime `window.location.origin` fallback.
 *
 * Read at CALL time for the same reason as the Payme host list above.
 */
function configuredApiOrigin() {
  const base =
    process.env.NEXT_PUBLIC_API_V1_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  // `same-origin` (the token dentalMapApi.ts defines; duplicated here for the
  // same reason the precedence above is duplicated — this module must not import
  // anything). It is the ONE case where the app's own origin is the right
  // allowlist: the document is served by our API on the very host that served
  // this page. Before a window exists there is no origin to compare against, so
  // it keeps failing closed.
  if (base === "same-origin") {
    return typeof window === "undefined" ? "" : window.location.origin;
  }
  return base ? new URL(base).origin : "";
}

/**
 * Receipt document guard, deliberately a different rule from the Payme one: this
 * page is served by OUR OWN v1 API, so the single legitimate origin is the one the
 * app is already configured to talk to — no extra allowlist env var to forget, and
 * `http://localhost` keeps working in dev. The check still matters: the URL arrives
 * inside an API response and is handed straight to `Telegram.WebApp.openLink`, so a
 * tampered `receipt_url` must not be able to steer the doctor at another origin.
 *
 * `URL.origin` drops embedded credentials, so `user:pass@` has to be rejected
 * separately or `https://evil@api.example/...` would compare as the API origin.
 */
export function isAllowedReceiptDocumentUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  try {
    const allowedOrigin = configuredApiOrigin();
    const url = new URL(value);
    return (
      Boolean(allowedOrigin) &&
      url.origin === allowedOrigin &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(RECEIPT_DOCUMENT_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}

/**
 * Opens the signed receipt document, returning false when the URL is not an allowed
 * receipt-document URL so the caller can say so instead of leaving a button that
 * does nothing.
 *
 * `openLink` is tried FIRST, not as a fallback: inside Telegram's WebView
 * `window.open` is frequently a silent no-op, so the browser path alone would look
 * broken on the platform most doctors use. It is also why the server renders a
 * printable HTML page instead of a download — Telegram's iOS WebView drops
 * `blob:`/`<a download>` navigations, a lesson `openPaymeCheckout` already records.
 *
 * The return value of `window.open` cannot gate a further fallback: with `noopener`
 * the spec mandates a null return even on success, so a third attempt would
 * double-open the page.
 */
export function openReceiptDocument(url: string) {
  if (typeof window === "undefined" || !isAllowedReceiptDocumentUrl(url)) {
    return false;
  }
  const href = new URL(url).href;
  const telegram = window.Telegram?.WebApp;
  if (telegram?.openLink) {
    telegram.openLink(href, { try_instant_view: false });
    return true;
  }
  const opened = window.open(href, "_blank", "noopener,noreferrer");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // noopener remains the primary protection for cross-origin windows.
    }
  }
  return true;
}

/** The server is the price authority; the client must refuse a mismatch rather
 *  than send the doctor to a checkout for an amount it never showed them. */
export function paymeAmountMatches(returned: unknown, expectedUzs: number | null) {
  if (expectedUzs === null || !Number.isFinite(expectedUzs)) {
    return false;
  }
  const value = typeof returned === "string" ? Number(returned) : returned;
  return typeof value === "number" && Number.isFinite(value) && Number(value) === Number(expectedUzs);
}
