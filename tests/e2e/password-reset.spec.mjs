import { expect, test } from "@playwright/test";

/**
 * Parolni tiklash, end to end against a stubbed API.
 *
 * Four things here are invisible in a screenshot and are the reason this spec
 * exists:
 *   - the three POST bodies the backend contract is written against;
 *   - the 429, which must name a waiting time instead of "keyinroq";
 *   - the wording on the code pane, which may not claim an SMS was sent — the
 *     request endpoint answers a stranger exactly as it answers a member, and
 *     copy that says "we sent you a code" would leak the difference the backend
 *     spent a constant-time floor hiding;
 *   - where a finished reset lands: the sign-in form, number already filled,
 *     with neither the ticket nor the password left in any browser storage.
 *
 * Unlike the doctor OTP wizard this flow has no build flag, so it runs in the
 * ordinary `npm run test:e2e` suite.
 */

const APP_ORIGIN = "http://127.0.0.1:4300";
const API_ORIGIN = "https://api.dental.example";

function json(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": APP_ORIGIN,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization, content-type, x-csrftoken, idempotency-key",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
    },
    body: JSON.stringify(payload)
  });
}

test("a backend that mints no session still lands the user on sign-in", async ({ page }) => {
  const stub = (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
  await page.route("https://telegram.org/js/telegram-web-app.js", stub);
  await page.route("**/telegram-web-app.js", stub);

  let requestBody = null;
  let verifyBody = null;
  let confirmBody = null;
  let requests = 0;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": APP_ORIGIN,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "authorization, content-type, x-csrftoken",
          "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
        }
      });
    }
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/csrf/") return json(route, { csrf_token: "csrf" });
    if (path === "/api/auth/password/reset/request/") {
      requests += 1;
      requestBody = request.postDataJSON();
      // The very first attempt hits a ceiling: every cap the backend has answers
      // with this exact shape, and retry_after is the only thing in it a person
      // can act on.
      if (requests === 1) {
        return json(route, { detail: "Juda ko'p urinish. Keyinroq urinib ko'ring.", retry_after: 90 }, 429);
      }
      return json(route, { sent: true, expires_in: 120, resend_after: 60, code_length: 6 });
    }
    if (path === "/api/auth/password/reset/verify/") {
      verifyBody = request.postDataJSON();
      if (verifyBody.code !== "123456") {
        return json(route, { code: "Kod noto'g'ri.", attempts_left: 4 }, 400);
      }
      return json(route, { reset_token: "signed-reset-ticket", expires_in: 900 });
    }
    if (path === "/api/auth/password/reset/confirm/") {
      confirmBody = request.postDataJSON();
      return json(route, { detail: "Parol yangilandi." });
    }
    if (path === "/api/users/me/") return json(route, { detail: "unauthorised" }, 401);
    if (path === "/api/doctors/") return json(route, { results: [] });
    return json(route, { results: [] });
  });

  await page.goto("/");

  // The entry point: under the password field, on the sign-in form.
  const forgot = page.getByRole("button", { name: "Parolni unutdingizmi?" });
  await expect(forgot).toBeVisible();
  await forgot.click();

  // Step 1 — the number. The back button here is the way out of the flow.
  await expect(page.getByRole("heading", { name: "Parolni tiklash", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(page.getByLabel("Parol", { exact: true })).toBeVisible();
  await forgot.click();

  const phone = page.getByRole("textbox", { name: /Telefon raqam/ });
  await phone.fill("901110001");
  const sendCode = page.getByRole("button", { name: "Kod yuborish" });

  // A 429 has to answer "when", in Uzbek. 90 seconds reads as 2 minutes.
  await sendCode.click();
  await expect(page.getByText("Juda ko'p urinish. 2 daqiqadan keyin qayta urinib ko'ring.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parolni tiklash", level: 2 })).toBeVisible();

  await sendCode.click();

  // Step 2 — the code, on the registration wizard's own pane.
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  expect(requestBody).toEqual({ phone: "+998 90 111 00 01" });
  await expect(page.getByText("+998 90 ••• •• 01")).toBeVisible();
  // Never "kod yubordik": for a number with no account nothing was sent.
  await expect(page.getByText(/Agar bu raqamda hisob bo'lsa, unga 6 xonali kod yuborildi\./)).toBeVisible();

  // The cooldown is a running clock on a disabled button, not a silent refusal.
  const resend = page.getByRole("button", { name: /Qayta yuborish/ });
  await expect(resend).toBeDisabled();
  await expect(page.getByText(/^Yangi kodni 0:\d\d dan keyin so'rash mumkin\.$/)).toBeVisible();
  const firstTick = await resend.textContent();
  await expect.poll(() => resend.textContent(), { timeout: 5000 }).not.toBe(firstTick);

  const boxes = page.getByLabel(/-raqam$/);
  await boxes.first().fill("000000");
  await expect(page.getByText("Kod noto'g'ri.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();

  await boxes.first().fill("123456");

  // Step 3 — the new password.
  await expect(page.getByRole("heading", { name: "Yangi parol", level: 2 })).toBeVisible();
  expect(verifyBody).toEqual({ phone: "+998 90 111 00 01", code: "123456" });
  const save = page.getByRole("button", { name: "Saqlash" });
  await page.getByLabel("Yangi parol", { exact: true }).fill("Short1!");
  await save.click();
  await expect(page.getByText("Parol kamida 8 ta belgidan iborat bo'lishi kerak.")).toBeVisible();
  expect(confirmBody).toBe(null);

  await page.getByLabel("Yangi parol", { exact: true }).fill("StrongPass123!");
  await page.getByLabel("Parolni takrorlang", { exact: true }).fill("Mismatch1!");
  await save.click();
  await expect(page.getByText("Parollar bir xil emas.")).toBeVisible();
  expect(confirmBody).toBe(null);

  await page.getByLabel("Parolni takrorlang", { exact: true }).fill("StrongPass123!");
  await save.click();

  // The stub answers without {user, tokens}, which is what an older backend
  // does during a rolling deploy. The reset still succeeds; the user is sent
  // to sign-in with the number filled rather than to a cabinet they are not
  // signed in to.
  await expect(page.getByText("Parol yangilandi. Endi yangi parol bilan kiring.")).toBeVisible();
  await expect(page.getByLabel("Parol", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Telefon raqam/ })).toHaveValue("90 111 00 01");
  expect(confirmBody).toEqual({
    phone: "+998 90 111 00 01",
    reset_token: "signed-reset-ticket",
    password: "StrongPass123!"
  });

  // The ticket and the password never reach any browser storage.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("signed-reset-ticket");
  expect(stored).not.toContain("StrongPass123!");
});

test("a completed reset signs the user in and lands in the app", async ({ page }) => {
  const stub = (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
  await page.route("https://telegram.org/js/telegram-web-app.js", stub);
  await page.route("**/telegram-web-app.js", stub);

  let requestBody = null;
  let verifyBody = null;
  let confirmBody = null;
  let requests = 0;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": APP_ORIGIN,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "authorization, content-type, x-csrftoken",
          "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
        }
      });
    }
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/csrf/") return json(route, { csrf_token: "csrf" });
    if (path === "/api/auth/password/reset/request/") {
      requests += 1;
      requestBody = request.postDataJSON();
      // The very first attempt hits a ceiling: every cap the backend has answers
      // with this exact shape, and retry_after is the only thing in it a person
      // can act on.
      if (requests === 1) {
        return json(route, { detail: "Juda ko'p urinish. Keyinroq urinib ko'ring.", retry_after: 90 }, 429);
      }
      return json(route, { sent: true, expires_in: 120, resend_after: 60, code_length: 6 });
    }
    if (path === "/api/auth/password/reset/verify/") {
      verifyBody = request.postDataJSON();
      if (verifyBody.code !== "123456") {
        return json(route, { code: "Kod noto'g'ri.", attempts_left: 4 }, 400);
      }
      return json(route, { reset_token: "signed-reset-ticket", expires_in: 900 });
    }
    if (path === "/api/auth/password/reset/confirm/") {
      confirmBody = request.postDataJSON();
      // What the backend now answers: the same {user, tokens} shape a login
      // returns, minted after every other session was revoked.
      return json(route, {
        changed: true,
        user: { id: 47, full_name: "E2E Bemor", phone: "+998 90 111 00 01", role: "user" },
        tokens: { access: "reset-access" }
      });
    }
    if (path === "/api/users/me/") {
      return confirmBody
        ? json(route, { id: 47, full_name: "E2E Bemor", phone: "+998 90 111 00 01", role: "user" })
        : json(route, { detail: "unauthorised" }, 401);
    }
    if (path === "/api/doctors/") return json(route, { results: [] });
    return json(route, { results: [] });
  });

  await page.goto("/");

  // The entry point: under the password field, on the sign-in form.
  const forgot = page.getByRole("button", { name: "Parolni unutdingizmi?" });
  await expect(forgot).toBeVisible();
  await forgot.click();

  // Step 1 — the number. The back button here is the way out of the flow.
  await expect(page.getByRole("heading", { name: "Parolni tiklash", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(page.getByLabel("Parol", { exact: true })).toBeVisible();
  await forgot.click();

  const phone = page.getByRole("textbox", { name: /Telefon raqam/ });
  await phone.fill("901110001");
  const sendCode = page.getByRole("button", { name: "Kod yuborish" });

  // A 429 has to answer "when", in Uzbek. 90 seconds reads as 2 minutes.
  await sendCode.click();
  await expect(page.getByText("Juda ko'p urinish. 2 daqiqadan keyin qayta urinib ko'ring.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parolni tiklash", level: 2 })).toBeVisible();

  await sendCode.click();

  // Step 2 — the code, on the registration wizard's own pane.
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  expect(requestBody).toEqual({ phone: "+998 90 111 00 01" });
  await expect(page.getByText("+998 90 ••• •• 01")).toBeVisible();
  // Never "kod yubordik": for a number with no account nothing was sent.
  await expect(page.getByText(/Agar bu raqamda hisob bo'lsa, unga 6 xonali kod yuborildi\./)).toBeVisible();

  // The cooldown is a running clock on a disabled button, not a silent refusal.
  const resend = page.getByRole("button", { name: /Qayta yuborish/ });
  await expect(resend).toBeDisabled();
  await expect(page.getByText(/^Yangi kodni 0:\d\d dan keyin so'rash mumkin\.$/)).toBeVisible();
  const firstTick = await resend.textContent();
  await expect.poll(() => resend.textContent(), { timeout: 5000 }).not.toBe(firstTick);

  const boxes = page.getByLabel(/-raqam$/);
  await boxes.first().fill("000000");
  await expect(page.getByText("Kod noto'g'ri.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();

  await boxes.first().fill("123456");

  // Step 3 — the new password.
  await expect(page.getByRole("heading", { name: "Yangi parol", level: 2 })).toBeVisible();
  expect(verifyBody).toEqual({ phone: "+998 90 111 00 01", code: "123456" });
  const save = page.getByRole("button", { name: "Saqlash" });
  await page.getByLabel("Yangi parol", { exact: true }).fill("Short1!");
  await save.click();
  await expect(page.getByText("Parol kamida 8 ta belgidan iborat bo'lishi kerak.")).toBeVisible();
  expect(confirmBody).toBe(null);

  await page.getByLabel("Yangi parol", { exact: true }).fill("StrongPass123!");
  await page.getByLabel("Parolni takrorlang", { exact: true }).fill("Mismatch1!");
  await save.click();
  await expect(page.getByText("Parollar bir xil emas.")).toBeVisible();
  expect(confirmBody).toBe(null);

  await page.getByLabel("Parolni takrorlang", { exact: true }).fill("StrongPass123!");
  await save.click();

  // No second login: the session came back with the reset, so the user lands
  // inside the app rather than on a form asking for the password they chose a
  // moment ago.
  await expect(page.getByRole("navigation", { name: "Pastki navigatsiya" })).toBeVisible();
  await expect(page.getByLabel("Parol", { exact: true })).toHaveCount(0);
  expect(confirmBody).toEqual({
    phone: "+998 90 111 00 01",
    reset_token: "signed-reset-ticket",
    password: "StrongPass123!"
  });

  // The ticket and the password never reach any browser storage.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("signed-reset-ticket");
  expect(stored).not.toContain("StrongPass123!");
});

test("stepping back from the new password lands on a code pane that still works", async ({ page }) => {
  // OtpStep is shared by three flows and keeps its "Kod tasdiqlandi"
  // confirmation beat in state, while the reset wizard hides its panes instead
  // of unmounting them. Coming back to step 2 therefore used to render that
  // static card and nothing else — no boxes, no Tasdiqlash, no Qayta yuborish —
  // with the ticket already dropped by the back button. The only exit was a
  // second SMS, and inside the 60s cooldown that is a 429.
  const stub = (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
  await page.route("https://telegram.org/js/telegram-web-app.js", stub);
  await page.route("**/telegram-web-app.js", stub);

  let requests = 0;
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": APP_ORIGIN,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "authorization, content-type, x-csrftoken",
          "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
        }
      });
    }
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/csrf/") return json(route, { csrf_token: "csrf" });
    if (path === "/api/auth/password/reset/request/") {
      requests += 1;
      // The real cooldown: one code per minute for a number.
      if (requests > 1) {
        return json(route, { detail: "Juda ko'p urinish. Keyinroq urinib ko'ring.", retry_after: 47 }, 429);
      }
      return json(route, { sent: true, expires_in: 120, resend_after: 60, code_length: 6 });
    }
    if (path === "/api/auth/password/reset/verify/") {
      return json(route, { reset_token: "signed-reset-ticket", expires_in: 900 });
    }
    if (path === "/api/users/me/") return json(route, { detail: "unauthorised" }, 401);
    return json(route, { results: [] });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Parolni unutdingizmi?" }).click();
  await page.getByRole("textbox", { name: /Telefon raqam/ }).fill("901110001");
  await page.getByRole("button", { name: "Kod yuborish" }).click();
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  await page.getByLabel(/-raqam$/).first().fill("123456");
  await expect(page.getByRole("heading", { name: "Yangi parol", level: 2 })).toBeVisible();

  await page.getByRole("button", { name: "Orqaga" }).click();

  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  // The pane is a working pane again: empty boxes for the code, the button that
  // submits them, and the resend that will free up when the cooldown ends.
  await expect(page.getByLabel(/-raqam$/)).toHaveCount(6);
  await expect(page.getByLabel("1-raqam")).toBeVisible();
  await expect(page.getByLabel("1-raqam")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Tasdiqlash" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Qayta yuborish/ })).toBeVisible();
  // No second SMS was bought to get here.
  expect(requests).toBe(1);

  // And the boxes are live: the code goes through and step 3 is reachable again.
  await page.getByLabel(/-raqam$/).first().fill("123456");
  await expect(page.getByRole("heading", { name: "Yangi parol", level: 2 })).toBeVisible();
});
