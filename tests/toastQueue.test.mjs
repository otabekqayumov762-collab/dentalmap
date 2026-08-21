import { strict as assert } from "node:assert";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The owner sent a screenshot with FIVE identical "Klinika lokatsiyasiga Yandex
 * yoki Google Maps linkini kiriting." toasts stacked over the registration
 * form. Two separate faults: the message was wrong (fixed elsewhere), and the
 * toast store appended a copy per call with no check for one already showing.
 * The stack hid the form, which is also why the button got tapped five times.
 */

// The module is TS; compile it once into a temp dir and import the JS.
const out = mkdtempSync(join(tmpdir(), "toastq-"));
execFileSync("npx", [
  "tsc", "src/dental-map/ui/toastQueue.ts",
  "--outDir", out, "--module", "es2022", "--target", "es2022", "--moduleResolution", "bundler"
], { stdio: "pipe" });
writeFileSync(join(out, "package.json"), JSON.stringify({ type: "module" }));
const { reduceToasts, MAX_VISIBLE_TOASTS } = await import(join(out, "toastQueue.js"));

const err = (id, message) => ({ id, variant: "error", message, repeats: 0 });
const SAME = "Klinika lokatsiyasiga Yandex yoki Google Maps linkini kiriting.";

test("the same message five times leaves exactly one toast", () => {
  let toasts = [];
  for (let i = 1; i <= 5; i += 1) {
    toasts = reduceToasts(toasts, err(i, SAME)).toasts;
  }
  assert.equal(toasts.length, 1, `five identical errors left ${toasts.length} toasts on screen`);
  assert.equal(toasts[0].message, SAME);
});

test("a repeat refreshes the existing toast rather than minting a new id", () => {
  const first = reduceToasts([], err(1, SAME));
  const second = reduceToasts(first.toasts, err(2, SAME));

  assert.equal(second.refreshedId, 1, "the caller was not told which timer to restart");
  assert.equal(second.toasts[0].id, 1, "a duplicate replaced the original instead of refreshing it");
  assert.equal(second.toasts.length, 1);
});

test("a repeat moves to the end so the refreshed one is where the eye is", () => {
  const state = [err(1, "birinchi"), err(2, "ikkinchi")];
  const { toasts } = reduceToasts(state, err(3, "birinchi"));

  assert.deepEqual(toasts.map((t) => t.message), ["ikkinchi", "birinchi"]);
});

test("a repeat bumps the repeat count, so the refresh is something the eye can catch", () => {
  // Moving the toast to the end is invisible when it is the only one on screen,
  // which is exactly the reported case. The host keys the toast on this count so
  // the entry animation replays; without the bump a second tap changes nothing
  // on screen and reads as a dead button.
  let toasts = [];
  for (let i = 1; i <= 5; i += 1) {
    toasts = reduceToasts(toasts, err(i, SAME)).toasts;
  }
  assert.equal(toasts[0].repeats, 4, "the toast cannot replay its animation, so a repeat tap looks ignored");
});

test("a refresh produces a new object so React re-renders it", () => {
  const first = reduceToasts([], err(1, SAME)).toasts;
  const second = reduceToasts(first, err(2, SAME)).toasts;

  assert.notEqual(second[0], first[0], "the same object was returned, so React skips the re-render");
  assert.equal(second[0].id, 1);
});

test("a first-time message starts with no repeats", () => {
  const { toasts } = reduceToasts([err(1, "bir")], err(2, "ikki"));
  assert.equal(toasts[1].repeats, 0, "a brand new message was born already looking like a repeat");
});

test("different messages still all appear", () => {
  let toasts = [];
  for (const [i, m] of ["bir", "ikki", "uch"].entries()) {
    toasts = reduceToasts(toasts, err(i + 1, m)).toasts;
  }
  assert.deepEqual(toasts.map((t) => t.message), ["bir", "ikki", "uch"]);
});

test("the cap drops the oldest, keeping the newest visible", () => {
  let toasts = [];
  let dropped = [];
  for (const [i, m] of ["bir", "ikki", "uch", "tort", "besh"].entries()) {
    const step = reduceToasts(toasts, err(i + 1, m));
    toasts = step.toasts;
    dropped = dropped.concat(step.droppedIds);
  }
  assert.equal(toasts.length, MAX_VISIBLE_TOASTS);
  assert.deepEqual(toasts.map((t) => t.message), ["uch", "tort", "besh"]);
  assert.deepEqual(dropped, [1, 2], "dropped timers were not reported, so they leak");
});

test("same text but a different variant is a different message", () => {
  const { toasts } = reduceToasts([err(1, "Saqlandi")], { id: 2, variant: "success", message: "Saqlandi" });
  assert.equal(toasts.length, 2, "an error and a success reading the same were merged");
});
