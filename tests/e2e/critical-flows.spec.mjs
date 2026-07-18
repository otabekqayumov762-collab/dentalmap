import { expect, test } from "@playwright/test";

const APP_ORIGIN = "http://127.0.0.1:4300";
const API_ORIGIN = "https://api.dental.example";
const BILLING_ORIGIN = "https://billing.dental.example";

const patient = {
  id: "patient-1",
  full_name: "E2E Bemor",
  phone: "+998 90 123 45 67",
  role: "user",
  telegram_id: 777001,
  profile: { gender: "male", age: 29, district: "Mirzo Ulug'bek tumani", address: "" }
};

const placeholderPatient = {
  ...patient,
  full_name: "Telegram User",
  phone: "tg:777001",
  profile: null
};

const doctor = {
  id: "doctor-1",
  full_name: "Doktor E2E",
  specialty: "Ortodont",
  experience_years: 8,
  clinic_name: "Dental Map Klinikasi",
  clinic_district: "Mirzo Ulug'bek tumani",
  clinic_address: "Toshkent shahri",
  clinic_location_url: "https://maps.google.com/?q=41.311081,69.240562",
  doctor_phone: "+998 90 555 55 55",
  gender: "male",
  rating: 5,
  reviews_count: 0,
  approval_status: "approved",
  is_published: true,
  is_subscription_active: true
};

function json(route, payload, status = 200, extraHeaders = {}) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": APP_ORIGIN,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization, content-type, x-csrftoken, idempotency-key",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });
}

async function blockTelegramBridge(page) {
  // The real Telegram bridge derives state from the embedding URL and would
  // replace this deterministic host stub when the test runs top-level.
  await page.route("https://telegram.org/js/telegram-web-app.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* E2E Telegram host stub */" })
  );
}

async function installTelegramHost(page, userId = 777001) {
  await blockTelegramBridge(page);
  await page.addInitScript((id) => {
    const noop = () => undefined;
    window.__e2eOpenedLinks = [];
    window.Telegram = {
      WebApp: {
        initData: `query_id=e2e&user=${id}&auth_date=1780000000&hash=signed-e2e`,
        initDataUnsafe: { user: { id, first_name: "E2E" } },
        colorScheme: "light",
        viewportHeight: 800,
        viewportStableHeight: 800,
        ready: noop,
        expand: noop,
        close: noop,
        disableVerticalSwipes: noop,
        onEvent: noop,
        offEvent: noop,
        openLink: (url) => window.__e2eOpenedLinks.push(url),
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
  }, userId);
}

async function handlePreflight(route) {
  if (route.request().method() !== "OPTIONS") {
    return false;
  }
  await route.fulfill({
    status: 204,
    headers: {
      "access-control-allow-origin": APP_ORIGIN,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization, content-type, x-csrftoken, idempotency-key",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
    }
  });
  return true;
}

test("password login consumes the atomic cookie-auth payload and persists no token", async ({ page }) => {
  await blockTelegramBridge(page);
  let loginCsrf = "";
  let loginBody = null;
  let logoutBody = "not-called";
  let logoutCsrf = "";
  let logoutAuthorization = "";

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    if (await handlePreflight(route)) return;
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/csrf/") return json(route, { csrf_token: "login-csrf" });
    if (path === "/api/auth/token/") {
      loginCsrf = request.headers()["x-csrftoken"] || "";
      loginBody = request.postDataJSON();
      return json(
        route,
        { user: patient, tokens: { access: "login-access" } },
        200,
        { "set-cookie": "__Host-dentalmap-refresh=opaque-e2e; Path=/; Secure; HttpOnly; SameSite=Lax" }
      );
    }
    if (path === "/api/auth/logout/") {
      logoutBody = request.postData();
      logoutCsrf = request.headers()["x-csrftoken"] || "";
      logoutAuthorization = request.headers().authorization || "";
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": APP_ORIGIN,
          "access-control-allow-credentials": "true"
        }
      });
    }
    if (path === "/api/users/me/") return json(route, patient);
    if (path === "/api/doctors/") return json(route, { results: [doctor] });
    if (path === "/api/clinics/" || path === "/api/appointments/" || path === "/api/reviews/") {
      return json(route, { results: [] });
    }
    if (path === "/api/specialties/" || path === "/api/services/") return json(route, { results: [] });
    return json(route, { detail: `Unhandled login E2E route: ${request.method()} ${path}` }, 404);
  });

  await page.goto("/");
  const loginForm = page.locator("form");
  await loginForm.getByRole("textbox", { name: /Telefon raqam/ }).fill("901234567");
  await loginForm.getByLabel("Parol", { exact: true }).fill("StrongPass123!");
  await loginForm.getByRole("button", { name: "Kirish", exact: true }).click();

  await expect(page.getByRole("navigation", { name: "Pastki navigatsiya" })).toBeVisible();
  expect(loginCsrf).toBe("login-csrf");
  expect(loginBody).toEqual({ phone: "+998 90 123 45 67", password: "StrongPass123!" });
  const storedAuth = await page.evaluate(() => ({
    local: window.localStorage.getItem("dentalmap_auth_tokens"),
    session: window.sessionStorage.getItem("dentalmap_auth_tokens")
  }));
  expect(storedAuth).toEqual({ local: null, session: null });

  const navigation = page.getByRole("navigation", { name: "Pastki navigatsiya" });
  await navigation.getByRole("button", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Chiqish", exact: true }).click();
  await expect.poll(() => logoutBody).not.toBe("not-called");
  expect(logoutBody === null || logoutBody === "").toBe(true);
  expect(logoutCsrf).toBe("login-csrf");
  expect(logoutAuthorization).toBe("Bearer login-access");
});

