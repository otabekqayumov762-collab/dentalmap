import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const outDir = resolve(process.argv[2] || "out");

if (!existsSync(outDir)) {
  console.error(`Static export directory not found: ${outDir}`);
  process.exit(1);
}

function getApiOrigin() {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  if (!rawApiUrl) {
    return "";
  }
  return new URL(rawApiUrl).origin;
}

function getOptionalOrigin(name) {
  const rawUrl = process.env[name]?.trim() || "";
  if (!rawUrl) {
    return "";
  }
  return new URL(rawUrl).origin;
}

function walkHtmlFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return walkHtmlFiles(path);
    }
    return path.endsWith(".html") ? [path] : [];
  });
}

function collectInlineScriptHashes(directory) {
  const hashes = new Set();
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

  for (const file of walkHtmlFiles(directory)) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(scriptPattern)) {
      const scriptBody = match[1];
      if (!scriptBody.trim()) {
        continue;
      }
      const digest = createHash("sha256").update(scriptBody).digest("base64");
      hashes.add(`'sha256-${digest}'`);
    }
  }

  return [...hashes].sort();
}

function createContentSecurityPolicy() {
  const apiOrigin = getApiOrigin();
  const sheetsOrigin =
    getOptionalOrigin("NEXT_PUBLIC_SHEETS_WEBHOOK_URL") ||
    getOptionalOrigin("NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL");
  // Yandex Maps (only relaxes CSP when a key is configured at build time).
  const yandexEnabled = Boolean(process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim());
  const yandex = yandexEnabled
    ? {
        script: ["https://api-maps.yandex.ru", "https://yastatic.net"],
        connect: ["https://api-maps.yandex.ru", "https://*.maps.yandex.net", "https://geocode-maps.yandex.ru"],
        img: ["https://api-maps.yandex.ru", "https://*.maps.yandex.net", "https://yastatic.net"],
        font: ["https://yastatic.net"]
      }
    : { script: [], connect: [], img: [], font: [] };

  const scriptSources = ["'self'", "https://telegram.org", ...yandex.script, ...collectInlineScriptHashes(outDir)];
  const connectSources = ["'self'", apiOrigin, "https://nominatim.openstreetmap.org", ...yandex.connect].filter(Boolean);
  if (sheetsOrigin && !connectSources.includes(sheetsOrigin)) {
    connectSources.push(sheetsOrigin);
  }
  const imageSources = [
    "'self'",
    "data:",
    apiOrigin,
    "https://images.unsplash.com",
    "https://tile.openstreetmap.org",
    ...yandex.img
  ].filter(Boolean);
  // Yandex Maps injects inline styles, so it needs 'unsafe-inline' for styles.
  const styleSrc = yandexEnabled ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";
  const fontSrc = `font-src 'self' data:${yandex.font.length ? ` ${yandex.font.join(" ")}` : ""}`;

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    `img-src ${imageSources.join(" ")}`,
    styleSrc,
    fontSrc,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join("; ");
}

function writeNetlifyHeaders(csp) {
  writeFileSync(
    join(outDir, "_headers"),
    [
      "/*",
      "  X-Content-Type-Options: nosniff",
      "  X-Frame-Options: DENY",
      "  Referrer-Policy: strict-origin-when-cross-origin",
      "  Permissions-Policy: camera=(), microphone=(), geolocation=(self)",
      `  Content-Security-Policy: ${csp}`,
      ""
    ].join("\n")
  );
}

function nginxSecurityHeaders(csp) {
  return [
    '    add_header X-Content-Type-Options "nosniff" always;',
    '    add_header X-Frame-Options "DENY" always;',
    '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    '    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;',
    `    add_header Content-Security-Policy "${csp}" always;`
  ].join("\n");
}

function writeNginxConfig(csp) {
  const securityHeaders = nginxSecurityHeaders(csp);
  const assetSecurityHeaders = securityHeaders
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");

  writeFileSync(
    join(outDir, "nginx.conf"),
    `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

${securityHeaders}

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
${assetSecurityHeaders}
        try_files $uri =404;
    }
}
`
  );
}

const csp = createContentSecurityPolicy();
writeNetlifyHeaders(csp);
writeNginxConfig(csp);
console.log("Static export security headers generated.");
