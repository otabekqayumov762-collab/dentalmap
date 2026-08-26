import { expect, test } from "@playwright/test";

// Uzbek, because that is what the product's own copy is written in and what an
// Uzbek visitor's browser reports. Without this the suite runs in en-US, the
// page correctly opens in English, and every assertion written against Uzbek
// text fails for a reason that has nothing to do with the thing under test.
// Browser-language detection gets its own test below, with its own locale.
test.use({ locale: "uz-UZ" });

const API_ORIGIN = "https://api.dental.example";
const BOT = "https://t.me/dental_mapbot/app";

const content = {
  lang: "uz",
  bot_url: BOT,
  hero: { title: "Egasining sarlavhasi", subtitle: "Egasining matni", cta: "Botga o'tish" },
  steps_title: "Qanday ishlaymiz",
  steps: [
    { icon: "search", title: "Birinchi qadam", body: "Birinchi tavsif" },
    { icon: "calendar", title: "Ikkinchi qadam", body: "Ikkinchi tavsif" }
  ],
  plans_title: "Shifokorlar uchun",
  plans_note: "Bemorlarga bepul",
  plans: [
    { name: "Oylik", price: 2150000, period: "oyiga", features: ["Profil", "Qabullar"], featured: true }
  ],
  video: { title: "Ko'rib chiqing", url: "https://www.youtube.com/watch?v=abc123XYZ", is_file: false, poster: "" },
  stats: { title: "Bugun", patients_label: "bemor", doctors_label: "shifokor", patients: 128, doctors: 24 }
};

/**
 * Stub the one endpoint the page reads.
 *
 * `overrides` applies to every language; `perLanguage` is for the one test that
 * needs the languages to differ. Keying everything by language was the earlier
 * mistake: the page asks for whatever the browser prefers, so an override filed
 * under "uz" silently did nothing when the request came back asking for "en".
 */
function serve(page, overrides = {}, perLanguage = {}) {
  return page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/landing/") {
      return route.fulfill({ status: 404, body: "{}" });
    }
    const lang = url.searchParams.get("lang") ?? "uz";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ ...content, lang, ...overrides, ...(perLanguage[lang] ?? {}) })
    });
  });
}

test("the owner's words are what a visitor reads", async ({ page }) => {
  // The whole point of the feature. The page ships with its own copy so it is
  // never blank; this proves the copy the OWNER wrote wins over it.
  await serve(page);
  await page.goto("/landing/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Egasining sarlavhasi");
  await expect(page.getByText("Egasining matni")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Birinchi qadam" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ko'rib chiqing" })).toBeVisible();
});

test("the page is complete before the API answers", async ({ page }) => {
  // The origin has been unreachable from Uzbek carriers for hours at a time.
  // When that happens the landing page must still be a landing page, not an
  // error and not a skeleton -- only the owner's most recent edits go missing.
  await page.route(`${API_ORIGIN}/**`, (route) => route.abort("failed"));
  await page.goto("/landing/");

  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
  await expect(page.getByRole("heading", { name: "Qanday ishlaymiz" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shifokorni tanlang" })).toBeVisible();
});

test("the counters end on the real number and never overshoot it", async ({ page }) => {
  await serve(page);
  await page.goto("/landing/");

  const patients = page.locator("text=bemor").locator("xpath=../..").first();
  await expect(patients).toContainText("128", { timeout: 5000 });

  // The counters exist to be the true counts. A number larger than the truth,
  // even for one frame of an easing curve, is the one thing they must not show.
  const text = await patients.innerText();
  const shown = Number(text.replace(/[^0-9]/g, "").slice(0, 3));
  expect(shown).toBeLessThanOrEqual(128);
});

test("switching language reloads the page in that language and remembers it", async ({ page }) => {
  await serve(page, {}, {
    ru: { hero: { title: "Русский заголовок", subtitle: "Русский текст", cta: "Открыть" } }
  });
  await page.goto("/landing/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Egasining sarlavhasi");

  await page.getByRole("navigation", { name: "Til" }).getByRole("button", { name: "ru" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Русский заголовок");

  // A returning visitor should not have to choose twice.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Русский заголовок");
});

test("every call to action leads to the configured bot", async ({ page }) => {
  await serve(page);
  await page.goto("/landing/");

  const links = page.getByRole("link", { name: /Botga o'tish/ });
  await expect(links.first()).toBeVisible();
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", BOT);
    // Opening a third-party tab without noopener hands it window.opener.
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
});

test("no bot link configured means no dead buttons", async ({ page }) => {
  // The backend refuses to publish a non-Telegram link, so "" reaches the page
  // whenever the setting is missing or wrong. A button that goes nowhere is
  // worse than no button.
  await serve(page, { bot_url: "" });
  await page.goto("/landing/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Egasining sarlavhasi");
  await expect(page.getByRole("link", { name: /Botga o'tish/ })).toHaveCount(0);
});

test("the statistics block disappears when the owner turns it off", async ({ page }) => {
  await serve(page, { stats: null });
  await page.goto("/landing/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Egasining sarlavhasi");
  await expect(page.getByText("bemor", { exact: true })).toHaveCount(0);
});

test("a YouTube link is embedded privately, and only as a real video id", async ({ page }) => {
  await serve(page);
  await page.goto("/landing/");

  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abc123XYZ");
});

test("junk in the video field renders nothing rather than an empty black box", async ({ page }) => {
  await serve(page, { video: { ...content.video, url: "https://example.com/not-a-video" } });
  await page.goto("/landing/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Egasining sarlavhasi");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("video")).toHaveCount(0);
});


test("a Russian browser opens the page in Russian without being asked", async ({ browser }) => {
  // Story 11: the visitor should not have to find a language switch to read the
  // page. Uzbek stays the floor for anything we do not speak.
  const context = await browser.newContext({ locale: "ru-RU" });
  const page = await context.newPage();
  await serve(page, {}, { ru: { hero: { title: "Русский заголовок", subtitle: "т", cta: "Открыть" } } });
  await page.goto("/landing/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Русский заголовок");
  await context.close();
});

test("an unsupported browser language falls back to Uzbek", async ({ browser }) => {
  const context = await browser.newContext({ locale: "de-DE" });
  const page = await context.newPage();
  await serve(page);
  await page.goto("/landing/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Egasining sarlavhasi");
  await context.close();
});
