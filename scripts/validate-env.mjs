import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) {
    continue;
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

function fail(message) {
  console.error(`Build configuration error: ${message}`);
  process.exit(1);
}

function validatePublicUrl(name, rawValue, { requireHttps = true } = {}) {
  let url;
  try {
    url = new URL(rawValue);
  } catch {
    fail(`${name} must be a valid absolute URL.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    fail(`${name} must use http or https.`);
  }

  if (url.username || url.password) {
    fail(`${name} must not contain credentials.`);
  }

  if (url.search || url.hash) {
    fail(`${name} must not contain query strings or fragments.`);
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const insecureAllowed = process.env.ALLOW_INSECURE_API_URL === "true";
  if (requireHttps && url.protocol !== "https:" && !localHosts.has(url.hostname) && !insecureAllowed) {
    fail(`${name} must be https outside local development.`);
  }

  return url;
}

if (!rawApiUrl && process.env.GITHUB_PAGES === "true") {
  console.log("GITHUB_PAGES=true: backend API URL validation skipped for static preview build.");
} else if (!rawApiUrl) {
  fail("NEXT_PUBLIC_API_URL is required for production/static builds.");
} else {
  const apiUrl = validatePublicUrl("NEXT_PUBLIC_API_URL", rawApiUrl);
  console.log(`Build API URL validated: ${apiUrl.origin}`);
}

const rawApiV1Url = process.env.NEXT_PUBLIC_API_V1_URL?.trim() || "";
if (rawApiV1Url) {
  const apiV1Url = validatePublicUrl("NEXT_PUBLIC_API_V1_URL", rawApiV1Url);
  if (!apiV1Url.pathname.replace(/\/+$/, "").endsWith("/api/v1")) {
    fail("NEXT_PUBLIC_API_V1_URL must include the /api/v1 path.");
  }
  console.log(`Build API v1 URL validated: ${apiV1Url.origin}${apiV1Url.pathname.replace(/\/+$/, "")}`);
}

const rawMediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL?.trim() || "";
if (rawMediaUrl) {
  const mediaUrl = validatePublicUrl("NEXT_PUBLIC_MEDIA_URL", rawMediaUrl);
  console.log(`Build media origin validated: ${mediaUrl.origin}`);
}

function validateTelegramUrl(name, rawValue) {
  if (!rawValue) {
    return;
  }
  const url = validatePublicUrl(name, rawValue);
  if (url.protocol !== "https:" || !["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    fail(`${name} must use an official https://t.me or https://telegram.me URL.`);
  }
}

validateTelegramUrl("NEXT_PUBLIC_BOT_URL", process.env.NEXT_PUBLIC_BOT_URL?.trim());
const rawSupportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "";
validateTelegramUrl("NEXT_PUBLIC_SUPPORT_URL", rawSupportUrl);
if (/\/(?:your_support|your_bot)\/?$/i.test(rawSupportUrl)) {
  fail("NEXT_PUBLIC_SUPPORT_URL must not use the .env.example placeholder value.");
}

// Cookie mode keeps the refresh credential in an HttpOnly cookie, unreachable to
// JavaScript. `legacy-session` puts it back in web storage, so it must never be
// selectable by a typo — it requires a second, explicitly non-public build flag.
const authMode = process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE?.trim() || "cookie";
if (!["cookie", "legacy-session"].includes(authMode)) {
  fail("NEXT_PUBLIC_AUTH_TOKEN_MODE must be cookie or legacy-session.");
}
if (authMode === "legacy-session" && process.env.ALLOW_LEGACY_SESSION_AUTH !== "true") {
  fail("legacy-session auth requires the explicit non-public ALLOW_LEGACY_SESSION_AUTH=true build flag.");
}

// The doctor payment button opens only a checkout URL whose host is on this list.
// Deliberately OPTIONAL (empty simply keeps online Payme unavailable) so a build
// without payments configured still succeeds — but whenever a value IS given,
// every entry must be an exact hostname: no scheme, no path, no wildcard. A typo
// like "*.paycom.uz" or "https://checkout.paycom.uz" would silently never match
// and the doctor would just see "Payme ruxsat etilgan manzilni qaytarmadi".
const checkoutHosts = (process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS || "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
for (const host of checkoutHosts) {
  if (
    host.includes("://") ||
    host.includes("/") ||
    host.includes("*") ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
  ) {
    fail(`Invalid exact Payme checkout host: ${host}`);
  }
}

const rawAdminPath = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
if (rawAdminPath && !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(rawAdminPath.replace(/^\/+|\/+$/g, ""))) {
  fail("NEXT_PUBLIC_ADMIN_URL must be a same-origin path (for example: admin).");
}
