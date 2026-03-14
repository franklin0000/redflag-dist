import { defineConfig, devices } from '@playwright/test';

// Use local dev server for browser tests (avoids env var injection issues on Render)
// API tests still hit the Render backend directly
const LOCAL_URL = 'http://localhost:5173';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    timeout: 120000,
    globalTimeout: 900000, // 15 min total (includes dev server startup)
    reporter: 'list',
    use: {
        baseURL: LOCAL_URL,
        trace: 'off',
        video: 'off',
        actionTimeout: 20000,
        navigationTimeout: 45000,
        geolocation: { longitude: -122.4194, latitude: 37.7749 },
        permissions: ['geolocation', 'camera', 'microphone'],
        extraHTTPHeaders: {
            'X-Playwright-Test': 'true'
        }
    },
    webServer: {
        command: 'npm run dev',
        url: LOCAL_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
