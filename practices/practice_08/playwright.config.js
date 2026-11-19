const { defineConfig } = require('@playwright/test');
const path = require('node:path');

const PORT = Number(process.env.E2E_PORT || 3123);

module.exports = defineConfig({
  testDir: './test/client',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ru-RU',
  },
  webServer: {
    command: 'node server.js',
    url: `http://127.0.0.1:${PORT}/api/tasks`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      DB_PATH: path.join(__dirname, 'data', 'e2e.db'),
    },
  },
  globalSetup: require.resolve('./test/client/global-setup.js'),
});
