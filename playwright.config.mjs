import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  timeout: 30_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4300",
    channel: "chrome",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "HOST=127.0.0.1 PORT=4300 npm start",
    url: "http://127.0.0.1:4300",
    reuseExistingServer: false,
    timeout: 30_000
  }
});
