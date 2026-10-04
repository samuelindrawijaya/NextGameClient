import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.auth.ts",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
    viewport: { width: 1440, height: 960 },
  },
  reporter: "list",
  webServer: [
    {
      command: "node scripts/mock-admin-supabase.mjs",
      url: "http://127.0.0.1:3501/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        SUPABASE_URL: "http://127.0.0.1:3501",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
        ADMIN_LOGIN_EMAIL: "operator@example.test",
        ADMIN_LOGIN_PASSWORD: "test-operator-password-123",
        ADMIN_SESSION_SECRET:
          "test-secret-for-admin-session-at-least-32-characters",
        ADMIN_ASSET_ID_KIND: "app_id",
        ADMIN_ALLOW_PREVIEW: "false",
        ADMIN_APP_ORIGIN: "",
        ADMIN_ACTOR_USER_ID: "",
      },
    },
  ],
});
