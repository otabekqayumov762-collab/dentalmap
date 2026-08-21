const YANDEX_HOSTS = [
  "yandex.com",
  "yandex.ru",
  "yandex.uz",
  "yandex.kz",
  "yandex.by",
  "yandex.com.tr",
  "yandex.tj",
  "yandex.tm",
  "yandex.kg",
  "yandex.az",
  "yandex.ge",
  "yandex.am",
  "yandex.md"
] as const;

const COORDINATE_RE = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;
const GOOGLE_AT_RE = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;

function parseSafeHttpUrl(value?: string | null) {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function matchesHost(hostname: string, allowedHost: string) {
  return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
}

/** True only for credential-free http(s) URLs; blocks script/data schemes. */
export function isSafeHttpUrl(value?: string | null) {
  return Boolean(parseSafeHttpUrl(value));
}

/** Google's own redirector. It answers on maps.google.com as well as on the
 *  root domain, so the refusal is host-wide: a clinic link is shown to patients
 *  as a "open the route" button, and /url?q= would bounce them onto any site
 *  while still reading as google.com in the address bar. */
function isGoogleRedirector(pathname: string) {
  return pathname === "/url";
}

function isMapPath(pathname: string) {
  return pathname === "/maps" || pathname.startsWith("/maps/");
}

export type MapUrlProblem =
  | ""
  | "invalid"
  | "insecure"
  | "credentials"
  | "host"
  | "path"
  | "redirector";

/** Why a clinic link is unusable, or "" when it is fine.
 *
 *  The host is what is actually checked; the path only narrows hosts that serve
 *  more than maps. A host that already IS the maps subdomain does not file its
 *  pages under /maps -- maps.yandex.com/location-sharing and
 *  maps.google.com/place/... are ordinary map links -- so demanding /maps there
 *  refused real links for no gain. On the root domain (google.com, yandex.uz)
 *  /maps still has to be there, because those hosts also serve /url and /search.
 */
export function mapUrlProblem(value?: string | null): MapUrlProblem {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "invalid";
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "invalid";
  }
  if (url.username || url.password) {
    return "credentials";
  }
  if (url.protocol === "http:") {
    return "insecure";
  }
  if (url.protocol !== "https:") {
    return "invalid";
  }

  const hostname = url.hostname.toLowerCase();
  if (matchesHost(hostname, "maps.app.goo.gl")) {
    return "";
  }
  if (matchesHost(hostname, "google.com")) {
    if (isGoogleRedirector(url.pathname)) {
      return "redirector";
    }
    return hostname === "maps.google.com" || isMapPath(url.pathname) ? "" : "path";
  }

  const yandexRoot = YANDEX_HOSTS.find((allowedHost) => matchesHost(hostname, allowedHost));
  if (!yandexRoot) {
    return "host";
  }
  return hostname === `maps.${yandexRoot}` || isMapPath(url.pathname) ? "" : "path";
}

/** New clinic links must be HTTPS and point to an explicit Google/Yandex host. */
export function isSafeMapUrl(value?: string | null) {
  return mapUrlProblem(value) === "";
}

