import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { MAX_PHOTO_BYTES, validatePhotoFile, validateReceiptFile } from "../src/dental-map/lib/fileUpload.ts";
import { toSafeTelHref } from "../src/dental-map/lib/phone.ts";
import { clearSensitiveStorage, migrateSensitiveStorage } from "../src/dental-map/lib/sensitiveStorage.ts";
import { restoreAuthTokens, storeAuthTokens } from "../src/dental-map/lib/tokenStore.ts";
import {
  isSafeHttpUrl,
  isSafeMapUrl,
  isSafeTelegramUrl,
  mapUrlHasCoordinates
} from "../src/dental-map/lib/url.ts";
import {
  isTelegramPlaceholderUser,
  requireTelegramOnboardingInitData
} from "../src/dental-map/lib/onboarding.ts";

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

test("map coordinate validation mirrors backend-supported coordinate formats", () => {
  assert.equal(mapUrlHasCoordinates("https://maps.google.com/?q=41.311081,69.240562"), true);
  assert.equal(mapUrlHasCoordinates("https://www.google.com/maps/place/Test/@41.311081,69.240562,17z"), true);
  assert.equal(mapUrlHasCoordinates("https://yandex.uz/maps/?ll=69.240562%2C41.311081"), true);
  assert.equal(mapUrlHasCoordinates("https://yandex.uz/maps/?text=41.311081%2C69.240562"), true);
  assert.equal(mapUrlHasCoordinates("https://www.google.com/maps/search/?api=1&query=Smile+Dent"), false);
  assert.equal(mapUrlHasCoordinates("https://maps.app.goo.gl/short-code"), false);
  assert.equal(mapUrlHasCoordinates("https://maps.google.com/?q=91.000000,69.240562"), false);
});

test("Telegram placeholder accounts cannot bypass onboarding without live initData", () => {
  const placeholder = { id: "shell", phone: "tg:777001", telegram_id: 777001, role: "user" };
  assert.equal(isTelegramPlaceholderUser(placeholder), true);
  assert.equal(isTelegramPlaceholderUser({ ...placeholder, telegram_id: 999999 }), true);
  assert.equal(isTelegramPlaceholderUser({ ...placeholder, phone: "+998901234567" }), false);
  assert.throws(() => requireTelegramOnboardingInitData(placeholder, ""), /Telegram sessiyasi/);
  assert.doesNotThrow(() => requireTelegramOnboardingInitData(placeholder, "signed-init-data"));
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

test("Telegram fallback rejects a stored token owned by another account", () => {
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value))
    };
  };
  const previousWindow = globalThis.window;
  const localStorage = storage();
  const sessionStorage = storage();
  globalThis.window = { localStorage, sessionStorage };

  try {
    storeAuthTokens({
      user: { id: "user-a", telegram_id: 111 },
      tokens: { access: "access-a", refresh: "refresh-a" }
    });
    assert.equal(restoreAuthTokens(111), "access-a");
    assert.equal(restoreAuthTokens(222), "");
    assert.equal(sessionStorage.getItem("dentalmap_auth_tokens"), null);
  } finally {
    storeAuthTokens({});
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
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
