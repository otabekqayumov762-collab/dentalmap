/**
 * The decisions inside the photo shrinker, tested without a canvas.
 *
 * The encoding itself needs a browser, so it is kept deliberately thin and the
 * judgement is pulled out into pure functions: what size to aim for, whether a
 * file is worth re-encoding at all, and -- the one that silently breaks
 * uploads -- what the re-encoded file must be called.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPRESSION_TARGET_BYTES,
  MAX_EDGE_PIXELS,
  compressedFileName,
  compressionLadder,
  fitWithin,
  formatBytes,
  isCompressibleImage,
  shouldCompress
} from "../src/dental-map/lib/imageCompression.ts";

test("a photo bigger than the long edge is scaled down, keeping its shape", () => {
  // A 12 MP iPhone photo, portrait.
  const fitted = fitWithin(3024, 4032, MAX_EDGE_PIXELS);

  assert.equal(fitted.height, MAX_EDGE_PIXELS);
  assert.equal(fitted.width, 1536);
  // Aspect ratio preserved to within a rounded pixel.
  assert.ok(Math.abs(fitted.width / fitted.height - 3024 / 4032) < 0.001);
});

test("a photo already smaller than the cap is never enlarged", () => {
  // Upscaling adds bytes and blur and no information whatsoever.
  assert.deepEqual(fitWithin(800, 600, MAX_EDGE_PIXELS), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(2048, 1000, MAX_EDGE_PIXELS), { width: 2048, height: 1000 });
});

test("a landscape photo is capped on its long edge, not its height", () => {
  const fitted = fitWithin(6000, 3000, MAX_EDGE_PIXELS);

  assert.equal(fitted.width, MAX_EDGE_PIXELS);
  assert.equal(fitted.height, 1024);
});

test("a degenerate size cannot produce a zero-pixel canvas", () => {
  assert.deepEqual(fitWithin(0, 0, MAX_EDGE_PIXELS), { width: 0, height: 0 });
  assert.deepEqual(fitWithin(-5, 10, MAX_EDGE_PIXELS), { width: 0, height: 0 });
  // A 5000x1 strip must still round up to a visible pixel, not down to none.
  assert.equal(fitWithin(5000, 1, MAX_EDGE_PIXELS).height, 1);
});

test("quality is spent before resolution, because blur is what people notice", () => {
  const ladder = compressionLadder();

  assert.ok(ladder.length >= 3);
  // Every rung at the full edge comes before any rung that shrinks it.
  const firstShrink = ladder.findIndex((step) => step.maxEdge < MAX_EDGE_PIXELS);
  const lastFullEdge = ladder.reduce((last, step, index) => (step.maxEdge === MAX_EDGE_PIXELS ? index : last), -1);
  assert.ok(firstShrink === -1 || lastFullEdge < firstShrink);
  // And nothing on the ladder is low enough to look compressed.
  for (const step of ladder) {
    assert.ok(step.quality >= 0.7, `quality ${step.quality} is too low to be invisible`);
    assert.ok(step.maxEdge >= 1280, `edge ${step.maxEdge} is smaller than anywhere this is shown`);
  }
});

test("the re-encoded file is renamed to match what it actually is", () => {
  // Not cosmetic: the API rejects a WebP posted as .jpg as a format mismatch,
  // which the user would read as the upload being broken again.
  assert.equal(compressedFileName("IMG_4821.HEIC", "image/webp"), "IMG_4821.webp");
  assert.equal(compressedFileName("photo.jpeg", "image/jpeg"), "photo.jpg");
  assert.equal(compressedFileName("scan.2026.01.png", "image/webp"), "scan.2026.01.webp");
});

test("a nameless or extensionless pick still gets a usable name", () => {
  assert.equal(compressedFileName("", "image/webp"), "rasm.webp");
  assert.equal(compressedFileName("photo", "image/jpeg"), "photo.jpg");
  assert.equal(compressedFileName(".", "image/webp"), "rasm.webp");
});

test("PDFs and vector files are passed through, never re-encoded", () => {
  // A receipt PDF put through a canvas would come out as a picture of page one.
  assert.equal(isCompressibleImage({ type: "application/pdf", name: "chek.pdf" }), false);
  assert.equal(isCompressibleImage({ type: "image/svg+xml", name: "logo.svg" }), false);
  // An animated GIF would lose every frame but the first.
  assert.equal(isCompressibleImage({ type: "image/gif", name: "a.gif" }), false);
});

test("a phone photo with no MIME type is recognised by its name", () => {
  // iOS hands over an empty or generic type often enough that this is the
  // normal case, not the edge case.
  assert.equal(isCompressibleImage({ type: "", name: "IMG_4821.HEIC" }), true);
  assert.equal(isCompressibleImage({ type: "application/octet-stream", name: "a.jpg" }), true);
  assert.equal(isCompressibleImage({ type: "", name: "notes.txt" }), false);
});

test("only files above the target are re-encoded", () => {
  const big = { size: COMPRESSION_TARGET_BYTES + 1, type: "image/jpeg", name: "a.jpg" };
  const small = { size: COMPRESSION_TARGET_BYTES, type: "image/jpeg", name: "a.jpg" };

  assert.equal(shouldCompress(big), true);
  // Re-encoding something already small only risks making it bigger.
  assert.equal(shouldCompress(small), false);
  assert.equal(shouldCompress({ size: 30 * 1024 * 1024, type: "application/pdf", name: "c.pdf" }), false);
});

test("the target leaves real headroom under the server cap", () => {
  // 8 MB is what the API accepts; aiming anywhere near it would mean a browser
  // that compresses poorly still fails.
  assert.ok(COMPRESSION_TARGET_BYTES < 8 * 1024 * 1024 / 4);
});

test("sizes are reported the way a person reads them", () => {
  assert.equal(formatBytes(4 * 1024 * 1024), "4.0 MB");
  assert.equal(formatBytes(350 * 1024), "350 KB");
  assert.equal(formatBytes(200), "1 KB");
});