test("cookie session restore posts an empty refresh request with CSRF", async ({ page }) => {
  await blockTelegramBridge(page);
  let refreshBody = "not-called";
  let refreshCsrf = "";

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    if (await handlePreflight(route)) return;
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/csrf/") return json(route, { csrf_token: "restore-csrf" });
    if (path === "/api/auth/token/refresh/") {
      refreshBody = request.postData();
      refreshCsrf = request.headers()["x-csrftoken"] || "";
      return json(route, { access: "restored-access" });
    }
    if (path === "/api/users/me/") return json(route, patient);
    if (path === "/api/doctors/") return json(route, { results: [doctor] });
    if (path === "/api/clinics/" || path === "/api/appointments/" || path === "/api/reviews/") {
      return json(route, { results: [] });
    }
    if (path === "/api/specialties/" || path === "/api/services/") return json(route, { results: [] });
    return json(route, { detail: `Unhandled restore E2E route: ${request.method()} ${path}` }, 404);
  });

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Pastki navigatsiya" })).toBeVisible();
  expect(refreshBody === null || refreshBody === "").toBe(true);
  expect(refreshCsrf).toBe("restore-csrf");
  expect(await page.evaluate(() => window.sessionStorage.getItem("dentalmap_auth_tokens"))).toBeNull();
});

