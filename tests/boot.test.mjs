/**
 * Regression tests for the "opens for some people, not at all for others" class
 * of failures. Each test here stands for one confirmed way the Mini App used to
 * die silently, and the assertion is the thing that must never come back.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { test } from "node:test";
import {
  BOOT_FALLBACK_ID,
  BOOT_READY_ATTRIBUTE,
  BOOT_RETRY_ID,
  BOOT_WATCHDOG_TIMEOUT_MS,
  bootWatchdogScript,
  markAppMounted
} from "../src/dental-map/lib/boot.ts";
import { getAccessToken, storeAuthTokens } from "../src/dental-map/lib/tokenStore.ts";

// dentalMapApi reaches the rest of the app through extensionless specifiers, so
// it can only be imported after the resolver hook is live — hence dynamic. The
// API origin is read once at module load: without it every request helper throws
// "Ilova server manzili sozlanmagan" and the refresh tests below would pass
// because nothing was ever called.
register("./helpers/ts-resolver.mjs", import.meta.url);
process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
const {
  CSRF_RETRY_CEILING_MS,
  REFRESH_TIMEOUT_MS,
  THROTTLED_MESSAGE,
  endsSessionOnRefresh,
  getAuthCsrfToken,
  isThrottledError,
  parseRetryAfterSeconds,
  refreshAccessToken
} = await import("../src/dental-map/api/dentalMapApi.ts");

/** Minimal DOM the inline watchdog needs — it is written for the oldest WebView
 *  in the fleet, so its whole surface is a handful of calls. */
function bootEnv({ ready = false } = {}) {
  const timers = [];
  const clicks = [];
  let reloads = 0;
  const fallback = { hidden: true };
  const retry = {
    addEventListener: (type, handler) => clicks.push({ type, handler })
  };
  const attributes = ready ? { [BOOT_READY_ATTRIBUTE]: "1" } : {};
  const document = {
    documentElement: {
      getAttribute: (name) => attributes[name] ?? null
    },
    getElementById: (id) => {
      if (id === BOOT_FALLBACK_ID) return fallback;
      if (id === BOOT_RETRY_ID) return retry;
      return null;
    }
  };
  const window = {
    setTimeout: (handler, delay) => {
      timers.push({ handler, delay });
      return timers.length;
    },
    location: {
      reload: () => {
        reloads += 1;
      }
    }
  };
  new Function("window", "document", bootWatchdogScript)(window, document);
  return {
    fallback,
    clicks,
    timers,
    reloads: () => reloads,
    fire: () => timers.forEach((timer) => timer.handler())
  };
}

test("boot watchdog replaces the silent spinner with a message when hydration never happens", () => {
  const env = bootEnv({ ready: false });

  assert.equal(env.timers.length, 1, "watchdog must arm exactly one timer");
  assert.equal(env.timers[0].delay, BOOT_WATCHDOG_TIMEOUT_MS);
  assert.equal(env.fallback.hidden, true, "message must stay hidden until the deadline");

  env.fire();

  assert.equal(env.fallback.hidden, false, "a dead boot must say so instead of spinning forever");
  assert.deepEqual(
    env.clicks.map((entry) => entry.type),
    ["click"],
    "retry must be wired by the watchdog: React may never run, and the CSP sets script-src-attr 'none'"
  );
  env.clicks[0].handler();
  assert.equal(env.reloads(), 1);
});

test("boot watchdog stays silent once the React root has signalled that it mounted", () => {
  const env = bootEnv({ ready: true });
  env.fire();
  assert.equal(env.fallback.hidden, true, "a healthy app must never show the failure message");
  assert.equal(env.clicks.length, 0);
});

