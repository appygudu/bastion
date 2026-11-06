import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:4317", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:4317/exposure",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
