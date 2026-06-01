import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  webServer: {
    command: "npm run vite:dev",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
    timeout: 120_000
  },
  use: {
    baseURL: "http://127.0.0.1:1420",
    channel: "chrome",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
