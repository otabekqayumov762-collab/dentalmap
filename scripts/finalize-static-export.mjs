import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const outDir = resolve(process.argv[2] || "out");
const generatedDir = resolve("generated");

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
  const apiV1Origin = getOptionalOrigin("NEXT_PUBLIC_API_V1_URL");
  const mediaOrigin = getOptionalOrigin("NEXT_PUBLIC_MEDIA_URL");
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
  const connectSources = [
    "'self'",
    apiOrigin,
    apiV1Origin,
    "https://nominatim.openstreetmap.org",
    ...yandex.connect
  ].filter(Boolean);
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    apiOrigin,
    mediaOrigin,
    "https://images.unsplash.com",
    "https://tile.openstreetmap.org",
    ...yandex.img
  ].filter(Boolean);
  // React drag/layout styles and both map engines use style attributes. Static
  // export cannot attach a per-request nonce, so scripts remain hash-locked while
  // inline CSS is permitted for these UI primitives.
  const styleSrc = "style-src 'self' 'unsafe-inline'";
  const fontSrc = `font-src 'self' data:${yandex.font.length ? ` ${yandex.font.join(" ")}` : ""}`;

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    `connect-src ${connectSources.join(" ")}`,
    `img-src ${imageSources.join(" ")}`,
    styleSrc,
    fontSrc,
    "object-src 'none'",
    // Telegram opens the mini app inside its client (WebView loads it top-level;
    // Telegram Web embeds it in an iframe), so the app MUST allow Telegram to frame
    // it — 'none' here silently blocks "open in bot". Restrict to Telegram origins.
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join("; ");
}

function nginxSecurityHeaders(csp) {
  return [
    '    add_header X-Content-Type-Options "nosniff" always;',
    '    add_header Strict-Transport-Security "max-age=31536000" always;',
    '    add_header X-Permitted-Cross-Domain-Policies "none" always;',
    '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    '    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;',
    `    add_header Content-Security-Policy "${csp}" always;`
  ].join("\n");
}

function writeNginxConfig(csp) {
  const securityHeaders = nginxSecurityHeaders(csp);
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(
    join(generatedDir, "nginx.conf"),
    `worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /dev/stdout;
    sendfile on;
    client_body_temp_path /tmp/client_temp;
    proxy_temp_path /tmp/proxy_temp;
    fastcgi_temp_path /tmp/fastcgi_temp;
    uwsgi_temp_path /tmp/uwsgi_temp;
    scgi_temp_path /tmp/scgi_temp;

    server {
        listen 8080;
        server_name _;
        server_tokens off;
        root /usr/share/nginx/html;
        index index.html;

        gzip_static on;
        gzip on;
        gzip_comp_level 4;
        gzip_types application/json text/css application/javascript image/svg+xml;
        gzip_min_length 512;

${securityHeaders}

        # Never let the SPA fallback turn sensitive/dotfile probes into 200 HTML.
        location ~ (^|/)\\. { return 404; }
        location ~* (^|/)(?:_headers|nginx\\.conf|dockerfile|docker-compose\\.ya?ml|package(?:-lock)?\\.json|tsconfig\\.json|next\\.config\\.(?:js|mjs|ts)|\\.git)(?:/|$) { return 404; }

        location ~* \\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$ {
            expires 30d;
            try_files $uri =404;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
`
  );
}

const COMPRESSIBLE_EXTENSIONS = [".js", ".css", ".html", ".svg", ".json"];

function precompressAssets(directory) {
  let count = 0;
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      count += precompressAssets(path);
      continue;
    }
    if (!COMPRESSIBLE_EXTENSIONS.some((ext) => path.endsWith(ext))) {
      continue;
    }
    const compressed = gzipSync(readFileSync(path), { level: 9 });
    writeFileSync(`${path}.gz`, compressed);
    count += 1;
  }
  return count;
}

const csp = createContentSecurityPolicy();
writeNginxConfig(csp);
const precompressedCount = precompressAssets(outDir);
console.log(`Private runtime config generated. Precompressed ${precompressedCount} asset(s).`);
