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
validateTelegramUrl("NEXT_PUBLIC_SUPPORT_URL", process.env.NEXT_PUBLIC_SUPPORT_URL?.trim());

const rawAdminPath = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
if (rawAdminPath && !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(rawAdminPath.replace(/^\/+|\/+$/g, ""))) {
  fail("NEXT_PUBLIC_ADMIN_URL must be a same-origin path (for example: admin).");
}
