import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    timeout: 120000,       // 2 min per test (covers Render free-tier warm-up in beforeAll)
    globalTimeout: 600000, // 10 min total
    reporter: 'list',
    use: {
        baseURL: 'https://redflag-source.onrender.com',
        trace: 'off',
        video: 'off',
        actionTimeout: 15000,
        navigationTimeout: 30000,
        geolocation: { longitude: -122.4194, latitude: 37.7749 },
        permissions: ['geolocation', 'camera', 'microphone']
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