test("markAppMounted sets the exact flag the inline watchdog reads, and clears a late failure", () => {
  const previousDocument = globalThis.document;
  const attributes = {};
  const fallback = { hidden: false };
  globalThis.document = {
    documentElement: {
      setAttribute: (name, value) => {
        attributes[name] = value;
      },
      getAttribute: (name) => attributes[name] ?? null
    },
    getElementById: (id) => (id === BOOT_FALLBACK_ID ? fallback : null)
  };
  try {
    markAppMounted();
    // The contract between the React root and a script it can never import.
    assert.equal(attributes[BOOT_READY_ATTRIBUTE], "1");
    // A boot slower than the deadline must not leave the error covering a working app.
    assert.equal(fallback.hidden, true);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("only the server refusing the credential ends a session; a throttle or a blip does not", () => {
  assert.equal(endsSessionOnRefresh(401), true);
  assert.equal(endsSessionOnRefresh(403), true);
  // The one that logged whole carriers out: DRF's auth throttle keys on the
  // public IP, and CGNAT puts thousands of Uzbek subscribers behind one address.
  assert.equal(endsSessionOnRefresh(429), false);
  assert.equal(endsSessionOnRefresh(500), false);
  assert.equal(endsSessionOnRefresh(502), false);
  assert.equal(endsSessionOnRefresh(503), false);
  assert.equal(endsSessionOnRefresh(504), false);
});

test("a throttled token refresh keeps the session; a rejected one ends it", async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value))
  };
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  globalThis.window = { localStorage: storage, sessionStorage: storage };

  const calls = [];
  const respondWith = (refreshStatus) => {
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), signal: init.signal });
      if (String(url).includes("/api/auth/csrf/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ csrf_token: "csrf-value" })
        };
      }
      return {
        ok: refreshStatus < 400,
        status: refreshStatus,
        json: async () => ({ detail: "throttled" })
      };
    };
  };

  const refreshCalls = () => calls.filter((call) => call.url.includes("/api/auth/token/refresh/")).length;

  try {
    // 429: a stranger on the same carrier IP exhausted the bucket. Not our verdict.
    storeAuthTokens({ tokens: { access: "live-access" } });
    respondWith(429);
    assert.equal(await refreshAccessToken(), false);
    assert.equal(refreshCalls(), 1, "the refresh endpoint must actually have been called");
    assert.equal(
      getAccessToken(),
      "live-access",
      "a 429 must not log the user out — that is the silent-logout bug this test exists for"
    );

    // 5xx: a backend blip is not a statement about the refresh credential either.
    respondWith(503);
    assert.equal(await refreshAccessToken(), false);
    assert.equal(refreshCalls(), 2);
    assert.equal(getAccessToken(), "live-access");

    // 401: the server refused the credential. This one really is over.
    respondWith(401);
    assert.equal(await refreshAccessToken(), false);
    assert.equal(refreshCalls(), 3);
    assert.equal(getAccessToken(), "", "a refused refresh credential must end the session");

    // Both auth calls sit in the same throttled scope and both must be bounded:
    // a socket that hangs would otherwise hold session restore — and the boot
    // spinner with it — open forever.
    assert.ok(calls.length > 0);
    assert.ok(
      calls.every((call) => call.signal && typeof call.signal.aborted === "boolean"),
      "every auth call must carry an abort signal"
    );
    assert.ok(Number.isFinite(REFRESH_TIMEOUT_MS) && REFRESH_TIMEOUT_MS > 0 && REFRESH_TIMEOUT_MS <= 15000);
  } finally {
    storeAuthTokens({});
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

/* ── The throttled cold start ────────────────────────────────────────────────
 * /api/auth/csrf/ is the first call the Mini App makes and it sits on the same
 * DRF throttle bucket as the mutations it protects. Every real-browser 429 in
 * the server logs landed here, and the code threw the same generic error a dead
 * network throws — so a limit that clears itself in under a minute was reported
 * as a broken app, and the recovery path then spent the empty bucket again. */

/** Drive getAuthCsrfToken against a scripted sequence of responses. */
function csrfEnv(responses) {
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const scripted = responses[Math.min(calls.length, responses.length - 1)];
    calls.push(String(url));
    const headers = new Map(Object.entries(scripted.headers ?? {}));
    return {
      ok: scripted.status < 400,
      status: scripted.status,
      headers: { get: (name) => headers.get(name) ?? null },
      json: async () => scripted.body ?? {}
    };
  };
  return {
    calls,
    restore: () => {
      if (previousFetch === undefined) delete globalThis.fetch;
      else globalThis.fetch = previousFetch;
    }
  };
}

