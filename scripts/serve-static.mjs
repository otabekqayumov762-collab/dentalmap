import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] || "out");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

if (!existsSync(root)) {
  console.error(`Static directory not found: ${root}`);
  process.exit(1);
}

function loadSecurityHeaders() {
  const headersPath = join(root, "_headers");
  if (!existsSync(headersPath)) {
    return {};
  }

  const headers = {};
  for (const rawLine of readFileSync(headersPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === "/*" || !line.includes(":")) {
      continue;
    }
    const separatorIndex = line.indexOf(":");
    headers[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
  }
  return headers;
}

const securityHeaders = loadSecurityHeaders();

function resolveRequestPath(url = "/") {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  } catch {
    return null;
  }
  const normalizedPath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = resolve(join(root, normalizedPath));
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return join(filePath, "index.html");
  }

  if (existsSync(filePath)) {
    return filePath;
  }

  const htmlPath = `${filePath}.html`;
  if (existsSync(htmlPath)) {
    return htmlPath;
  }

  if (extname(filePath)) {
    return null;
  }

  return join(root, "index.html");
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...securityHeaders, "Allow": "GET, HEAD" });
    response.end();
    return;
  }

  const filePath = resolveRequestPath(request.url);
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    ...securityHeaders,
    "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});
