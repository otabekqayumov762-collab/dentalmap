import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { MAX_PHOTO_BYTES, validatePhotoFile, validateReceiptFile } from "../src/dental-map/lib/fileUpload.ts";
import { toSafeTelHref } from "../src/dental-map/lib/phone.ts";
import { clearSensitiveStorage, migrateSensitiveStorage } from "../src/dental-map/lib/sensitiveStorage.ts";
import {
  getAccessToken,
  getRefreshToken,
  restoreAuthTokens,
  storeAuthTokens
} from "../src/dental-map/lib/tokenStore.ts";
import { isSafeHttpUrl, isSafeMapUrl, isSafeTelegramUrl } from "../src/dental-map/lib/url.ts";

test("map URLs require canonical HTTPS Google/Yandex map endpoints", () => {
  assert.equal(isSafeMapUrl("https://www.google.com/maps/search/?q=dentist"), true);
  assert.equal(isSafeMapUrl("https://maps.google.com/?q=dentist"), true);
  assert.equal(isSafeMapUrl("https://maps.app.goo.gl/example"), true);
  assert.equal(isSafeMapUrl("https://yandex.uz/maps/?text=dentist"), true);
  assert.equal(isSafeMapUrl("https://google.com.evil.example/maps"), false);
  assert.equal(isSafeMapUrl("https://www.google.com/url?q=https://evil.example"), false);
  assert.equal(isSafeMapUrl("https://maps.google.com/url?q=https://evil.example"), false);
  assert.equal(isSafeMapUrl("https://maps.app.goo.gl.evil.example/example"), false);
  assert.equal(isSafeMapUrl("http://google.com/maps"), false);
  assert.equal(isSafeMapUrl("javascript:alert(1)"), false);
});

test("external and Telegram URL validation rejects credentials and lookalike hosts", () => {
  assert.equal(isSafeHttpUrl("https://user:password@example.com/"), false);
  assert.equal(isSafeTelegramUrl("https://t.me/dental_bot"), true);
  assert.equal(isSafeTelegramUrl("https://t.me.evil.example/dental_bot"), false);
  assert.equal(isSafeTelegramUrl("http://t.me/dental_bot"), false);
});

test("upload validation enforces extensions, specific MIME allowlists and limits", () => {
  assert.equal(validatePhotoFile({ name: "doctor.jpg", size: 1024, type: "image/jpeg" }), "");
  assert.match(validatePhotoFile({ name: "doctor.svg", size: 1024, type: "image/svg+xml" }), /JPG/);
  assert.match(
    validatePhotoFile({ name: "doctor.jpg", size: MAX_PHOTO_BYTES + 1, type: "image/jpeg" }),
    /5 MB/
  );
  assert.equal(validateReceiptFile({ name: "receipt.pdf", size: 2048, type: "application/pdf" }), "");
  assert.equal(validateReceiptFile({ name: "receipt.pdf", size: 2048, type: "" }), "");
  assert.equal(
    validateReceiptFile({ name: "receipt.jpg", size: 2048, type: "application/octet-stream" }),
    ""
  );
  assert.match(validateReceiptFile({ name: "receipt.html", size: 2048, type: "text/html" }), /PDF/);
  assert.match(validateReceiptFile({ name: "receipt.html", size: 2048, type: "" }), /PDF/);
});

test("dial links reject USSD and control characters", () => {
  assert.equal(toSafeTelHref("+998 90 123 45 67"), "tel:+998901234567");
  assert.equal(toSafeTelHref("*21*+998901234567#"), "");
  assert.equal(toSafeTelHref("+99890123;ext=4"), "");
});