function validCoordinatePair(latitudeValue: string, longitudeValue: string) {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function matchCoordinatePair(value: string) {
  const match = COORDINATE_RE.exec(value);
  return Boolean(match && validCoordinatePair(match[1], match[2]));
}

/** Hosts that answer with a redirect rather than a point — Google's own "Share"
 *  button produces one. The server resolves these; refusing them here would
 *  reject the exact link the instruction asks people to send. */
const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl", "clck.ru"];

export function isShortMapLink(value?: string | null) {
  const url = parseSafeHttpUrl(value);
  if (!url) {
    return false;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return SHORT_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** The part of a Yandex URL that names the map page, with the /maps prefix
 *  taken off. maps.yandex.uz/org/x and yandex.uz/maps/org/x are the same page
 *  reached two ways, so both have to reduce to "/org/x" before anything can
 *  reason about them. Returns null when the host is not Yandex at all. */
function yandexMapPath(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const root = YANDEX_HOSTS.find((allowedHost) => matchesHost(hostname, allowedHost));
  if (!root) {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/maps") {
    return "/";
  }
  if (path.startsWith("/maps/")) {
    return path.slice(5);
  }
  return hostname === `maps.${root}` ? path : null;
}

/** Yandex's "real-time location" share. It is a genuine map link, which is why
 *  it must be named rather than lumped in with "not a maps link" — but it points
 *  at a moving phone, not at a place. Its page carries no clinic point (only the
 *  viewer's region centre), and a point read off it would be somewhere else
 *  tomorrow, so it can never become a clinic pin. */
export function isLiveLocationLink(value?: string | null) {
  const url = parseSafeHttpUrl(value);
  return Boolean(url && yandexMapPath(url) === "/location-sharing");
}

/** Links with no point in the URL that the server can still resolve to one:
 *  the shorteners above, Yandex's own /maps/-/ share codes (the redirect lands
 *  on a ?ll= URL) and Yandex organisation pages (the page states the point).
 *  Refusing these at the form would reject the links people actually copy. */
export function isResolvableMapLink(value?: string | null) {
  if (isShortMapLink(value)) {
    return true;
  }
  const url = parseSafeHttpUrl(value);
  if (!url || url.protocol !== "https:") {
    return false;
  }
  const path = yandexMapPath(url);
  return Boolean(path && (path.startsWith("/-/") || path.startsWith("/org/")));
}

/** Mirrors the backend coordinate extraction contract for Google/Yandex links. */
export function mapUrlHasCoordinates(value?: string | null) {
  if (!value) {
    return false;
  }
  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // A malformed escape cannot form a trustworthy coordinate URL.
    return false;
  }

  const googleAt = GOOGLE_AT_RE.exec(decoded);
  if (googleAt && validCoordinatePair(googleAt[1], googleAt[2])) {
    return true;
  }

  const url = parseSafeHttpUrl(decoded);
  if (!url) {
    return false;
  }
  for (const key of ["q", "query", "text"] as const) {
    if (url.searchParams.getAll(key).some(matchCoordinatePair)) {
      return true;
    }
  }
  for (const key of ["ll", "pt"] as const) {
    for (const coordinate of url.searchParams.getAll(key)) {
      const [longitude, latitude, ...rest] = coordinate.split(",").map((part) => part.trim());
      if (!rest.length && latitude && longitude && validCoordinatePair(latitude, longitude)) {
        return true;
      }
    }
  }

  return matchCoordinatePair(decoded);
}

export const MAP_COORDINATE_REQUIRED_MESSAGE =
  "Bu xarita havolasida aniq nuqta yo'q. Xaritada klinikaning o'zini bosing (yoki uning sahifasini oching) va shundan keyin chiqqan havolani nusxalang.";

/** One message per reason. A refusal that names the wrong problem is still a
 *  refusal the person cannot act on — "Yandex yoki Google Maps linkini kiriting"
 *  was shown to someone who had pasted exactly that. */
const MAP_LINK_MESSAGES = {
  invalid: "Havola to'liq emas. To'liq manzilni, https:// qismi bilan birga joylashtiring.",
  insecure: "Havola https:// bilan boshlanishi kerak. Manzil boshidagi http:// ni https:// ga almashtiring.",
  credentials: "Havolada login yoki parol bor. Xaritadan olingan toza havolani joylashtiring.",
  host: "Bu Google Maps yoki Yandex Maps havolasi emas. Klinikani shu ikki xaritaning birida toping va o'sha yerdagi havolani joylashtiring.",
  path: "Bu havola Google/Yandex saytiga olib boradi, lekin xarita sahifasiga emas. Klinikani xaritada oching va manzil qatoridagi havolani nusxalang.",
  redirector:
    "Bu Google'ning yo'naltiruvchi havolasi — u boshqa saytga olib o'tadi. Uni brauzerda oching va ochilgan xarita sahifasining havolasini nusxalang."
} as const;

const LIVE_LOCATION_MESSAGE =
  "Bu — real vaqtdagi joylashuv («Joylashuvni ulashish») havolasi: u telefon bilan birga harakatlanadi va klinikaning doimiy manzilini bildirmaydi. Xaritada klinikani toping va uning sahifasidagi havolani joylashtiring.";

export function mapLinkValidationError(value: string) {
  const problem = mapUrlProblem(value);
  if (problem) {
    return MAP_LINK_MESSAGES[problem];
  }
  // Named on its own: it is a valid map link, so "not a maps link" would send
  // the doctor looking for a fault that is not there.
  if (isLiveLocationLink(value)) {
    return LIVE_LOCATION_MESSAGE;
  }
  // These carry no coordinates YET — the server follows them. Rejecting them
  // here told the doctor to fix something that was already correct.
  if (isResolvableMapLink(value)) {
    return "";
  }
  if (!mapUrlHasCoordinates(value)) {
    return MAP_COORDINATE_REQUIRED_MESSAGE;
  }
  return "";
}

export function isSafeTelegramUrl(value?: string | null) {
  const url = parseSafeHttpUrl(value);
  return Boolean(
    url &&
      url.protocol === "https:" &&
      ["t.me", "telegram.me"].includes(url.hostname.toLowerCase())
  );
}

/** Opens an external URL in a new tab only when its scheme is safe. */
export function openExternal(value?: string | null) {
  const url = parseSafeHttpUrl(value);
  if (!url) {
    return;
  }
  const opened = window.open(url.href, "_blank", "noopener,noreferrer");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // Some cross-origin WindowProxy implementations deny property writes;
      // noopener in the feature string remains the primary protection.
    }
  }
}