test("Telegram placeholder onboarding requires privacy consent and creates one real appointment", async ({ page }) => {
  await installTelegramHost(page);

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  let registered = false;
  let telegramCsrf = "";
  let registrationCsrf = "";
  let registrationBody = "";
  const appointmentBodies = [];

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    if (await handlePreflight(route)) return;
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/auth/csrf/") {
      return json(route, { csrf_token: "e2e-csrf" }, 200, {
        "set-cookie": "csrftoken=e2e-csrf; Path=/; Secure; SameSite=None"
      });
    }
    if (path === "/api/auth/telegram/") {
      telegramCsrf = request.headers()["x-csrftoken"] || "";
      return json(route, { user: placeholderPatient, tokens: { access: "placeholder-access" } });
    }
    if (path === "/api/auth/register/") {
      registrationCsrf = request.headers()["x-csrftoken"] || "";
      registrationBody = request.postData() || "";
      registered = true;
      return json(route, { user: patient, tokens: { access: "patient-access" } }, 201);
    }
    if (path === "/api/users/me/") {
      return json(route, registered ? patient : placeholderPatient);
    }
    if (path === "/api/doctors/") {
      return json(route, { results: [doctor] });
    }
    if (path === "/api/clinics/") {
      return json(route, { results: [] });
    }
    if (path === "/api/specialties/") {
      return json(route, { results: [{ id: "specialty-1", name: "Ortodont" }] });
    }
    if (path === "/api/services/") {
      return json(route, { results: [{ id: "service-1", name: "Konsultatsiya" }] });
    }
    if (path === "/api/availability/slots/active/") {
      return json(route, {
        pages: 1,
        results: [{ date: tomorrow, start_time: "09:30:00" }]
      });
    }
    if (path === "/api/appointments/" && request.method() === "POST") {
      const body = request.postDataJSON();
      appointmentBodies.push(body);
      return json(route, {
        id: "appointment-1",
        doctor: body.doctor,
        doctor_name: doctor.full_name,
        full_name: body.full_name,
        phone: body.phone,
        gender: body.gender,
        age: body.age,
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        note: body.note,
        status: "pending",
        created_at: new Date().toISOString()
      }, 201);
    }
    if (path === "/api/appointments/" || path === "/api/reviews/") {
      return json(route, { results: [] });
    }
    return json(route, { detail: `Unhandled E2E route: ${request.method()} ${url.pathname}${url.search}` }, 404);
  });

  await page.goto("/");
  await expect(page.getByText("Telegram profilingizni yakunlang", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirish", exact: true })).toHaveCount(0);

  await page.getByRole("textbox", { name: "F.I.O." }).fill("E2E Bemor");
  await page.getByRole("textbox", { name: /Telefon raqam/ }).fill("901234567");
  await page.getByLabel("Parol", { exact: true }).fill("StrongPass123!");
  await page.getByLabel("Parolni tasdiqlash", { exact: true }).fill("StrongPass123!");
  await page.locator('input[name="privacy_acknowledged"]').check();
  await page.getByRole("button", { name: "Profil yaratish" }).click();

  const navigation = page.getByRole("navigation", { name: "Pastki navigatsiya" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("button", { name: "Shifokor", exact: true }).click();
  await page.getByRole("button", { name: "Qabul", exact: true }).click();

  await expect(page.getByRole("button", { name: "09:30", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "09:30", exact: true }).click();
  await page.getByRole("textbox", { name: "Bemor holati" }).fill("Tish og'rig'ini tekshirtirish kerak.");
  await page.locator('input[name="sharePhoneConsent"]').check();
  await page.getByRole("button", { name: "Qabulga yozilish", exact: true }).click();

  await expect(page.getByText("So'rov yuborildi", { exact: true })).toBeVisible();
  expect(telegramCsrf).toBe("e2e-csrf");
  expect(registrationCsrf).toBe("e2e-csrf");
  expect(registrationBody).not.toContain('name="privacy_acknowledged"');
  expect(appointmentBodies).toHaveLength(1);
  expect(appointmentBodies[0]).toMatchObject({
    doctor: "doctor-1",
    full_name: patient.full_name,
    phone: patient.phone,
    appointment_date: tomorrow,
    appointment_time: "09:30"
  });
});

test("doctor payment fails closed on an untrusted checkout host and opens an exact Payme host", async ({ page }) => {
  await installTelegramHost(page, 777002);
  let safeCheckout = false;

  const doctorUser = {
    id: "doctor-user-1",
    full_name: "Doktor E2E",
    phone: "+998 90 555 55 55",
    role: "doctor",
    telegram_id: 777002,
    doctor_profile: {
      id: "doctor-1",
      approval_status: "approved",
      is_published: true,
      is_subscription_active: false
    }
  };
  const inactiveDoctor = { ...doctor, is_subscription_active: false };

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    if (await handlePreflight(route)) return;
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/csrf/") return json(route, { csrf_token: "doctor-csrf" });
    if (path === "/api/auth/telegram/") {
      return json(route, { user: doctorUser, tokens: { access: "doctor-access" } });
    }
    if (path === "/api/users/me/") return json(route, doctorUser);
    if (path === "/api/doctors/me/") return json(route, inactiveDoctor);
    if (path === "/api/doctors/") return json(route, { results: [inactiveDoctor] });
    if (path === "/api/clinics/" || path === "/api/appointments/" || path === "/api/reviews/") {
      return json(route, { results: [] });
    }
    if (path === "/api/availability/weekly/") return json(route, { results: [] });
    if (path === "/api/specialties/") return json(route, { results: [] });
    if (path === "/api/services/") return json(route, { results: [] });
    return json(route, { detail: `Unhandled E2E route: ${request.method()} ${path}` }, 404);
  });

  await page.route(`${BILLING_ORIGIN}/**`, async (route) => {
    if (await handlePreflight(route)) return;
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/billing/subscription/") {
      return json(route, { amount_uzs: 2_150_000, currency: "UZS", display: "2 150 000 so'm" });
    }
    if (path === "/api/v1/billing/cards/" || (path === "/api/v1/billing/receipts/" && request.method() === "GET")) {
      return json(route, { results: [] });
    }
    if (path === "/api/v1/billing/payments/initiate/") {
      return json(route, {
        provider: "payme",
        checkout_url: safeCheckout
          ? "https://checkout.paycom.uz/pay/e2e-safe"
          : "https://checkout.paycom.uz.evil.example/pay/e2e",
        invoice_id: "invoice-e2e",
        amount_uzs: 2_150_000,
        currency: "UZS",
        account: { account: "doctor-user-1" }
      });
    }
    return json(route, { detail: `Unhandled billing E2E route: ${request.method()} ${path}` }, 404);
  });

  await page.goto("/");
  const paymeButton = page.getByRole("button", { name: "Payme orqali to'lash", exact: true });
  await expect(paymeButton).toBeEnabled();
  await paymeButton.click();
  await expect(page.getByRole("alert").filter({ hasText: "ruxsat etilgan checkout" })).toBeVisible();
  expect(await page.evaluate(() => window.__e2eOpenedLinks)).toEqual([]);

  safeCheckout = true;
  await paymeButton.click();
  await expect(page.getByText("To'lovni Payme sahifasida yakunlang", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => window.__e2eOpenedLinks)).toEqual([
    "https://checkout.paycom.uz/pay/e2e-safe"
  ]);
});

test("privacy notice is a directly accessible production route", async ({ page }) => {
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { name: "Maxfiylik va ma'lumotlarni boshqarish" })).toBeVisible();
  await expect(page.getByText("Saqlash va o'chirish", { exact: true })).toBeVisible();
  await expect(page.getByText("Sharhlar", { exact: true })).toBeVisible();
});
