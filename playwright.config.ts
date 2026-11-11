import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // Un retry indique une instabilité à corriger ; il ne doit pas produire une CI verte.
  failOnFlakyTests: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: true } },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 0.0.0.0 --port 3100',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: { APP_URL: 'http://127.0.0.1:3100' },
  },
});
