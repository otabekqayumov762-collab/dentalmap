import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  HEIC_UNCONVERTED_MESSAGE,
  MAX_PHOTO_BYTES,
  MAX_PICK_BYTES,
  isUnconvertedHeic,
  validatePhotoFile,
  validatePickedPhoto,
  validateReceiptFile
} from "../src/dental-map/lib/fileUpload.ts";
import { toSafeTelHref } from "../src/dental-map/lib/phone.ts";
import { clearSensitiveStorage, migrateSensitiveStorage } from "../src/dental-map/lib/sensitiveStorage.ts";
import {
  getAccessToken,
  getRefreshToken,
  restoreAuthTokens,
  storeAuthTokens
} from "../src/dental-map/lib/tokenStore.ts";
import {
  isLiveLocationLink,
  isResolvableMapLink,
  isSafeHttpUrl,
  isSafeMapUrl,
  isSafeTelegramUrl,
  mapLinkValidationError,
  mapUrlHasCoordinates,
  mapUrlProblem
} from "../src/dental-map/lib/url.ts";
import {
  isTelegramPlaceholderUser,
  requireTelegramOnboardingInitData
} from "../src/dental-map/lib/onboarding.ts";
import {
  isAllowedPaymeCheckoutUrl,
  isAllowedReceiptDocumentUrl,
  openReceiptDocument
} from "../src/dental-map/lib/paymentSecurity.ts";

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

// Every URL below was copied from a live map client or verified with curl. The
// host is what makes a link safe; a host that already IS the maps subdomain does
// not file its pages under /maps, and demanding it there refused real links.
test("a maps host makes any path a map link, a root domain still needs /maps", () => {
  const accepted = [
    // The link the complaint was about: real, 200, and refused before this.
    "https://maps.yandex.com/location-sharing?token=lst_Egj7yFmTPQnsLhoM7vnaqK",
    "https://maps.yandex.uz/org/magicdental/192512106119/",
    "https://maps.google.com/place/Smile+Dent/@41.311081,69.240562,17z",
    "https://yandex.com/maps/org/magicdental/192512106119/",
    "https://yandex.uz/maps/-/CDwvbW-N",
    "https://maps.yandex.com/?ll=69.240562%2C41.311081&z=17",
    "https://www.google.com/maps/place/Smile+Dent/@41.311081,69.240562,17z",
    "https://maps.app.goo.gl/aBcDeFgH1234"
  ];
  for (const url of accepted) {
    assert.equal(mapUrlProblem(url), "", url);
  }

  // Loosening the path must not loosen the host, the scheme, or the redirector.
  assert.equal(mapUrlProblem("https://yandex.uz/search/?text=dentist"), "path");
  assert.equal(mapUrlProblem("https://www.google.com/search?q=dentist"), "path");
  assert.equal(mapUrlProblem("https://maps.google.com/url?q=https://evil.example"), "redirector");
  assert.equal(mapUrlProblem("https://www.google.com/url?q=https://evil.example"), "redirector");
  assert.equal(mapUrlProblem("https://maps.yandex.com.evil.example/anything"), "host");
  assert.equal(mapUrlProblem("https://evil.example/maps/org/1"), "host");
  assert.equal(mapUrlProblem("http://maps.yandex.com/location-sharing?token=x"), "insecure");
  // userinfo trick: the real host is evil.example, and it is caught as
  // credentials rather than being read as the maps host.
  assert.equal(mapUrlProblem("https://maps.yandex.com@evil.example/maps"), "credentials");
  assert.equal(mapUrlProblem("https://user:pass@maps.yandex.com/location-sharing"), "credentials");
  assert.equal(mapUrlProblem("https://127.0.0.1/maps"), "host");
  assert.equal(mapUrlProblem("https://169.254.169.254/maps"), "host");
  assert.equal(mapUrlProblem("javascript:alert(1)"), "invalid");
});

