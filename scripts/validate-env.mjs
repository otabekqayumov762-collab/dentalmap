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

if (!rawApiUrl && process.env.GITHUB_PAGES === "true") {
  console.log("GITHUB_PAGES=true: backend API URL validation skipped for static preview build.");
} else if (!rawApiUrl) {
  fail("NEXT_PUBLIC_API_URL is required for production/static builds.");
} else {
  let apiUrl;
  try {
    apiUrl = new URL(rawApiUrl);
  } catch {
    fail("NEXT_PUBLIC_API_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(apiUrl.protocol)) {
    fail("NEXT_PUBLIC_API_URL must use http or https.");
  }

  if (apiUrl.username || apiUrl.password) {
    fail("NEXT_PUBLIC_API_URL must not contain credentials.");
  }

  if (apiUrl.search || apiUrl.hash) {
    fail("NEXT_PUBLIC_API_URL must not contain query strings or fragments.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const insecureAllowed = process.env.ALLOW_INSECURE_API_URL === "true";

  if (apiUrl.protocol !== "https:" && !localHosts.has(apiUrl.hostname) && !insecureAllowed) {
    fail("NEXT_PUBLIC_API_URL must be https outside local development.");
  }

  console.log(`Build API URL validated: ${apiUrl.origin}`);
}

for (const name of ["NEXT_PUBLIC_SHEETS_WEBHOOK_URL", "NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL"]) {
  const rawOptionalUrl = process.env[name]?.trim();
  if (!rawOptionalUrl) {
    continue;
  }

  let optionalUrl;
  try {
    optionalUrl = new URL(rawOptionalUrl);
  } catch {
    fail(`${name} must be a valid absolute URL when provided.`);
  }

  if (optionalUrl.protocol !== "https:") {
    fail(`${name} must use https.`);
  }

  if (optionalUrl.username || optionalUrl.password) {
    fail(`${name} must not contain credentials.`);
  }

  console.log(`${name} origin validated: ${optionalUrl.origin}`);
}
