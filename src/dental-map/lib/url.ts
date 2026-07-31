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
