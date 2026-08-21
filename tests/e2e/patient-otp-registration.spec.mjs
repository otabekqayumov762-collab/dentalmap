import { expect, test } from "@playwright/test";

/**
 * The patient half of the OTP rollout.
 *
 * Patients are the high-volume role, so their wizard is the one where a
 * regression is expensive: every signup now buys an SMS, and the ticket that
 * SMS pays for has to reach the single final POST or the backend refuses the
 * registration outright. `npm run test:e2e` builds with OTP OFF (that is what
 * currently ships), which turns this four-pane flow back into three and makes
 * the spec meaningless — so it declares its requirement rather than failing
 * confusingly, and `npm run test:e2e:otp` builds with the flag on.
 */
test.skip(
  process.env.E2E_OTP_ENABLED !== "true",
  "needs an OTP-enabled build — run: npm run test:e2e:otp"
);

const APP_ORIGIN = "http://127.0.0.1:4300";
const API_ORIGIN = "https://api.dental.example";

const patientUser = {
  id: "patient-1",
  full_name: "Bemor OTP",
  phone: "+998 90 123 45 67",
  role: "user",
  is_phone_verified: true
};

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

test("patient OTP wizard walks 4 panes and posts the ticket", async ({ page }) => {
  await page.route("https://telegram.org/js/telegram-web-app.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" })
  );

  let otpRequests = 0;
  let verifyBody = null;
  let registerBody = "";
  let registered = false;

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
    if (path === "/api/auth/otp/request/") {
      otpRequests += 1;
      return json(route, { sent: true, expires_in: 120, resend_after: 60, code_length: 6 });
    }
    if (path === "/api/auth/otp/verify/") {
      verifyBody = request.postDataJSON();
      if (verifyBody.code !== "123456") {
        return json(route, { code: "Kod noto'g'ri.", attempts_left: 4 }, 400);
      }
      return json(route, { otp_token: "patient-ticket", expires_in: 900 });
    }
    if (path === "/api/auth/register/") {
      registerBody = request.postData() || "";
      registered = true;
      return json(route, { user: patientUser, tokens: { access: "acc" } }, 201);
    }
    if (path === "/api/users/me/") return json(route, registered ? patientUser : null, registered ? 200 : 401);
    if (path === "/api/doctors/") return json(route, { results: [] });
    return json(route, { results: [] });
  });

  await page.goto("/");
  await page.getByLabel("Kirish yoki ro'yxatdan o'tish").getByRole("button", { name: "Ro'yxatdan o'tish" }).click();

  // Pane 1 — identity. The patient path is the default role, no toggle needed.
  await expect(page.getByRole("heading", { name: "Shaxsiy ma'lumotlar", level: 2 })).toBeVisible();
  const advance = page.getByRole("button", { name: "Davom etish" });
  await page.getByRole("textbox", { name: "F.I.O." }).fill("Bemor OTP");
  await page.getByRole("textbox", { name: /Telefon raqam/ }).fill("901234567");
  // Consent gates the SEND, not just the pane: no code may be bought before it.
  await advance.click();
  await expect(page.getByText("SMS kod yuborilishiga rozilik bering.").first()).toBeVisible();
  expect(otpRequests).toBe(0);
  await page.locator('input[name="sms_consent"]').check();
  await advance.click();

  // Pane 2 — the code entry the owner asked for.
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  expect(otpRequests).toBe(1);
  await expect(page.getByText("+998 90 ••• •• 67")).toBeVisible();
  await expect(advance).toBeDisabled();

  const boxes = page.getByLabel(/-raqam$/);
  await boxes.first().fill("000000");
  await expect(page.getByText("Kod noto'g'ri.")).toBeVisible();
  await expect(advance).toBeDisabled();

  await boxes.first().fill("123456");
  await expect(page.getByText("Telefon raqam tasdiqlandi")).toBeVisible();
  expect(verifyBody).toEqual({ phone: "+998 90 123 45 67", code: "123456", purpose: "register-doctor" });
  await advance.click();

  // Pane 3 — password.
  await expect(page.getByRole("heading", { name: "Parol yarating", level: 2 })).toBeVisible();
  await page.getByLabel("Parol", { exact: true }).fill("StrongPass123!");
  await page.getByLabel("Parolni tasdiqlash", { exact: true }).fill("StrongPass123!");
  await advance.click();

  // Pane 4 — the only pane that submits.
  await expect(page.getByRole("heading", { name: "Yakuniy", level: 2 })).toBeVisible();
  await page.locator('input[name="privacy_acknowledged"]').check();
  await page.getByRole("button", { name: "Profil yaratish" }).click();

  await expect.poll(() => registered).toBe(true);
  expect(registerBody).toContain('name="otp_token"');
  expect(registerBody).toContain("patient-ticket");
  expect(registerBody).not.toContain('name="sms_consent"');
  expect(registerBody).not.toContain('name="password_confirm"');

  // The password and the ticket never reach any browser storage.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("StrongPass123!");
  expect(stored).not.toContain("patient-ticket");
});