const CSRF_OK = { status: 200, body: { csrf_token: "csrf-value" } };

test("a throttled CSRF pre-flight is reported as a wait, not as a broken app", async () => {
  const env = csrfEnv([{ status: 429 }]);
  try {
    const error = await getAuthCsrfToken().then(
      () => null,
      (thrown) => thrown
    );

    assert.ok(error, "a 429 must not resolve to an empty token");
    assert.equal(
      isThrottledError(error),
      true,
      "the caller decides whether to retry by asking this question — a plain Error hides the answer"
    );
    // The distinction the user actually sees: waiting fixes this one.
    assert.equal(error.message, THROTTLED_MESSAGE);
    assert.notEqual(error.message, "Xavfsiz sessiya tayyorlanmadi.");
    assert.match(error.message, /qayta urinib/, "user-facing strings are Uzbek");
    // No Retry-After means no promise of a short wait, so no second request.
    assert.equal(env.calls.length, 1, "an unbounded retry would spend the same exhausted bucket");
  } finally {
    env.restore();
  }
});

test("a short Retry-After is waited out once and the cold start survives it", async () => {
  const env = csrfEnv([{ status: 429, headers: { "Retry-After": "1" } }, CSRF_OK]);
  const startedAt = Date.now();
  try {
    assert.equal(await getAuthCsrfToken(), "csrf-value");
    assert.equal(env.calls.length, 2, "exactly one retry — two requests, never a loop");
    assert.ok(
      Date.now() - startedAt >= 900,
      "the server's Retry-After must actually be honoured, not ignored"
    );
    assert.ok(1000 <= CSRF_RETRY_CEILING_MS, "1s must be inside the ceiling for this test to mean anything");
  } finally {
    env.restore();
  }
});

test("a long Retry-After is reported immediately instead of holding the boot spinner", async () => {
  const env = csrfEnv([{ status: 429, headers: { "Retry-After": "60" } }]);
  const startedAt = Date.now();
  try {
    const error = await getAuthCsrfToken().then(
      () => null,
      (thrown) => thrown
    );

    assert.equal(isThrottledError(error), true);
    assert.equal(error.retryAfterSeconds, 60, "the wait the server asked for must reach the caller");
    assert.equal(env.calls.length, 1);
    // Sleeping out a full throttle window is the same white screen as an outage.
    assert.ok(Date.now() - startedAt < 1000, "a 60s wait must never be slept through");
    assert.ok(60000 > CSRF_RETRY_CEILING_MS);
  } finally {
    env.restore();
  }
});

test("Retry-After is parsed conservatively — an unreadable value is not a zero wait", () => {
  assert.equal(parseRetryAfterSeconds("30"), 30);
  assert.equal(parseRetryAfterSeconds(" 7 "), 7);
  assert.equal(parseRetryAfterSeconds("0"), 0);
  // An HTTP-date, a stripped header or a garbled proxy value: unknown, not 0 —
  // reading these as zero would retry instantly and re-arm the same failure.
  assert.equal(parseRetryAfterSeconds("Wed, 21 Oct 2026 07:28:00 GMT"), null);
  assert.equal(parseRetryAfterSeconds(null), null);
  assert.equal(parseRetryAfterSeconds(undefined), null);
  assert.equal(parseRetryAfterSeconds(""), null);
  assert.equal(parseRetryAfterSeconds("-5"), null);
});

