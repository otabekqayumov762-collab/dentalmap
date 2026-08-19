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
  // finalize-static-export.mjs writes this alongside nginx.conf, from the same
  // header definition, so `npm start` answers with the CSP production sends and
  // the headers can be checked before a deploy.
  //
  // It lives in generated/ rather than out/ deliberately: scan-public-bundle.mjs
  // fails the build if deployment configuration ends up inside the published
  // export. The previous code read `out/_headers`, which nothing ever writes for
  // exactly that reason — so every preview response went out bare.
  const headersPath = resolve("generated", "security-headers.json");
  if (!existsSync(headersPath)) {
    console.warn(
      `No ${headersPath} — serving without security headers. Run \`npm run build\` to generate it.`
    );
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(headersPath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn(`Could not read ${headersPath}: ${error.message}`);
    return {};
  }
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

  // Serve the .gz files finalize-static-export.mjs already produced, the way
  // production does (`gzip_static on` in the generated nginx.conf). Without this
  // the preview server sent everything uncompressed: the entry CSS measured
  // 126.8 kB instead of 22.7 kB and a whole page load read 985 kB instead of
  // 433 kB, so anyone profiling `npm start` saw a payload 2.1x the real one.
  const acceptsGzip = /\bgzip\b/.test(request.headers["accept-encoding"] || "");
  const precompressedPath = `${filePath}.gz`;
  const useGzip = acceptsGzip && existsSync(precompressedPath);

  response.writeHead(200, {
    ...securityHeaders,
    "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    // Both branches vary on the header, so a shared cache can never hand a
    // gzipped body to a client that did not ask for one.
    "Vary": "Accept-Encoding",
    ...(useGzip ? { "Content-Encoding": "gzip" } : {})
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(useGzip ? precompressedPath : filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});