test("editing the phone after verifying it drops the ticket", async ({ page }) => {
  // The ticket is bound to one number on the backend, so a patient who goes
  // back and corrects a digit must not be able to carry the old ticket forward
  // — that registration would be refused with a message about a code they did
  // successfully enter.
  await page.route("https://telegram.org/js/telegram-web-app.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" })
  );

  let otpRequests = 0;
  let registerCalls = 0;

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
    if (path === "/api/auth/otp/request/") {
      otpRequests += 1;
      return json(route, { sent: true, expires_in: 120, resend_after: 60, code_length: 6 });
    }
    if (path === "/api/auth/otp/verify/") {
      return json(route, { otp_token: "patient-ticket", expires_in: 900 });
    }
    if (path === "/api/auth/register/") {
      registerCalls += 1;
      return json(route, { detail: "unexpected" }, 400);
    }
    if (path === "/api/users/me/") return json(route, null, 401);
    return json(route, { results: [] });
  });

  await page.goto("/");
  await page.getByLabel("Kirish yoki ro'yxatdan o'tish").getByRole("button", { name: "Ro'yxatdan o'tish" }).click();

  const advance = page.getByRole("button", { name: "Davom etish" });
  await page.getByRole("textbox", { name: "F.I.O." }).fill("Bemor OTP");
  const phone = page.getByRole("textbox", { name: /Telefon raqam/ });
  await phone.fill("901234567");
  await page.locator('input[name="sms_consent"]').check();
  await advance.click();

  await page.getByLabel(/-raqam$/).first().fill("123456");
  await expect(page.getByText("Telefon raqam tasdiqlandi")).toBeVisible();

  // Back to the identity pane and change the number.
  await page.getByRole("button", { name: "Raqamni o'zgartirish" }).click();
  await expect(page.getByRole("heading", { name: "Shaxsiy ma'lumotlar", level: 2 })).toBeVisible();
  await phone.fill("909999999");
  await advance.click();

  // A second code was bought for the new number, and the pane is unverified
  // again rather than waving the stale ticket through.
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  await expect.poll(() => otpRequests).toBe(2);
  await expect(page.getByText("Telefon raqam tasdiqlandi")).toHaveCount(0);
  await expect(advance).toBeDisabled();
  expect(registerCalls).toBe(0);
});

