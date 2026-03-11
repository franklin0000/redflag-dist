import { test, expect } from '@playwright/test';

test.describe.serial('RedFlag Full App Loop', () => {

    const testUser = {
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        name: 'Automation Tester',
        gender: 'other'
    };

    test('01. Authentication Flow', async ({ page }) => {
        // Bypass Splash Screen
        await page.addInitScript(() => {
            window.localStorage.setItem('splash_shown', 'true');
        });

        await page.goto('/#/signup');
        await page.waitForLoadState('networkidle');
        await page.fill('input[name="name"]', testUser.name);
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);

        // Click gender button
        await page.click('button:has-text("Otros")').catch(() => page.click('button:has-text("Mujer")'));

        await page.click('button[type="submit"]');

        // Wait for the app to load
        await expect(page).toHaveURL(/.*\/#\//);

        // Test logout and login
        await page.click('a[href="#/profile"]');

        // Log out (find a button that says log out or sign out)
        const logoutBtn = page.locator('button', { hasText: 'Log Out' });
        await logoutBtn.scrollIntoViewIfNeeded();
        await logoutBtn.click();

        await expect(page).toHaveURL(/.*\/#\/login/);

        // Log back in
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/.*\/#\//);
    });

    // Adding stub parts for Contact, Date Checkin, etc.
    // We'll increment the scenario based on the user request.
    test('02. Add Contact', async ({ page }) => {
        // Navigate or assume we're on Home / Profile
    });

});
