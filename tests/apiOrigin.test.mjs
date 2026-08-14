/**
 * The API base is decided once, at module load, from NEXT_PUBLIC_API_URL. Three
 * values have to keep three different meanings:
 *
 *   absolute URL   -> requests are cross-origin, exactly as they have always been
 *   "same-origin"  -> requests are relative, so the bundle names no host at all
 *   empty          -> nothing is configured; that must STILL be a loud failure
 *
 * Each mode needs its own process: the base is a module-level constant and
 * `paymentsApi` re-imports `dentalMapApi`, so a second mode in the same process
 * would silently reuse the first one's cached module and pass for free.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const resolverUrl = pathToFileURL(resolve("tests/helpers/ts-resolver.mjs")).href;
const apiUrl = pathToFileURL(resolve("src/dental-map/api/dentalMapApi.ts")).href;
const paymentsUrl = pathToFileURL(resolve("src/dental-map/api/paymentsApi.ts")).href;

/** Loads the real modules under one NEXT_PUBLIC_API_URL and reports what they build. */
function probe(apiBaseEnv) {
  const script = `
import { register } from "node:module";
register(${JSON.stringify(resolverUrl)});
const api = await import(${JSON.stringify(apiUrl)});
const payments = await import(${JSON.stringify(paymentsUrl)});
const attempt = (fn) => {
  try {
    return { value: fn() };
  } catch (error) {
    return { error: error.message };
  }
};
process.stdout.write(JSON.stringify({
  base: api.API_BASE_URL,
  sameOrigin: api.isSameOriginApi,
  configured: api.isBackendConfigured(),
  absolutePath: attempt(() => api.getApiUrl("/api/doctors/")),
  barePath: attempt(() => api.getApiUrl("api/doctors/")),
  v1: attempt(() => payments.getApiV1Url("/billing/cards/"))
}));
`;
  const run = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", script],
    {
      encoding: "utf8",
      env: { ...process.env, NEXT_PUBLIC_API_URL: apiBaseEnv, NEXT_PUBLIC_API_V1_URL: "" }
    }
  );
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}

test("an absolute NEXT_PUBLIC_API_URL still produces cross-origin absolute URLs", () => {
  const result = probe("https://api.dental.example");

  assert.equal(result.sameOrigin, false);
  assert.equal(result.base, "https://api.dental.example");
  assert.equal(result.configured, true);
  assert.equal(result.absolutePath.value, "https://api.dental.example/api/doctors/");
  assert.equal(result.barePath.value, "https://api.dental.example/api/doctors/");
  // No separate v1 base configured: the client suffixes /api/v1 onto the API base.
  assert.equal(result.v1.value, "https://api.dental.example/api/v1/billing/cards/");
});

test("NEXT_PUBLIC_API_URL=same-origin produces relative URLs with no host in them", () => {
  const result = probe("same-origin");

  assert.equal(result.sameOrigin, true);
  assert.equal(result.base, "");
  // The app must consider the backend CONFIGURED here, or every caller guarded by
  // isBackendConfigured() would quietly fall back to "vaqtincha ulanmayapti".
  assert.equal(result.configured, true);
  assert.equal(result.absolutePath.value, "/api/doctors/");
  assert.equal(result.barePath.value, "/api/doctors/");
  assert.equal(result.v1.value, "/api/v1/billing/cards/");

  // The point of the mode: nothing that could pin the bundle to a hostname.
  for (const built of [result.absolutePath.value, result.v1.value]) {
    assert.ok(built.startsWith("/"), `${built} must be root-relative`);
    assert.equal(built.includes("//"), false, `${built} must not carry an origin`);
  }
});

test("an unset NEXT_PUBLIC_API_URL stays a loud misconfiguration, not a working-looking app", () => {
  const result = probe("");

  assert.equal(result.sameOrigin, false);
  assert.equal(result.base, "");
  assert.equal(result.configured, false);
  assert.equal(result.absolutePath.value, undefined);
  assert.equal(result.absolutePath.error, "Ilova server manzili sozlanmagan.");
  assert.equal(result.v1.error, "Ilova server manzili sozlanmagan.");
});

test("only the exact token opts in; a near miss is treated as a URL and never as same-origin", () => {
  // validate-env.mjs rejects these at build time (tests/security.test.mjs); this
  // asserts the client half — a typo must not fall into the relative-path mode.
  for (const typo of ["sameorigin", "same_origin", "Same-Origin", "same-origin/"]) {
    const result = probe(typo);
    assert.equal(result.sameOrigin, false, `${typo} must not enable same-origin mode`);
    assert.equal(result.absolutePath.value, `${typo.replace(/\/+$/, "")}/api/doctors/`);
  }
});