test("legacy medical/profile data is removed from persistent storage", () => {
  const storage = (seed = {}) => {
    const values = new Map(Object.entries(seed));
    return {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value))
    };
  };
  const previousWindow = globalThis.window;
  const localStorage = storage({
    "dental-map-user-profile": '{"name":"Patient"}',
    dentalmap_appointment_leads: '[{"phone":"+998"}]',
    dentalmap_telegram_init_data: "signed-secret"
  });
  const sessionStorage = storage();
  globalThis.window = { localStorage, sessionStorage };

  try {
    migrateSensitiveStorage();
    assert.equal(localStorage.getItem("dental-map-user-profile"), null);
    assert.equal(sessionStorage.getItem("dental-map-user-profile"), '{"name":"Patient"}');
    assert.equal(localStorage.getItem("dentalmap_appointment_leads"), null);
    assert.equal(sessionStorage.getItem("dentalmap_telegram_init_data"), null);
    clearSensitiveStorage();
    assert.equal(sessionStorage.getItem("dental-map-user-profile"), null);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("privacy migration removes every persistent key when session storage is full", () => {
  const storage = (seed = {}) => {
    const values = new Map(Object.entries(seed));
    return {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value))
    };
  };
  const persistentKeys = [
    "dental-map-user-profile",
    "dentalmap_login_draft",
    "dentalmap_appointment_draft",
    "dentalmap_local_account",
    "dentalmap_local_appointments",
    "dentalmap_local_reviews",
    "dentalmap_appointment_leads",
    "dentalmap_telegram_init_data"
  ];
  const previousWindow = globalThis.window;
  const localStorage = storage(Object.fromEntries(persistentKeys.map((key) => [key, "sensitive"])));
  const sessionStorage = storage();
  sessionStorage.setItem = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };
  globalThis.window = { localStorage, sessionStorage };

  try {
    migrateSensitiveStorage();
    for (const key of persistentKeys) {
      assert.equal(localStorage.getItem(key), null, `${key} must not remain persistent`);
    }
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

function withFakeStorage(run) {
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value))
    };
  };
  const previousWindow = globalThis.window;
  const previousMode = process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE;
  const localStorage = storage();
  const sessionStorage = storage();
  globalThis.window = { localStorage, sessionStorage };

  try {
    return run({ localStorage, sessionStorage });
  } finally {
    storeAuthTokens({});
    if (previousMode === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE;
    } else {
      process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE = previousMode;
    }
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
}

test("legacy-session fallback rejects a stored token owned by another account", () => {
  withFakeStorage(({ sessionStorage }) => {
    // The ownership check only has anything to guard in legacy-session mode,
    // because that is the only mode that persists tokens at all.
    process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE = "legacy-session";
    storeAuthTokens({
      user: { id: "user-a", telegram_id: 111 },
      tokens: { access: "access-a", refresh: "refresh-a" }
    });
    assert.equal(restoreAuthTokens(111), "access-a");
    assert.equal(restoreAuthTokens(222), "");
    assert.equal(sessionStorage.getItem("dentalmap_auth_tokens"), null);
  });
});

test("cookie mode never persists or restores auth tokens", () => {
  withFakeStorage(({ localStorage, sessionStorage }) => {
    // Cookie mode is the production default: the refresh credential is an
    // HttpOnly cookie, so no token may reach web storage where an XSS could
    // read it, and nothing may be restored from a previous build's leftovers.
    delete process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE;
    storeAuthTokens({
      user: { id: "user-a", telegram_id: 111 },
      tokens: { access: "access-a", refresh: "refresh-a" }
    });
    assert.equal(sessionStorage.getItem("dentalmap_auth_tokens"), null);
    assert.equal(localStorage.getItem("dentalmap_auth_tokens"), null);
    assert.equal(getRefreshToken(), "", "cookie mode must keep no refresh token in JS");
    assert.equal(getAccessToken(), "access-a", "the short-lived access token stays in memory only");

    // A leftover token from an older legacy-session build must be cleared, not honoured.
    sessionStorage.setItem(
      "dentalmap_auth_tokens",
      JSON.stringify({ access: "stale-access", refresh: "stale-refresh", ownerTelegramId: 111 })
    );
    assert.equal(restoreAuthTokens(111), "");
    assert.equal(sessionStorage.getItem("dentalmap_auth_tokens"), null);
    assert.equal(getRefreshToken(), "");
  });
});

test("build environment validator rejects unsafe public redirects", () => {
  const run = (overrides) =>
    spawnSync(process.execPath, ["scripts/validate-env.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: "http://localhost:8000",
        NEXT_PUBLIC_BOT_URL: "",
        NEXT_PUBLIC_SUPPORT_URL: "",
        NEXT_PUBLIC_ADMIN_URL: "admin",
        ...overrides
      }
    });

  assert.notEqual(run({ NEXT_PUBLIC_BOT_URL: "https://t.me.evil.example/bot" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_ADMIN_URL: "https://evil.example/admin" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_API_URL: "javascript:alert(1)" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_MEDIA_URL: "https://user:password@media.example.com" }).status, 0);
});