test("a link the server can resolve is accepted without coordinates in the URL", () => {
  for (const url of [
    "https://maps.app.goo.gl/aBcDeFgH1234",
    "https://yandex.uz/maps/-/CDwvbW-N",
    "https://maps.yandex.uz/-/CDwvbW-N",
    "https://yandex.com/maps/org/magicdental/192512106119/",
    "https://maps.yandex.uz/org/magicdental/192512106119/"
  ]) {
    assert.equal(isResolvableMapLink(url), true, url);
    assert.equal(mapLinkValidationError(url), "", url);
  }
  // A plain map view is not resolvable — nothing on it names one place.
  assert.equal(isResolvableMapLink("https://yandex.uz/maps/10335/tashkent/"), false);
  assert.equal(isResolvableMapLink("https://evil.example/maps/org/1"), false);
});

// Verified against the live page: it serves only the viewer's region centre,
// and the position itself comes from an endpoint that needs a session.
test("a real-time location share is refused for what it actually is", () => {
  const live = "https://maps.yandex.com/location-sharing?token=lst_Egj7yFmTPQnsLhoM7vnaqK";
  assert.equal(mapUrlProblem(live), "");
  assert.equal(isLiveLocationLink(live), true);
  assert.equal(isLiveLocationLink("https://yandex.uz/maps/location-sharing?token=lst_x"), true);
  assert.equal(isLiveLocationLink("https://yandex.uz/maps/org/magicdental/1/"), false);
  assert.match(mapLinkValidationError(live), /real vaqtdagi joylashuv/);
});

