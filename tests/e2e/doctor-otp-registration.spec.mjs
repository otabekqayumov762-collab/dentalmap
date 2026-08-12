import { expect, test } from "@playwright/test";

/**
 * Covers the OTP-enabled build. Production currently ships with OTP OFF (no
 * eSKIZ credentials yet), and `npm run test:e2e` therefore builds with it off so
 * the suite exercises what actually ships — which makes this seven-pane flow a
 * six-pane one and this spec meaningless against that bundle.
 *
 * So it declares its requirement instead of failing confusingly, and
 * `npm run test:e2e:otp` builds with the flag on and runs it. Both
 * configurations are covered; neither is silently skipped.
 */
test.skip(
  process.env.E2E_OTP_ENABLED !== "true",
  "needs an OTP-enabled build — run: npm run test:e2e:otp"
);

const APP_ORIGIN = "http://127.0.0.1:4300";
const API_ORIGIN = "https://api.dental.example";

const doctorUser = {
  id: "doc-1",
  full_name: "Doktor OTP",
  phone: "+998 90 123 45 67",
  role: "doctor",
  doctor_profile: { id: "dp-1", approval_status: "pending", is_published: false, is_subscription_active: true }
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

/**
 * The doctor signup is now seven panes gated on an SMS code, and the two things
 * that must never regress are invisible in a screenshot: the ticket has to reach
 * the single final POST, and neither the password nor the ticket may ever land
 * in browser storage. Both are asserted at the bottom of this test.
 */
test("doctor OTP wizard walks 7 panes and posts the ticket", async ({ page }) => {
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
      return json(route, { otp_token: "signed-ticket", expires_in: 900 });
    }
    if (path === "/api/auth/register/") {
      registerBody = request.postData() || "";
      registered = true;
      return json(route, { user: doctorUser, tokens: { access: "acc" } }, 201);
    }
    if (path === "/api/users/me/") return json(route, registered ? doctorUser : null, registered ? 200 : 401);
    if (path === "/api/doctors/me/") return json(route, { id: "dp-1", is_subscription_active: true });
    if (path === "/api/specialties/") return json(route, { results: [{ id: "s1", name: "Ortodont" }] });
    if (path === "/api/services/") {
      return json(route, {
        results: [
          { id: "v1", name: "Tish davolash" },
          { id: "v2", name: "Breket" },
          { id: "v3", name: "Rentgen" },
          { id: "v4", name: "Konsultatsiya" }
        ]
      });
    }
    if (path === "/api/doctors/") return json(route, { results: [] });
    return json(route, { results: [] });
  });

  await page.goto("/");
  await page.getByLabel("Kirish yoki ro'yxatdan o'tish").getByRole("button", { name: "Ro'yxatdan o'tish" }).click();
  await page.getByLabel("Rol tanlash").getByRole("button", { name: "Shifokor" }).click();

  // Pane 1 — identity.
  await expect(page.getByRole("heading", { name: "Shaxsiy ma'lumotlar", level: 2 })).toBeVisible();
  const advance = page.getByRole("button", { name: "Davom etish" });
  await page.getByRole("textbox", { name: "Shifokor F.I.O." }).fill("Doktor OTP");
  await page.getByRole("textbox", { name: /Telefon raqam/ }).fill("901234567");
  // Consent is required: the CTA must refuse before it is ticked.
  await advance.click();
  await expect(page.getByText("SMS kod yuborilishiga rozilik bering.").first()).toBeVisible();
  expect(otpRequests).toBe(0);
  await page.locator('input[name="sms_consent"]').check();
  await advance.click();

  // Pane 2 — OTP.
  await expect(page.getByRole("heading", { name: "Kodni tasdiqlang", level: 2 })).toBeVisible();
  expect(otpRequests).toBe(1);
  await expect(page.getByText("+998 90 ••• •• 67")).toBeVisible();
  await expect(page.getByRole("button", { name: /Qayta yuborish \(0:/ })).toBeDisabled();
  await expect(advance).toBeDisabled();

  // A wrong code keeps the user on the pane with a real message.
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
  await page.getByLabel("Parolni takrorlang", { exact: true }).fill("Mismatch1!");
  await advance.click();
  await expect(page.getByText("Parollar bir xil emas.").first()).toBeVisible();
  await page.getByLabel("Parolni takrorlang", { exact: true }).fill("StrongPass123!");
  await advance.click();

  // Pane 4 — gender (auto-advances).
  await expect(page.getByRole("heading", { name: "Jinsi", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Erkak", exact: true }).click();

  // Pane 5 — photo, skippable.
  await expect(page.getByRole("heading", { name: "Shifokor rasmi", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "O'tkazib yuborish" }).click();

  // Pane 6 — professional.
  await expect(page.getByRole("heading", { name: "Mutaxassislik", level: 2 })).toBeVisible();
  // Specialty is a sheet picker, not a native <select> — Android drew that
  // dropdown itself, in a different visual language from the rest of the form.
  // Driven from the keyboard on purpose: a native select is keyboard-operable
  // for free, and a replacement that is not would be a downgrade.
  const specialty = page.getByRole("combobox", { name: "Asosiy yo'nalish" });
  await expect(specialty).toHaveAttribute("aria-expanded", "false");
  await specialty.press("Enter");
  await expect(specialty).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("listbox").press("Enter");
  await expect(specialty).toHaveAttribute("aria-expanded", "false");
  await expect(specialty).toContainText("Ortodont");
  // The hidden input is what the form actually submits.
  await expect(page.locator('input[name="specialty"]')).toHaveValue("Ortodont");
  await page.getByRole("textbox", { name: "Ish staji" }).fill("8");
  await advance.click();

  // Pane 7 — clinic, the only pane that submits.
  await expect(page.getByRole("heading", { name: "Klinika", level: 2 })).toBeVisible();
  await page.getByRole("textbox", { name: "Ishlaydigan klinika nomi" }).fill("Dental Map");
  await page.getByRole("button", { name: "Tumanni tanlang" }).click();
  await page.getByRole("button", { name: "Toshkent shahri", exact: true }).click();
  await page.getByRole("button", { name: "Yakkasaroy", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Klinika lokatsiyasi linki" })
    .fill("https://maps.google.com/?q=41.311081,69.240562");
  await page.locator('input[name="privacy_acknowledged"]').check();
  await page.locator("#doctor-register-advance").click();

  await expect.poll(() => registered).toBe(true);
  expect(registerBody).toContain('name="otp_token"');
  expect(registerBody).toContain("signed-ticket");
  expect(registerBody).not.toContain('name="sms_consent"');
  expect(registerBody).not.toContain('name="password_confirm"');
  expect(registerBody).toContain("StrongPass123!");

  // The password and the ticket never reach any browser storage.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("StrongPass123!");
  expect(stored).not.toContain("signed-ticket");
});
