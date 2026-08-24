import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // One worker, always. There is a single shared webServer on port 4300, and with
  // two workers its teardown deadlocked: both worker processes outlived the stop
  // signal and were force-killed after the 300s grace period, turning a 50-second
  // suite into a 5.4-minute one that ends in two errors. CI never showed it --
  // the runner has few enough cores that Playwright picked one worker on its own,
  // so the fault only appeared on a developer machine. Pinned rather than left to
  // core count, because "green here, slow and noisy there" is the worst shape for
  // a test suite to have.
  workers: 1,
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
