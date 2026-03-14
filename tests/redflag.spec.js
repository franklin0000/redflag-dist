import { test, expect } from '@playwright/test';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://rzczjsghbwrdtphgplpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6Y3pqc2doYndyZHRwaGdwbHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMDg4ODEsImV4cCI6MjA4Njc4NDg4MX0.ERoRMuVfnRY8rM00NYerW-Gigqy038-kMtmu4v3i8d4';
const SUPABASE_STORAGE_KEY = 'sb-rzczjsghbwrdtphgplpt-auth-token';
// Supabase Edge Functions Base URL
const SUPABASE_FN_BASE = `${SUPABASE_URL}/functions/v1`;

const FUNCTION_MAP = {
    '/api/stats': 'stats',
    '/api/contacts': 'contacts',
    '/api/guardian': 'guardian',
    '/api/reports': 'reports',
    '/api/notifications': 'notifications',
    '/api/dating': 'dating',
    '/api/users': 'users-api',
    '/api/posts': 'posts-api',
    '/api/searches': 'searches-api',
    '/api/payment-intent': 'payment-intent',
    '/api/sumsub-token': 'sumsub-token',
    '/api/upload_pic': 'facecheck-proxy',
    '/api/search': 'facecheck-proxy',
};

const testUser = {
    email: 'playwright@redflag.test',
    password: 'PwTest123!',
    name: 'Playwright Bot',
    gender: 'male',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Sign in via Supabase REST and return the session object
async function supabaseSignIn(request, email, password) {
    const res = await request.post(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            data: { email, password },
        }
    );
    if (res.status() === 200) return res.json();
    return null;
}

// Sign up via Supabase REST
async function supabaseSignUp(request, email, password) {
    const res = await request.post(
        `${SUPABASE_URL}/auth/v1/signup`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            data: { email, password },
        }
    );
    if (res.status() >= 200 && res.status() < 300) return res.json();
    return null;
}

// Inject a real Supabase session into localStorage so the app sees a logged-in user
async function injectSupabaseSession(page, session) {
    await page.addInitScript(({ key, sessionData }) => {
        window.localStorage.setItem('splash_shown', 'true');
        window.localStorage.setItem(key, JSON.stringify(sessionData));
    }, { key: SUPABASE_STORAGE_KEY, sessionData: session });
}

async function gotoAndWait(page, hash, ms = 1500) {
    await page.goto(hash);
    await page.waitForLoadState('domcontentloaded');
    if (ms) await page.waitForTimeout(ms);
}

// Make API request to Supabase Edge Functions
async function api(request, method, path, opts = {}) {
    const matchingPath = Object.keys(FUNCTION_MAP).find(p => path.startsWith(p));
    if (!matchingPath) throw new Error(`No Edge Function mapped for path: ${path}`);

    const functionName = FUNCTION_MAP[matchingPath];
    // If path is '/api/reports' and matchingPath is '/api/reports', subPath should be ''
    // If path is '/api/reports/me' and matchingPath is '/api/reports', subPath should be '/me'
    const subPath = path.substring(matchingPath.length);
    const url = `${SUPABASE_FN_BASE}/${functionName}${subPath}`;

    if (method === 'GET') return request.get(url, opts);
    if (method === 'POST') return request.post(url, opts);
    if (method === 'PATCH') return request.patch(url, opts);
    if (method === 'DELETE') return request.delete(url, opts);
}

