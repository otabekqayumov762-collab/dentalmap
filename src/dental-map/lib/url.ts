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

/** New clinic links must be HTTPS and point to an explicit Google/Yandex host. */
export function isSafeMapUrl(value?: string | null) {
  const url = parseSafeHttpUrl(value);
  if (!url || url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  const mapPath = url.pathname === "/maps" || url.pathname.startsWith("/maps/");
  if (matchesHost(hostname, "maps.app.goo.gl")) {
    return true;
  }
  if (matchesHost(hostname, "google.com")) {
    // Block generic Google redirect endpoints such as /url?q=... while keeping
    // canonical www.google.com/maps and maps.google.com share links.
    return mapPath || (hostname === "maps.google.com" && url.pathname === "/");
  }

  const yandexRoot = YANDEX_HOSTS.find((allowedHost) => matchesHost(hostname, allowedHost));
  return Boolean(yandexRoot && (mapPath || (hostname === `maps.${yandexRoot}` && url.pathname === "/")));
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
