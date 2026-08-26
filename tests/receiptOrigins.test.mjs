/**
 * Which hosts a receipt document may live on.
 *
 * The receipt URL is built server-side from PUBLIC_BASE_URL and has to be
 * absolute, because Telegram.WebApp.openLink cannot resolve a relative path. So
 * while the check compared it against the CURRENT origin only, moving the app to
 * a new hostname broke receipts for everyone still arriving on the old one: the
 * URL named the new host, the page was on the old one, and the document silently
 * refused to open.
 *
 * A list decouples the two, so the entry points and the configured base can move
 * on different days. It is still an allowlist of our own hosts -- the check exists
 * because receipt_url arrives inside an API response and is handed to openLink,
 * so a tampered value must not be able to steer the doctor anywhere.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(resolve("src/dental-map/lib/paymentSecurity.ts")).href;
const PATH = "/api/v1/billing/receipt-document/abc.def/";

/** Each case needs its own process: the module reads env at call time, but the
 *  import itself is cached, and one stale module would pass for free. */
function check(url, env) {
  const script = `
import { register } from "node:module";
register(${JSON.stringify(pathToFileURL(resolve("tests/helpers/ts-resolver.mjs")).href)});
const m = await import(${JSON.stringify(moduleUrl)});
process.stdout.write(JSON.stringify(m.isAllowedReceiptDocumentUrl(${JSON.stringify(url)})));
`;
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_API_V1_URL: "", NEXT_PUBLIC_RECEIPT_ORIGINS: "", ...env },
  });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}

test("the configured api origin is allowed, as it always was", () => {
  const env = { NEXT_PUBLIC_API_URL: "https://api.dental.example" };
  assert.equal(check(`https://api.dental.example${PATH}`, env), true);
  assert.equal(check(`https://evil.example${PATH}`, env), false);
});

test("a receipt on another of OUR hosts opens", () => {
  // The case that was broken: app moved, receipt still named the old host.
  const env = {
    NEXT_PUBLIC_API_URL: "https://app.dentmap.uz",
    NEXT_PUBLIC_RECEIPT_ORIGINS: "https://dental-map.pages.dev,https://dental.77.37.54.14.sslip.io",
  };
  assert.equal(check(`https://dental-map.pages.dev${PATH}`, env), true);
  assert.equal(check(`https://dental.77.37.54.14.sslip.io${PATH}`, env), true);
  assert.equal(check(`https://app.dentmap.uz${PATH}`, env), true);
});

test("widening the list does not let anything else in", () => {
  const env = {
    NEXT_PUBLIC_API_URL: "https://app.dentmap.uz",
    NEXT_PUBLIC_RECEIPT_ORIGINS: "https://dental-map.pages.dev",
  };
  assert.equal(check(`https://evil.example${PATH}`, env), false);
  // A lookalike host is not a substring match.
  assert.equal(check(`https://app.dentmap.uz.evil.example${PATH}`, env), false);
  // Credentials in the URL still disqualify it: URL.origin drops them.
  assert.equal(check(`https://user:pass@app.dentmap.uz${PATH}`, env), false);
  // And the path still has to be the receipt endpoint.
  assert.equal(check("https://app.dentmap.uz/api/v1/billing/anything/", env), false);
});

test("a malformed entry in the list is ignored, not fatal", () => {
  const env = {
    NEXT_PUBLIC_API_URL: "https://app.dentmap.uz",
    NEXT_PUBLIC_RECEIPT_ORIGINS: "not-a-url, ,https://dental-map.pages.dev",
  };
  assert.equal(check(`https://dental-map.pages.dev${PATH}`, env), true);
  assert.equal(check(`https://app.dentmap.uz${PATH}`, env), true);
});

test("with nothing configured at all it still fails closed", () => {
  assert.equal(check(`https://app.dentmap.uz${PATH}`, { NEXT_PUBLIC_API_URL: "" }), false);
});