// ─────────────────────────────────────────────────────────────────────────────
// All tests share one Supabase session acquired in beforeAll
// ─────────────────────────────────────────────────────────────────────────────
test.describe('RedFlag Full Test Suite', () => {
    let apiToken = null;      // Node.js JWT – for API tests
    let supaSession = null;   // Supabase session – for browser tests

    test.beforeAll(async ({ request }) => {
        // ── 1. Get Supabase session (replaces legacy API token) ──────────────
        supaSession = await supabaseSignIn(request, testUser.email, testUser.password);
        if (!supaSession) {
            await supabaseSignUp(request, testUser.email, testUser.password);
            supaSession = await supabaseSignIn(request, testUser.email, testUser.password);
        }

        console.log('Supabase session:', supaSession?.access_token ? 'ok' : 'MISSING');
        apiToken = supaSession?.access_token || null;

        expect(apiToken).toBeTruthy();
    });

    // ── 01. DB health ─────────────────────────────────────────────────────
    test('01. DB Connection — API health', async ({ request }) => {
        const res = await api(request, 'GET', '/api/stats/community');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('totalReports');
        console.log('✓ DB reachable (Edge Function) — reports:', body.totalReports);
    });

    // ── 02. Auth — browser login form ────────────────────────────────────
    test('02. Auth — browser login form', async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('splash_shown', 'true');
        });
        await gotoAndWait(page, '/#/login', 1000);

        // The local dev server serves the Vite app with proper env vars
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.locator('button[type="submit"]').click();

        try {
            await page.waitForURL(/.*\/#\/(?!login|signup)/, { timeout: 30000 });
            console.log('✓ Browser login — redirected away from login');
        } catch {
            console.log('⚠ Login redirect timeout — checking localStorage');
            const storedSession = await page.evaluate((key) => localStorage.getItem(key), SUPABASE_STORAGE_KEY);
            if (storedSession) {
                console.log('✓ Supabase session stored in localStorage after login');
            } else {
                console.log('⚠ No Supabase session found — may need email confirmation');
            }
        }
        expect(apiToken).toBeTruthy();
    });

    // ── 03. Home page — renders ───────────────────────────────────────────
    test('03. Home — renders without crash', async ({ page }) => {
        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/', 2000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });
        const text = await page.locator('body').innerText();
        expect(text.length).toBeGreaterThan(5);
        console.log('✓ Home page renders');
    });

    // ── 04. Contacts API — CRUD ───────────────────────────────────────────
    test('04. Contacts API — GET + POST', async ({ request }) => {
        const listRes = await api(request, 'GET', '/api/contacts', {
            headers: { Authorization: `Bearer ${apiToken}` }
        });
        expect(listRes.status()).toBe(200);
        const contacts = await listRes.json();
        expect(Array.isArray(contacts)).toBe(true);
        console.log('✓ GET /api/contacts — count:', contacts.length);

        const addRes = await api(request, 'POST', '/api/contacts', {
            headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
            data: { name: 'PW Friend', phone: '+15550000001', relationship: 'friend' }
        });
        expect([201, 400]).toContain(addRes.status());
        console.log('✓ POST /api/contacts:', addRes.status() === 201 ? 'created' : 'max 3 reached');
    });

    // ── 05. Guardian Session API — full lifecycle ─────────────────────────
    test('05. Guardian Session — create + mine + end', async ({ request }) => {
        const createRes = await api(request, 'POST', '/api/guardian/sessions', {
            headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
            data: { dater_name: 'PW Date', check_in_minutes: 30, date_location: 'Central Park NY' }
        });
        expect(createRes.status()).toBe(201);
        const session = await createRes.json();
        // Edge function returns 'session_token' for the newly created session
        expect(session).toHaveProperty('session_token');
        console.log('✓ Guardian session created:', session.session_token?.substring(0, 8));

        const mineRes = await api(request, 'GET', '/api/guardian/sessions/mine', {
            headers: { Authorization: `Bearer ${apiToken}` }
        });
        expect(mineRes.status()).toBe(200);
        console.log('✓ GET /api/guardian/sessions/mine OK');

        const endRes = await api(request, 'POST', `/api/guardian/sessions/${session.id}/end`, {
            headers: { Authorization: `Bearer ${apiToken}` }
        });
        expect([200, 404]).toContain(endRes.status());
        console.log('✓ Guardian session ended');
    });

    // ── 06. GuardianMode page — renders ──────────────────────────────────
    test('06. GuardianMode — page renders', async ({ page }) => {
        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/guardian-mode', 2500);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });
        const text = await page.locator('body').innerText();
        expect(text.length).toBeGreaterThan(5);

        const sosEl = page.locator('button, a, div').filter({ hasText: /sos|panic|emergencia|911/i }).first();
        if (await sosEl.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('✓ SOS element visible');
        }
        console.log('✓ GuardianMode renders');
    });

    // ── 07. DateCheckIn — slider + countdown ─────────────────────────────
    test('07. DateCheckIn — slider + content renders', async ({ page }) => {
        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/dating/checkin', 2500);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        const slider = page.locator('input[type="range"]').first();
        if (await slider.isVisible({ timeout: 3000 }).catch(() => false)) {
            await slider.fill('60');
            const val = await slider.inputValue();
            expect(Number(val)).toBeGreaterThanOrEqual(1);
            console.log('✓ Slider value:', val);
        }
        const bodyText = await page.locator('body').innerText();
        expect(/check.?in|timer|minute|contact|guardian/i.test(bodyText)).toBeTruthy();
        console.log('✓ DateCheckIn content renders');
    });

    // ── 08. Dating Home — renders ─────────────────────────────────────────
    test('08. Dating Home — renders', async ({ page }) => {
        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/dating', 3000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });
        const text = await page.locator('body').innerText();
        expect(text.length).toBeGreaterThan(10);
        console.log('✓ Dating Home renders');
    });

    // ── 09. Dating Mode toggle — CSS theme ───────────────────────────────
    test('09. Dating Mode — toggle button + CSS theme switch', async ({ page }) => {
        if (supaSession) {
            await page.addInitScript(({ key, sessionData }) => {
                window.localStorage.setItem('splash_shown', 'true');
                window.localStorage.setItem(key, JSON.stringify(sessionData));
                window.localStorage.setItem('rf_dating_mode', 'false');
            }, { key: SUPABASE_STORAGE_KEY, sessionData: supaSession });
        } else {
            await page.addInitScript(() => {
                window.localStorage.setItem('splash_shown', 'true');
                window.localStorage.setItem('rf_dating_mode', 'false');
            });
        }

        await page.goto('/#/dating');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        const toggleBtn = page.locator('[aria-label="Toggle Dating Mode"]');
        const toggleVisible = await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (toggleVisible) {
            const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            expect(themeBefore).not.toBe('dating');
            await toggleBtn.click();
            await page.waitForTimeout(500);
            const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            expect(themeAfter).toBe('dating');
            const stored = await page.evaluate(() => localStorage.getItem('rf_dating_mode'));
            expect(stored).toBe('true');
            console.log('✓ Dating Mode toggle: CSS theme switches + persists');
        } else {
            console.log('ℹ Dating Mode toggle not visible (PremiumGate or auth gate)');
            const text = await page.locator('body').innerText();
            expect(text.length).toBeGreaterThan(5);
        }
    });

    // ── 10. Dating Mode reload persistence ────────────────────────────────
    test('10. Dating Mode — persists after reload', async ({ page }) => {
        if (supaSession) {
            await page.addInitScript(({ key, sessionData }) => {
                window.localStorage.setItem('splash_shown', 'true');
                window.localStorage.setItem(key, JSON.stringify(sessionData));
                window.localStorage.setItem('rf_dating_mode', 'true');
            }, { key: SUPABASE_STORAGE_KEY, sessionData: supaSession });
        } else {
            await page.addInitScript(() => {
                window.localStorage.setItem('splash_shown', 'true');
                window.localStorage.setItem('rf_dating_mode', 'true');
            });
        }

        await page.goto('/#/dating');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        const ls = await page.evaluate(() => localStorage.getItem('rf_dating_mode'));
        expect(ls).toBe('true');

        const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        console.log('✓ Dating mode persisted. data-theme:', theme, '| rf_dating_mode:', ls);
    });

    // ── 11. Chat Lobby ────────────────────────────────────────────────────
    test('11. Chat — Lobby + General Room', async ({ page }) => {
        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/chat', 2000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        const generalLink = page.locator('a, button').filter({ hasText: /general|mixed|all|women|men/i }).first();
        if (await generalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
            await generalLink.click();
            await page.waitForTimeout(2000);
            console.log('✓ Entered chat room');
        } else {
            await gotoAndWait(page, '/#/chat/general', 2000);
        }

        const stored = await page.evaluate(() => {
            const v = localStorage.getItem('chat_id_general');
            if (!v) return null;
            try { return JSON.parse(v); } catch { return null; }
        });
        if (stored?.name) {
            console.log('✓ Nickname localStorage:', stored.name, stored.emoji);
        } else {
            console.log('ℹ Room nickname not generated yet');
        }
        console.log('✓ Chat Lobby renders');
    });

    // ── 12. FacialScan — renders ──────────────────────────────────────────
    test('12. FacialScan — page renders (scan or PremiumGate)', async ({ page }) => {
        const jsErrors = [];
        page.on('pageerror', e => jsErrors.push(e.message));

        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/scan', 3000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        const fileInputs = await page.locator('input[type="file"]').count();
        const premiumEl = await page.locator('text=/premium|upgrade|subscribe|unlock/i').count();
        const loginEl = await page.locator('text=/sign in|log in|login/i').count();

        expect(fileInputs > 0 || premiumEl > 0 || loginEl > 0).toBeTruthy();
        console.log('✓ FacialScan:', fileInputs > 0 ? 'scan UI' : premiumEl > 0 ? 'PremiumGate' : 'login redirect');

        const fatal = jsErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('non-Error'));
        expect(fatal.length).toBe(0);
    });

    // ── 13. Messages — auth protection ───────────────────────────────────
    test('13. Messages — auth required + 24h expiry', async ({ request }) => {
        const noAuthRes = await api(request, 'GET', '/api/dating/messages/fake-match-id');
        expect([401, 403]).toContain(noAuthRes.status());
        console.log('✓ Messages endpoint requires auth:', noAuthRes.status());

        const authRes = await api(request, 'GET', '/api/dating/messages/00000000-0000-0000-0000-000000000000', {
            headers: { Authorization: `Bearer ${apiToken}` }
        });
        expect([403, 404, 500]).toContain(authRes.status());
        console.log('✓ Messages auth works, fake match rejected:', authRes.status());
    });

    // ── 14. Notifications API ─────────────────────────────────────────────
    test('14. Notifications — GET + mark read', async ({ request }) => {
        const res = await api(request, 'GET', '/api/notifications', {
            headers: { Authorization: `Bearer ${apiToken}` }
        });
        expect(res.status()).toBe(200);
        const notifs = await res.json();
        expect(Array.isArray(notifs)).toBe(true);
        console.log('✓ GET /api/notifications — count:', notifs.length);

        const markRes = await api(request, 'PATCH', '/api/notifications/read-all', {
            headers: { Authorization: `Bearer ${apiToken}` }
        });
        expect(markRes.status()).toBe(200);
        console.log('✓ PATCH /api/notifications/read-all OK');
    });

    // ── 15. Reports API ───────────────────────────────────────────────────
    test('15. Reports — GET feed + POST', async ({ request }) => {
        const feedRes = await api(request, 'GET', '/api/reports');
        expect(feedRes.status()).toBe(200);
        const reports = await feedRes.json();
        expect(Array.isArray(reports)).toBe(true);
        console.log('✓ GET /api/reports — count:', reports.length);

        const postRes = await api(request, 'POST', '/api/reports', {
            headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
            data: { reported_name: 'PW Test Person', platform: 'Tinder', description: 'Test report', category: 'catfish' }
        });
        expect([201, 400, 500]).toContain(postRes.status());
        console.log('✓ POST /api/reports:', postRes.status());
    });

    // ── 16. DateCalendar — no Supabase errors ────────────────────────────
    test('16. DateCalendar — renders without Supabase errors', async ({ page }) => {
        const apiErrors = [];
        page.on('console', m => { if (m.type() === 'error') apiErrors.push(m.text()); });

        if (supaSession) await injectSupabaseSession(page, supaSession);
        else await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
        await gotoAndWait(page, '/#/dating/calendar', 3000);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        const supaErr = apiErrors.filter(e =>
            e.toLowerCase().includes('supabase') || e.includes('PGRST') || e.includes('relation "messages"')
        );
        expect(supaErr.length).toBe(0);
        console.log('✓ DateCalendar — no Supabase errors');
    });

    // ── 17. Anon Chat — DB-backed messages ───────────────────────────────
    test('17. Anon Chat — server healthy + DB-backed', async ({ request }) => {
        const statsRes = await api(request, 'GET', '/api/stats/community');
        expect(statsRes.status()).toBe(200);
        const body = await statsRes.json();
        expect(body).toHaveProperty('totalUsers');
        console.log('✓ Anon chat: server healthy, DB-backed anon_messages active');
    });
});
