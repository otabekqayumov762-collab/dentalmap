#!/usr/bin/env node
/**
 * First-paint budget guard for the exported bundle.
 *
 * This app is a Telegram Mini App: it opens inside Telegram's webview on a
 * phone, usually on mobile data, and the user is looking at a blank sheet until
 * the entry chunks land. So the thing worth protecting is not total bundle size
 * — it is specifically what `out/index.html` makes the browser fetch before it
 * can paint.
 *
 * Two regressions this catches, both of which happened before:
 *   1. a heavy view getting statically imported back into the shell
 *      (`components/DentalMapApp.tsx` renders every view, so one plain `import`
 *      silently moves that view's whole subtree onto the critical path);
 *   2. `leaflet/dist/leaflet.css` drifting back into `app/globals.css`, which
 *      puts ~11 kB of map vendor CSS into the single render-blocking stylesheet
 *      that every visitor downloads, map or no map.
 *
 * Budgets are deliberately close to the current measured numbers so a real
 * regression trips them. When a feature genuinely needs the headroom, raise the
 * number in the same commit — that keeps the cost visible in review instead of
 * letting it accumulate silently.
 */

import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "out");

// Budgets are on the GZIPPED wire size, because that is what the phone actually
// downloads (Caddy serves the precompressed assets the export writes). Measured
// after the route-level code split in src/dental-map/views/lazyViews.tsx:
// entry JS was 175 kB gzip with every view statically imported, now 144 kB.
const BUDGETS = {
  entryJsGzipKb: 150,
  entryCssGzipKb: 30,
  entryCssKb: 140
};

function fail(message) {
  console.error(`Bundle budget failed: ${message}`);
  process.exitCode = 1;
}

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

let html;
try {
  html = readFileSync(join(outDir, "index.html"), "utf8");
} catch {
  console.error(`Bundle budget failed: no index.html in ${outDir} — run the build first.`);
  process.exit(1);
}

// Only assets referenced by index.html itself count: chunks reached through a
// dynamic import are fetched on navigation and are not part of first paint.
//
// `noModule` scripts are excluded — that is Next's legacy polyfill bundle, which
// no browser that can run a Telegram Mini App ever fetches. Counting it would
// add ~39 kB of dead weight to the budget and hide real regressions.
const legacyOnly = new Set(
  [...html.matchAll(/<script[^>]*\bnoModule\b[^>]*>/gi)]
    .map((match) => match[0].match(/src="([^"]+)"/)?.[1])
    .filter(Boolean)
);
const referenced = new Set(
  [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((asset) => !legacyOnly.has(asset))
);

let entryJsGzip = 0;
let entryCss = 0;
const entryCssBytes = [];

for (const asset of referenced) {
  const path = join(outDir, asset.replace(/^\//, ""));
  let contents;
  try {
    contents = readFileSync(path);
  } catch {
    fail(`index.html references ${asset}, which is missing from the export`);
    continue;
  }
  if (asset.endsWith(".js")) entryJsGzip += gzipSync(contents).length;
  if (asset.endsWith(".css")) {
    entryCss += contents.byteLength;
    entryCssBytes.push(contents);
  }
}

if (entryJsGzip === 0) fail("index.html references no JS at all — the export looks broken");

const entryCssGzip = entryCssBytes.reduce((total, buffer) => total + gzipSync(buffer).length, 0);

const measured = [
  ["entry JS (gzip)", kb(entryJsGzip), BUDGETS.entryJsGzipKb],
  ["entry CSS (gzip)", kb(entryCssGzip), BUDGETS.entryCssGzipKb],
  ["entry CSS (raw)", kb(entryCss), BUDGETS.entryCssKb]
];

for (const [label, actual, budget] of measured) {
  const status = actual <= budget ? "ok" : "OVER";
  console.log(`  ${label.padEnd(18)} ${String(actual).padStart(6)} kB / ${budget} kB  ${status}`);
  if (actual > budget) {
    fail(`${label} is ${actual} kB, over the ${budget} kB budget. Split the new code with next/dynamic (see src/dental-map/views/lazyViews.tsx) or raise the budget in this file with a reason.`);
  }
}

// Leaflet's own stylesheet must live in the map chunk, never in the entry CSS.
// `.leaflet-pane` is a vendor-only selector: the app's own rules use
// `.leaflet-map`, so this does not trip on styles/content-cards.css.
for (const buffer of entryCssBytes) {
  if (buffer.includes("leaflet-pane")) {
    fail("leaflet vendor CSS is in the render-blocking entry stylesheet. Import 'leaflet/dist/leaflet.css' from MapView.tsx, not app/globals.css.");
  }
}

// And it must still be emitted somewhere, or the map renders unstyled.
const cssDir = join(outDir, "_next/static/css");
const hasLeafletChunk = readdirSync(cssDir).some(
  (file) => file.endsWith(".css") && readFileSync(join(cssDir, file), "utf8").includes("leaflet-pane")
);
if (!hasLeafletChunk) {
  fail("no CSS chunk contains leaflet vendor styles — the map would render unstyled.");
}

if (process.exitCode) {
  process.exit(1);
}
console.log("Bundle budget passed: first paint stays within the mobile budget and leaflet CSS is off the critical path.");