test("each refusal names its own problem", () => {
  const message = (url) => mapLinkValidationError(url);
  const cases = [
    ["https://evil.example/maps", /Google Maps yoki Yandex Maps havolasi emas/],
    ["https://www.google.com/search?q=dentist", /xarita sahifasiga emas/],
    ["https://maps.google.com/url?q=https://evil.example", /yo'naltiruvchi havolasi/],
    ["http://maps.yandex.com/location-sharing?token=x", /https:\/\/ bilan boshlanishi/],
    ["https://user:pass@maps.yandex.com/maps", /login yoki parol/],
    ["not a url", /To'liq manzilni/],
    ["https://yandex.uz/maps/10335/tashkent/", /aniq nuqta yo'q/]
  ];
  const seen = new Set();
  for (const [url, pattern] of cases) {
    const text = message(url);
    assert.match(text, pattern, url);
    // Distinct reasons must not collapse onto one sentence again.
    assert.equal(seen.has(text), false, text);
    seen.add(text);
  }
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
    /siqib bo'lmadi/
  );

  // The PICKED file plays by different rules, and the distinction is the whole
  // point: a 6 MB phone photo must be accepted at the picker and shrunk, while
  // the same 6 MB arriving at the upload gate means compression did not happen.
  assert.equal(validatePickedPhoto({ name: "IMG_4821.HEIC", size: 6 * 1024 * 1024, type: "" }), "");
  assert.match(validatePhotoFile({ name: "IMG_4821.heic", size: 6 * 1024 * 1024, type: "" }), /JPG/);
  assert.match(
    validatePickedPhoto({ name: "video.jpg", size: MAX_PICK_BYTES + 1, type: "image/jpeg" }),
    /50 MB/
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
  const previousMode = process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE;
  process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE = "legacy-session";

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
});

test("cookie auth keeps access in memory and never stores refresh credentials", () => {
  const values = new Map();
  // Named locally on purpose, the way the tests above do it: asserting against a
  // BARE `sessionStorage` reads Node's own Web Storage global instead of this fake,
  // which is always empty — so the assertions passed for the wrong reason on a Node
  // that defines that global, and threw ReferenceError on one that does not.
  const sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value))
  };
  const previousWindow = globalThis.window;
  const previousMode = process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE;
  process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE = "cookie";
  globalThis.window = { localStorage: sessionStorage, sessionStorage };
  try {
    storeAuthTokens({ tokens: { access: "short-lived", refresh: "must-never-be-readable" } });
    assert.equal(sessionStorage.getItem("dentalmap_auth_tokens"), null);
    assert.equal(values.size, 0, "cookie mode must write nothing to web storage");
    // The short-lived access token still has to be usable from memory...
    assert.equal(getAccessToken(), "short-lived");
    // ...while the refresh credential must be unreachable to JavaScript.
    assert.equal(getRefreshToken(), "");
    assert.equal(restoreAuthTokens(), "");
    assert.equal(sessionStorage.getItem("dentalmap_auth_tokens"), null);
  } finally {
    storeAuthTokens({});
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE;
    else process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE = previousMode;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("Payme checkout redirects require an exact configured HTTPS host", () => {
  // The allowlist comes from a build-time env var. `node --test` seeds nothing, so
  // without this the module would see an EMPTY allowlist and every assertion below
  // would pass for the wrong reason — the negative cases would be "correct" while
  // the positive ones failed. Set it explicitly and restore it afterwards.
  const previousHosts = process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS;
  process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS = "checkout.paycom.uz, test.paycom.uz";
  try {
  assert.equal(isAllowedPaymeCheckoutUrl("https://checkout.paycom.uz/pay/abc"), true);
  assert.equal(isAllowedPaymeCheckoutUrl("https://test.paycom.uz/pay/abc"), true);
  assert.equal(isAllowedPaymeCheckoutUrl("https://checkout.paycom.uz.evil.example/pay"), false);
  assert.equal(isAllowedPaymeCheckoutUrl("https://evil.example/?next=checkout.paycom.uz"), false);
  assert.equal(isAllowedPaymeCheckoutUrl("http://checkout.paycom.uz/pay"), false);
  assert.equal(isAllowedPaymeCheckoutUrl("https://user:secret@checkout.paycom.uz/pay"), false);
  assert.equal(isAllowedPaymeCheckoutUrl("https://checkout.paycom.uz:444/pay"), false);

    // An unset allowlist must fail closed rather than accept anything.
    process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS = "";
    assert.equal(isAllowedPaymeCheckoutUrl("https://checkout.paycom.uz/pay/abc"), false);
  } finally {
    if (previousHosts === undefined) delete process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS;
    else process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS = previousHosts;
  }
});

test("receipt document links are restricted to the configured API v1 origin", () => {
  // Same reason as the Payme block above: the allowed origin is derived from the
  // build-time API base, so it has to be seeded here or every positive assertion
  // would be vacuously false.
  const previousV1 = process.env.NEXT_PUBLIC_API_V1_URL;
  const previousApi = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_V1_URL = "https://billing.dental.example/api/v1";
  process.env.NEXT_PUBLIC_API_URL = "https://api.dental.example";
  const documentPath = "/api/v1/billing/receipt-document/abc.def.ghi/";
  try {
    assert.equal(isAllowedReceiptDocumentUrl(`https://billing.dental.example${documentPath}`), true);

    // Another origin entirely, and a suffix lookalike of the API host.
    assert.equal(isAllowedReceiptDocumentUrl(`https://evil.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`https://billing.dental.example.evil.example${documentPath}`), false);
    // Same registrable domain, different host — and here specifically the OTHER
    // configured base, which the v1 base must outrank exactly as getApiV1Url does.
    assert.equal(isAllowedReceiptDocumentUrl(`https://api.dental.example${documentPath}`), false);
    // Smuggling the trusted origin into a query string of a hostile one.
    assert.equal(
      isAllowedReceiptDocumentUrl("https://evil.example/?next=https://billing.dental.example" + documentPath),
      false
    );
    // `URL.origin` silently drops credentials, so these must be rejected explicitly.
    assert.equal(isAllowedReceiptDocumentUrl(`https://user:secret@billing.dental.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`https://user@billing.dental.example${documentPath}`), false);
    // Right origin, wrong endpoint: the guard must not become a generic open-URL.
    assert.equal(isAllowedReceiptDocumentUrl("https://billing.dental.example/api/v1/billing/payments/"), false);
    assert.equal(isAllowedReceiptDocumentUrl("https://billing.dental.example/"), false);
    // Downgrade and non-http schemes.
    assert.equal(isAllowedReceiptDocumentUrl(`http://billing.dental.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl("javascript:alert(1)"), false);
    assert.equal(isAllowedReceiptDocumentUrl(documentPath), false);
    assert.equal(isAllowedReceiptDocumentUrl(""), false);
    assert.equal(isAllowedReceiptDocumentUrl(null), false);

    // Dev runs the API on http://localhost, which must keep working.
    process.env.NEXT_PUBLIC_API_V1_URL = "http://localhost:8011/api/v1";
    assert.equal(isAllowedReceiptDocumentUrl(`http://localhost:8011${documentPath}`), true);
    // A different port is a different origin.
    assert.equal(isAllowedReceiptDocumentUrl(`http://localhost:8012${documentPath}`), false);

    // Single-origin deployment: no separate v1 base, the app suffixes /api/v1 onto
    // NEXT_PUBLIC_API_URL, so that origin becomes the allowed one.
    process.env.NEXT_PUBLIC_API_V1_URL = "";
    assert.equal(isAllowedReceiptDocumentUrl(`https://api.dental.example${documentPath}`), true);
    assert.equal(isAllowedReceiptDocumentUrl(`https://billing.dental.example${documentPath}`), false);

    // No API base at all must fail closed instead of accepting anything.
    process.env.NEXT_PUBLIC_API_URL = "";
    assert.equal(isAllowedReceiptDocumentUrl(`https://api.dental.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`https://billing.dental.example${documentPath}`), false);
    // The two above pass on the origin comparison alone, so they cannot show that
    // the explicit empty-base guard is doing anything. A non-special scheme can:
    // `URL.origin` is the literal string "null" for it, which would compare equal
    // to a "null" origin — only the empty-base check rejects this one.
    assert.equal(isAllowedReceiptDocumentUrl(`foo://api.dental.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`null${documentPath}`), false);
  } finally {
    if (previousV1 === undefined) delete process.env.NEXT_PUBLIC_API_V1_URL;
    else process.env.NEXT_PUBLIC_API_V1_URL = previousV1;
    if (previousApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousApi;
  }
});

test("same-origin builds allow the receipt document on the host that served the app", () => {
  // With NEXT_PUBLIC_API_URL=same-origin there is no configured hostname to
  // compare against, so the allowlist becomes the page's own origin — the exact
  // host the API is proxied on. Getting this wrong fails CLOSED and leaves the
  // doctor a "chek" button that opens nothing, which is why it is asserted.
  const previousWindow = globalThis.window;
  const previousV1 = process.env.NEXT_PUBLIC_API_V1_URL;
  const previousApi = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_V1_URL = "";
  process.env.NEXT_PUBLIC_API_URL = "same-origin";
  const documentPath = "/api/v1/billing/receipt-document/abc.def.ghi/";

  try {
    globalThis.window = { location: { origin: "https://dental.example" } };
    assert.equal(isAllowedReceiptDocumentUrl(`https://dental.example${documentPath}`), true);
    // Any other host, including the one it used to be pinned to.
    assert.equal(isAllowedReceiptDocumentUrl(`https://api.dental.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`https://dental.example.evil.example${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`https://user:secret@dental.example${documentPath}`), false);
    // Right origin, wrong endpoint stays wrong.
    assert.equal(isAllowedReceiptDocumentUrl("https://dental.example/api/v1/billing/payments/"), false);

    // The app moves to a new hostname; the same bundle keeps working.
    globalThis.window = { location: { origin: "https://dental.uz" } };
    assert.equal(isAllowedReceiptDocumentUrl(`https://dental.uz${documentPath}`), true);
    assert.equal(isAllowedReceiptDocumentUrl(`https://dental.example${documentPath}`), false);

    // An explicit v1 base still outranks the page origin.
    process.env.NEXT_PUBLIC_API_V1_URL = "https://billing.dental.example/api/v1";
    assert.equal(isAllowedReceiptDocumentUrl(`https://billing.dental.example${documentPath}`), true);
    assert.equal(isAllowedReceiptDocumentUrl(`https://dental.uz${documentPath}`), false);

    // Without a window there is no origin to trust, so it must fail closed — and
    // must resolve to an EMPTY origin, not to the string "null": `URL.origin` is
    // literally "null" for a non-special scheme, so anything else here would make
    // the guard accept `foo://...` (the same trap the empty-base case documents).
    process.env.NEXT_PUBLIC_API_V1_URL = "";
    delete globalThis.window;
    assert.equal(isAllowedReceiptDocumentUrl(`https://dental.uz${documentPath}`), false);
    assert.equal(isAllowedReceiptDocumentUrl(`foo://dental.uz${documentPath}`), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousV1 === undefined) delete process.env.NEXT_PUBLIC_API_V1_URL;
    else process.env.NEXT_PUBLIC_API_V1_URL = previousV1;
    if (previousApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousApi;
  }
});

test("receipt documents open through Telegram's own browser, with a real fallback", () => {
  const previousWindow = globalThis.window;
  const previousV1 = process.env.NEXT_PUBLIC_API_V1_URL;
  process.env.NEXT_PUBLIC_API_V1_URL = "https://billing.dental.example/api/v1";
  const documentUrl = "https://billing.dental.example/api/v1/billing/receipt-document/abc.def.ghi/";

  try {
    // Inside Telegram the document MUST be handed to openLink: window.open is a
    // silent no-op there, so a browser-only path would leave a dead button.
    const openLinkCalls = [];
    const skippedOpens = [];
    globalThis.window = {
      Telegram: { WebApp: { openLink: (href, options) => openLinkCalls.push([href, options]) } },
      open: (...args) => {
        skippedOpens.push(args);
        return null;
      }
    };
    assert.equal(openReceiptDocument(documentUrl), true);
    assert.deepEqual(openLinkCalls, [[documentUrl, { try_instant_view: false }]]);
    assert.equal(skippedOpens.length, 0);

    // Outside Telegram the fallback has to actually run, and `noopener` means the
    // returned handle is null even on success — so it cannot gate the result.
    const browserOpens = [];
    globalThis.window = {
      open: (...args) => {
        browserOpens.push(args);
        return null;
      }
    };
    assert.equal(openReceiptDocument(documentUrl), true);
    assert.deepEqual(browserOpens, [[documentUrl, "_blank", "noopener,noreferrer"]]);

    // A rejected URL must open nothing at all, by either route.
    const blocked = [];
    globalThis.window = {
      Telegram: { WebApp: { openLink: (...args) => blocked.push(args) } },
      open: (...args) => {
        blocked.push(args);
        return null;
      }
    };
    assert.equal(openReceiptDocument("https://evil.example/api/v1/billing/receipt-document/abc/"), false);
    assert.equal(openReceiptDocument("javascript:alert(1)"), false);
    assert.equal(blocked.length, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousV1 === undefined) delete process.env.NEXT_PUBLIC_API_V1_URL;
    else process.env.NEXT_PUBLIC_API_V1_URL = previousV1;
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
        NEXT_PUBLIC_SUPPORT_URL: "https://t.me/dentalmap_support",
        NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS: "checkout.paycom.uz",
        NEXT_PUBLIC_ADMIN_URL: "admin",
        ...overrides
      }
    });

  assert.notEqual(run({ NEXT_PUBLIC_BOT_URL: "https://t.me.evil.example/bot" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_ADMIN_URL: "https://evil.example/admin" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_API_URL: "javascript:alert(1)" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_MEDIA_URL: "https://user:password@media.example.com" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_SUPPORT_URL: "" }).status, 0);
  assert.notEqual(run({ NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS: "*.paycom.uz" }).status, 0);
  assert.notEqual(
    run({ NEXT_PUBLIC_AUTH_TOKEN_MODE: "legacy-session", ALLOW_LEGACY_SESSION_AUTH: "" }).status,
    0
  );

  // "same-origin" is the one non-URL value NEXT_PUBLIC_API_URL accepts, and it
  // has to be the WHOLE value: everything below still has to fail the build, or a
  // typo would ship as a relative-looking absolute base like "sameorigin/api/...".
  assert.equal(run({ NEXT_PUBLIC_API_URL: "same-origin" }).status, 0);
  for (const typo of ["sameorigin", "same_origin", "Same-Origin", "same-origin/", "same origin"]) {
    assert.notEqual(run({ NEXT_PUBLIC_API_URL: typo }).status, 0, `${typo} must fail the build`);
  }
  // The token belongs to NEXT_PUBLIC_API_URL alone; the v1 base is still a URL.
  assert.notEqual(run({ NEXT_PUBLIC_API_V1_URL: "same-origin" }).status, 0);
});

test("static export keeps server configuration private and denies sensitive SPA fallbacks", () => {
  const root = mkdtempSync(join(tmpdir(), "dental-static-"));
  const out = join(root, "out");
  mkdirSync(out);
  writeFileSync(join(out, "index.html"), "<!doctype html><script>window.__ok=true</script>");
  const script = resolve("scripts/finalize-static-export.mjs");
  const run = spawnSync(process.execPath, [script, out], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: "https://api.example.test",
      NEXT_PUBLIC_API_V1_URL: "",
      NEXT_PUBLIC_MEDIA_URL: ""
    }
  });
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.throws(() => readFileSync(join(out, "_headers")));
    assert.throws(() => readFileSync(join(out, "nginx.conf")));
    const nginx = readFileSync(join(root, "generated", "nginx.conf"), "utf8");
    assert.match(nginx, /listen 8080/);
    assert.match(nginx, /location ~ \(\^\|\/\)\\\./);
    assert.match(nginx, /\|\\\.git\)/);
    assert.match(nginx, /package\(\?:-lock\)\?/);
    assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("connect-src carries the API origin when it has one, and only 'self' when it does not", () => {
  const cspFor = (apiUrl) => {
    const root = mkdtempSync(join(tmpdir(), "dental-csp-origin-"));
    const out = join(root, "out");
    mkdirSync(out);
    writeFileSync(join(out, "index.html"), "<!doctype html><script>window.__ok=true</script>");
    try {
      const run = spawnSync(process.execPath, [resolve("scripts/finalize-static-export.mjs"), out], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          NEXT_PUBLIC_API_URL: apiUrl,
          NEXT_PUBLIC_API_V1_URL: "",
          NEXT_PUBLIC_MEDIA_URL: "",
          NEXT_PUBLIC_YANDEX_MAPS_API_KEY: ""
        }
      });
      assert.equal(run.status, 0, run.stderr);
      const nginx = readFileSync(join(root, "generated", "nginx.conf"), "utf8");
      const directive = (name) => new RegExp(`[ "]${name} ([^;]+);`).exec(nginx)?.[1];
      return { connect: directive("connect-src"), img: directive("img-src") };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  // Cross-origin API: the origin must still be listed, or every request is blocked.
  const crossOrigin = cspFor("https://api.example.test");
  assert.equal(crossOrigin.connect, "'self' https://api.example.test https://nominatim.openstreetmap.org");
  assert.ok(crossOrigin.img.includes("https://api.example.test"));

  // Same-origin API: 'self' already covers it, so the policy names no host at all
  // and the deployed hostname can change without regenerating this file.
  const sameOrigin = cspFor("same-origin");
  assert.equal(sameOrigin.connect, "'self' https://nominatim.openstreetmap.org");
  assert.equal(sameOrigin.connect.includes("same-origin"), false, "the token must never leak into the policy");
  assert.equal(sameOrigin.img.includes("same-origin"), false);
  assert.ok(sameOrigin.img.startsWith("'self' data: blob:"));
});

test("public bundle scanner rejects private deployment artifacts and server credential markers", () => {
  const root = mkdtempSync(join(tmpdir(), "dental-bundle-scan-"));
  const script = resolve("scripts/scan-public-bundle.mjs");
  writeFileSync(join(root, "index.html"), "<!doctype html><title>Safe</title>");
  const safe = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.equal(safe.status, 0, safe.stderr);

  writeFileSync(join(root, "nginx.conf"), "server {}");
  const artifact = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.notEqual(artifact.status, 0);
  rmSync(join(root, "nginx.conf"));

  writeFileSync(join(root, "bundle.js"), "const leaked = 'PAYME_SECRET_KEY';");
  const secret = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.notEqual(secret.status, 0);
  rmSync(root, { recursive: true, force: true });
});

test("an unconverted HEIC is named as such, not refused as a wrong format", () => {
  // The picker accepts HEIC because that is what an iPhone writes. On a browser
  // that can decode it the compressor turns it into WebP or JPEG and it never
  // reaches this check. Android Chrome cannot, so the original comes back -- and
  // the plain format error told the person to upload the very thing they just
  // picked. Recognised by extension too: both phones hand HEIC over with an empty
  // or generic MIME type.
  assert.equal(isUnconvertedHeic({ name: "IMG_4821.HEIC", type: "" }), true);
  assert.equal(isUnconvertedHeic({ name: "IMG_4821.heif", type: "" }), true);
  assert.equal(isUnconvertedHeic({ name: "photo", type: "image/heic" }), true);

  // What the compressor actually produces must never take this branch.
  assert.equal(isUnconvertedHeic({ name: "IMG_4821.webp", type: "image/webp" }), false);
  assert.equal(isUnconvertedHeic({ name: "IMG_4821.jpg", type: "image/jpeg" }), false);
  assert.equal(isUnconvertedHeic({ name: "chek.pdf", type: "application/pdf" }), false);

  // The message has to say what to change, or it is the old one with new words.
  assert.match(HEIC_UNCONVERTED_MESSAGE, /HEIC/);
  assert.match(HEIC_UNCONVERTED_MESSAGE, /JPEG/);
  assert.doesNotMatch(HEIC_UNCONVERTED_MESSAGE, /Faqat JPG/);
});

test("every location that sets a header still sends the security headers", () => {
  // nginx does not merge add_header down the tree: a location that declares even
  // one of its own DISCARDS every add_header from the server block. `location /`
  // declares Cache-Control -- added to stop browsers serving a cached index.html
  // that names deleted chunks -- and in doing so silently dropped the entire CSP,
  // HSTS, nosniff and Referrer-Policy set from the only response where a CSP does
  // anything: the HTML document. Measured in production: zero CSP headers on the
  // page, while nginx.conf plainly contained a per-build hashed policy.
  //
  // So the rule this pins is nginx's own: if a location sets any header, it must
  // set all of them.
  const root = mkdtempSync(join(tmpdir(), "dental-nginx-"));
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
      NEXT_PUBLIC_MEDIA_URL: ""
    }
  });
  try {
    assert.equal(run.status, 0, run.stderr);
    const nginx = readFileSync(join(root, "generated", "nginx.conf"), "utf8");

    // Split into location blocks by brace depth so the check reads the file the
    // way nginx does, rather than trusting the order things appear in.
    const blocks = [];
    for (let i = nginx.indexOf("location "); i !== -1; i = nginx.indexOf("location ", i + 1)) {
      const open = nginx.indexOf("{", i);
      if (open === -1) continue;
      let depth = 0;
      let end = open;
      for (; end < nginx.length; end += 1) {
        if (nginx[end] === "{") depth += 1;
        else if (nginx[end] === "}" && (depth -= 1) === 0) break;
      }
      blocks.push({ head: nginx.slice(i, open).trim(), body: nginx.slice(open, end) });
    }
    assert.ok(blocks.length >= 3, "location blocks should have been found");

    const required = [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "Strict-Transport-Security",
      "Referrer-Policy",
      "Permissions-Policy"
    ];
    for (const block of blocks) {
      if (!block.body.includes("add_header")) continue; // inherits, which is fine
      for (const header of required) {
        assert.ok(
          block.body.includes(header),
          `${block.head} sets a header but not ${header}, so nginx drops ${header} there`
        );
      }
    }

    // And the document location specifically, since that is the one that matters.
    const slash = blocks.find((block) => block.head === "location /");
    assert.ok(slash, "location / should exist");
    assert.match(slash.body, /Content-Security-Policy/);
    assert.match(slash.body, /Cache-Control "no-cache"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