test("a Telegram-identified patient is shown the pane, and the code goes to a real number", async ({
  page
}) => {
  // The backend proved that "tg:<id>" is never the number a code is sent to:
  // /api/auth/otp/request/ mints tickets for +998 only, and the telegram row is
  // upgraded in place once the patient verifies a real handset. So the UI must
  // NOT hide the pane from these patients — it must collect a real number from
  // them. This spec is the frontend half of that proof: the placeholder phone
  // never reaches an SMS endpoint, and the wizard is the same four panes.
  const stub = (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
  await page.route("https://telegram.org/js/telegram-web-app.js", stub);
  await page.route("**/telegram-web-app.js", stub);
  await page.addInitScript(() => {
    const noop = () => undefined;
    window.Telegram = {
      WebApp: {
        initData: "query_id=e2e&user=777001&auth_date=1780000000&hash=signed-e2e",
        initDataUnsafe: { user: { id: 777001, first_name: "E2E" } },
        colorScheme: "light",
        viewportHeight: 800,
        viewportStableHeight: 800,
        ready: noop,
        expand: noop,
        requestFullscreen: noop,
        close: noop,
        disableVerticalSwipes: noop,
        onEvent: noop,
        offEvent: noop,
        openLink: noop,
        BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
        MainButton: {
          text: "",
          setText: noop,
          show: noop,
          hide: noop,
          enable: noop,
          disable: noop,
          showProgress: noop,
          hideProgress: noop,
          onClick: noop,
          offClick: noop
        },
        HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }
      }
    };
  });

  const placeholderPatient = {
    id: "patient-1",
    full_name: "Telegram User",
    phone: "tg:777001",
    role: "user",
    telegram_id: 777001,
    profile: null
  };
  const upgradedPatient = { ...placeholderPatient, full_name: "Bemor OTP", phone: "+998 90 123 45 67" };

  const otpPhones = [];
  let registerBody = "";
  let registered = false;

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
    if (path === "/api/auth/telegram/") {
      return json(route, { user: placeholderPatient, tokens: { access: "placeholder-access" } });
    }
    if (path === "/api/auth/otp/request/") {
      otpPhones.push(request.postDataJSON().phone);
      return json(route, { sent: true, expires_in: 120, resend_after: 60, code_length: 6 });
    }
    if (path === "/api/auth/otp/verify/") {
      otpPhones.push(request.postDataJSON().phone);
      return json(route, { otp_token: "tg-patient-ticket", expires_in: 900 });
    }
    if (path === "/api/auth/register/") {
      registerBody = request.postData() || "";
      registered = true;
      return json(route, { user: upgradedPatient, tokens: { access: "acc" } }, 201);
    }
    if (path === "/api/users/me/") return json(route, registered ? upgradedPatient : placeholderPatient);
    return json(route, { results: [] });
  });

  await page.goto("/");

  // Walled into the wizard: no sign-in escape, and no way to skip the panes.
  await expect(page.getByText("Telegram profilingizni yakunlang", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirish", exact: true })).toHaveCount(0);

  // The placeholder is NOT prefilled into the field an SMS would be sent to.
  const phone = page.getByRole("textbox", { name: /Telefon raqam/ });
  await expect(phone).toHaveValue("");

  const advance = page.getByRole("button", { name: "Davom etish" });
  await page.getByRole("textbox", { name: "F.I.O." }).fill("Bemor OTP");
  await phone.fill("901234567");
  await page.locator('input[name="sms_consent"]').check();
  await advance.click();

  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  await page.getByLabel(/-raqam$/).first().fill("123456");
  await expect(page.getByText("Telefon raqam tasdiqlandi")).toBeVisible();
  await advance.click();

  await page.getByLabel("Parol", { exact: true }).fill("StrongPass123!");
  await page.getByLabel("Parolni tasdiqlash", { exact: true }).fill("StrongPass123!");
  await advance.click();

  await page.locator('input[name="privacy_acknowledged"]').check();
  await page.getByRole("button", { name: "Profil yaratish" }).click();

  await expect.poll(() => registered).toBe(true);
  expect(registerBody).toContain("tg-patient-ticket");
  // Every SMS endpoint saw the handset, never the "tg:" placeholder.
  expect(otpPhones).toEqual(["+998 90 123 45 67", "+998 90 123 45 67"]);
  expect(otpPhones.join("|")).not.toContain("tg:");
});