test("a throttled Telegram cold start never recovers by calling refreshAccessToken", () => {
  const source = readFileSync(resolve("src/dental-map/hooks/useDentalData.ts"), "utf8");
  const anchor = source.indexOf("const throttled = isThrottledError(error)");
  assert.ok(anchor > 0, "the Telegram auth catch must still classify the failure");
  const start = source.lastIndexOf("} catch (error) {", anchor);
  const end = source.indexOf("HapticFeedback", anchor);
  assert.ok(start > 0 && end > anchor, "the Telegram auth catch block must still be findable");
  const catchBlock = source.slice(start, end);

  // The cascade this pins down: refreshAccessToken() issues its own
  // /api/auth/csrf/, so calling it after a throttled pre-flight spends the bucket
  // a second time and extends the lockout the user experiences.
  assert.match(
    catchBlock,
    /if \([^{]*!throttled[^{]*\) \{\s*const restored = await refreshAccessToken\(\);/,
    "the network fallback must be gated on the failure NOT being a throttle"
  );
  // The local token store costs no request, so that fallback must stay ungated —
  // it is what keeps a user signed in through a blip.
  assert.match(catchBlock, /restoreAuthTokens\(telegramUser\.id\)/);
  assert.match(catchBlock, /throttled\s*\?\s*THROTTLED_MESSAGE/);
});

test("the app shell never chains hydration to a third-party origin", () => {
  const layout = readFileSync(resolve("app/layout.tsx"), "utf8");

  // telegram.org used to be a beforeInteractive script. Under output:"export"
  // Next drains that queue with a promise settled only by onload/onerror, so a
  // connection that HANGS — the DPI-throttle shape for telegram.org on some UZ
  // operators — meant React never hydrated at all.
  assert.equal(
    layout.includes("https://telegram.org"),
    false,
    "the SDK must not be fetched from telegram.org"
  );
  assert.match(layout, /src="\/telegram-web-app\.js"/);
  assert.equal(
    /strategy="beforeInteractive"/.test(layout),
    false,
    "hydration must not be chained to any script's onload"
  );
  assert.match(layout, /strategy="afterInteractive"/);

  const sdk = readFileSync(resolve("public/telegram-web-app.js"), "utf8");
  assert.ok(sdk.length > 10000, "the vendored SDK must be the real file, not a stub");
  assert.match(sdk, /WebAppMethodUnsupported/);

  // And the shell must be able to explain itself without React.
  assert.match(layout, /<noscript>/);
  assert.ok(layout.includes("BOOT_FALLBACK_ID"), "the failure message must be in the prerendered HTML");
  assert.ok(layout.includes("bootWatchdogScript"));
});

test("the deployed CSP no longer trusts telegram.org", () => {
  const root = mkdtempSync(join(tmpdir(), "dental-csp-"));
  const out = join(root, "out");
  mkdirSync(out);
  writeFileSync(join(out, "index.html"), "<!doctype html><script>window.__ok=true</script>");
  const run = spawnSync(process.execPath, [resolve("scripts/finalize-static-export.mjs"), out], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: "https://api.example.test",
      NEXT_PUBLIC_API_V1_URL: "",
      NEXT_PUBLIC_MEDIA_URL: "",
      NEXT_PUBLIC_YANDEX_MAPS_API_KEY: ""
    }
  });
  try {
    assert.equal(run.status, 0, run.stderr);
    const nginx = readFileSync(join(root, "generated", "nginx.conf"), "utf8");
    const scriptSrc = /script-src ([^;]+);/.exec(nginx);
    assert.ok(scriptSrc, "nginx config must declare a script-src");
    assert.equal(
      scriptSrc[1].includes("telegram.org"),
      false,
      "the SDK is same-origin now; keeping telegram.org in script-src would re-open the hole"
    );
    assert.match(scriptSrc[1], /'self'/);
    assert.match(scriptSrc[1], /'sha256-/, "inline scripts must stay hash-locked");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ── The old-WebView tail ────────────────────────────────────────────────────
 * Two modern APIs used to be called bare. Neither breaks the boot shell, but
 * each is a hard crash of the view that touches it on an Android System WebView
 * that has not been updated since ~2020 — and a crashed view is the same white
 * screen as everything else here. */

test("clinic names are escaped with syntax an old WebView actually has", async () => {
  const { escapeHtml } = await import("../src/dental-map/lib/html.ts");

  assert.equal(escapeHtml(`<script>alert("x")&'`), "&lt;script&gt;alert(&quot;x&quot;)&amp;&#039;");
  // Every occurrence, not just the first: the marker HTML is built by
  // interpolation, so one unescaped bracket is an injection.
  assert.equal(escapeHtml("a<b<c"), "a&lt;b&lt;c");
  assert.equal(escapeHtml("Stomatolog «Doctor»"), "Stomatolog «Doctor»");
  assert.equal(escapeHtml(""), "");

  // Prove the implementation does not depend on String.prototype.replaceAll
  // (Chrome 85+, Aug 2020) by taking it away.
  const previous = String.prototype.replaceAll;
  delete String.prototype.replaceAll;
  try {
    assert.equal(escapeHtml("<&>"), "&lt;&amp;&gt;");
  } finally {
    if (previous !== undefined) {
      Object.defineProperty(String.prototype, "replaceAll", {
        value: previous,
        writable: true,
        configurable: true
      });
    }
  }
});

test("id generation survives a WebView with no randomUUID and no crypto at all", async () => {
  const { createIdempotencyKey, createUuid } = await import("../src/dental-map/lib/secure.ts");

  // The server-side idempotency guard in useDentalData accepts this shape only.
  const SERVER_SHAPE = /^[0-9a-f-]{36}$/i;
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  const previous = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const useCrypto = (value) =>
    Object.defineProperty(globalThis, "crypto", { value, configurable: true, writable: true });
  try {
    // 1. Modern browser: the native implementation is still preferred.
    let nativeCalls = 0;
    useCrypto({
      randomUUID: () => {
        nativeCalls += 1;
        return "11111111-2222-4333-8444-555555555555";
      }
    });
    assert.equal(createUuid(), "11111111-2222-4333-8444-555555555555");
    assert.equal(nativeCalls, 1);

    // 2. Chrome 92+ shape but a non-secure context: present, and throws.
    useCrypto({
      randomUUID: () => {
        throw new TypeError("randomUUID is not available in an insecure context");
      },
      getRandomValues: (bytes) => bytes.fill(0xab)
    });
    assert.match(createUuid(), V4, "a throwing randomUUID must degrade, not crash the view");

    // 3. Pre-Chrome-92 WebView: no randomUUID, but getRandomValues exists.
    let seeded = 0;
    useCrypto({
      getRandomValues: (bytes) => {
        seeded += 1;
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = index * 7;
        return bytes;
      }
    });
    const seededId = createUuid();
    assert.equal(seeded, 1, "the strongest available source must actually be used");
    assert.match(seededId, V4);
    assert.match(seededId, SERVER_SHAPE);

    // 4. No crypto object at all (old WebView over plain http).
    useCrypto(undefined);
    const ids = new Set();
    for (let index = 0; index < 200; index += 1) {
      const id = createUuid();
      assert.match(id, V4, "the last-resort path must still produce the server's shape");
      ids.add(id);
    }
    assert.equal(ids.size, 200, "ids must not collide with each other");
    assert.match(createIdempotencyKey(), /^miniapp-payment-[0-9a-f-]{36}$/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "crypto", previous);
    else delete globalThis.crypto;
  }
});

test("no view calls a post-2020 API bare, the way FeedbackView and MapView used to", () => {
  const files = ["src", "app", "components"].flatMap((dir) =>
    readdirSync(resolve(dir), { recursive: true })
      .map((name) => `${dir}/${String(name).split(sep).join("/")}`)
      .filter((name) => /\.tsx?$/.test(name))
  );
  assert.ok(files.length > 20, "the file list must be real");

  for (const file of files) {
    const source = readFileSync(resolve(file), "utf8");
    if (file !== "src/dental-map/lib/html.ts") {
      assert.equal(/\.replaceAll\(/.test(source), false, `${file} calls replaceAll (Chrome 85+)`);
    }
    if (file !== "src/dental-map/lib/secure.ts") {
      assert.equal(
        /\bcrypto\.randomUUID\(/.test(source),
        false,
        `${file} calls crypto.randomUUID directly (Chrome 92+, secure context only) — use createUuid`
      );
    }
  }
});
