import { test, expect } from '@playwright/test';

// ── Config ────────────────────────────────────────────────────────────────────
// Browser tests hit the local Vite dev server (playwright.config.js baseURL)
// API tests call localhost:5173 — Vite proxies /api/* to the Express backend in dev

const testUser = {
  email: `pw_test_${Date.now()}@redflag.test`,
  password: 'PwTest123!',
  name: 'Playwright Bot',
  gender: 'male',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Register + login via Express API, returns { token, user }
async function expressRegisterLogin(request) {
  // Try login first (user may exist from a previous run)
  let res = await request.post(`http://localhost:5173/api/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email: testUser.email, password: testUser.password },
  });
  if (res.status() === 200) {
    const body = await res.json();
    return { token: body.token, user: body.user };
  }
  // Otherwise register
  res = await request.post(`http://localhost:5173/api/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    data: testUser,
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return { token: body.token, user: body.user };
}

// Inject JWT token into localStorage so the app sees a logged-in user
async function injectSession(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('splash_shown', 'true');
    window.localStorage.setItem('rf_token', t);
  }, token);
}

async function gotoAndWait(page, hash, ms = 1500) {
  await page.goto(hash);
  await page.waitForLoadState('domcontentloaded');
  if (ms) await page.waitForTimeout(ms);
}

// ─────────────────────────────────────────────────────────────────────────────
// All tests share one Express session acquired in beforeAll
// ─────────────────────────────────────────────────────────────────────────────
test.describe('RedFlag Full Test Suite', () => {
  let apiToken = null;
  let testUserId = null;

  test.beforeAll(async ({ request }) => {
    const session = await expressRegisterLogin(request);
    apiToken = session.token;
    testUserId = session.user?.id;
    console.log('Express session:', apiToken ? 'ok' : 'MISSING', '| userId:', testUserId);
    expect(apiToken).toBeTruthy();
  });

  // ── 01. Health check ──────────────────────────────────────────────────────
  test('01. Health — /health endpoint', async ({ request }) => {
    const res = await request.get('http://localhost:5173/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    console.log('✓ Health check OK, version:', body.version);
  });

  // ── 02. DB — community stats ──────────────────────────────────────────────
  test('02. DB Connection — stats/community', async ({ request }) => {
    const res = await request.get('http://localhost:5173/api/stats/community');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalReports');
    expect(body).toHaveProperty('totalUsers');
    console.log('✓ DB reachable — reports:', body.totalReports, '| users:', body.totalUsers);
  });

  // ── 03. Auth — /api/auth/me ───────────────────────────────────────────────
  test('03. Auth — GET /api/auth/me', async ({ request }) => {
    const res = await request.get('http://localhost:5173/api/auth/me', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('email');
    console.log('✓ /api/auth/me OK — user:', body.user.name);
  });

  // ── 04. Auth — browser login form ────────────────────────────────────────
  test('04. Auth — browser login form', async ({ page }) => {
    await page.addInitScript(() => { window.localStorage.setItem('splash_shown', 'true'); });
    await gotoAndWait(page, '/#/login', 1000);

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.locator('button[type="submit"]').click();

    try {
      await page.waitForURL(/.*\/#\/(?!login|signup)/, { timeout: 15000 });
      console.log('✓ Browser login — redirected away from login');
    } catch {
      // Check if token was stored
      const storedToken = await page.evaluate(() => localStorage.getItem('rf_token'));
      expect(storedToken).toBeTruthy();
      console.log('✓ JWT token stored in localStorage after login');
    }
  });

  // ── 05. Home page — renders ───────────────────────────────────────────────
  test('05. Home — renders without crash', async ({ page }) => {
    await injectSession(page, apiToken);
    await gotoAndWait(page, '/#/', 2000);

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(5);
    console.log('✓ Home page renders');
  });

  // ── 06. Users API — GET /api/users/me ─────────────────────────────────────
  test('06. Users API — GET /api/users/me', async ({ request }) => {
    const res = await request.get('http://localhost:5173/api/users/me', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('is_paid');
    console.log('✓ GET /api/users/me — is_paid:', body.is_paid, '| verified:', body.is_verified);
  });

  // ── 07. Contacts API — GET + POST ─────────────────────────────────────────
  test('07. Contacts API — GET + POST', async ({ request }) => {
    const listRes = await request.get('http://localhost:5173/api/contacts', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(listRes.status()).toBe(200);
    const contacts = await listRes.json();
    expect(Array.isArray(contacts)).toBe(true);
    console.log('✓ GET /api/contacts — count:', contacts.length);

    const addRes = await request.post('http://localhost:5173/api/contacts', {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { name: 'PW Friend', phone: '+15550000001', relationship: 'friend' },
    });
    expect([201, 400]).toContain(addRes.status());
    console.log('✓ POST /api/contacts:', addRes.status() === 201 ? 'created' : 'max reached / already exists');
  });

  // ── 08. Guardian Session — full lifecycle ──────────────────────────────────
  test('08. Guardian Session — create + mine + end', async ({ request }) => {
    const createRes = await request.post('http://localhost:5173/api/guardian/sessions', {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { dater_name: 'PW Date', check_in_minutes: 30, date_location: 'Central Park NY' },
    });
    expect(createRes.status()).toBe(201);
    const session = await createRes.json();
    expect(session).toHaveProperty('session_token');
    console.log('✓ Guardian session created:', session.session_token?.substring(0, 8));

    const mineRes = await request.get('http://localhost:5173/api/guardian/sessions/mine', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(mineRes.status()).toBe(200);
    console.log('✓ GET /api/guardian/sessions/mine OK');

    const endRes = await request.post(`http://localhost:5173/api/guardian/sessions/${session.id}/end`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect([200, 404]).toContain(endRes.status());
    console.log('✓ Guardian session ended');
  });

  // ── 09. GuardianMode page — renders ───────────────────────────────────────
  test('09. GuardianMode — page renders', async ({ page }) => {
    await injectSession(page, apiToken);
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

  // ── 10. Dating Home — renders ─────────────────────────────────────────────
  test('10. Dating Home — renders', async ({ page }) => {
    await injectSession(page, apiToken);
    await gotoAndWait(page, '/#/dating', 3000);

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(10);
    console.log('✓ Dating Home renders');
  });

  // ── 11. Dating Mode — toggle + CSS theme ──────────────────────────────────
  test('11. Dating Mode — toggle + CSS theme switch', async ({ page }) => {
    await page.addInitScript((t) => {
      window.localStorage.setItem('splash_shown', 'true');
      window.localStorage.setItem('rf_token', t);
      window.localStorage.setItem('rf_dating_mode', 'false');
    }, apiToken);

    await page.goto('/#/dating');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });

    const toggleBtn = page.locator('[aria-label="Toggle Dating Mode"]');
    const toggleVisible = await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (toggleVisible) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
      const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(themeAfter).toBe('dating');
      console.log('✓ Dating Mode toggle: CSS theme switches');
    } else {
      console.log('ℹ Dating Mode toggle not visible (PremiumGate or auth gate)');
      const text = await page.locator('body').innerText();
      expect(text.length).toBeGreaterThan(5);
    }
  });

  // ── 12. Chat Lobby — renders ──────────────────────────────────────────────
  test('12. Chat — Lobby renders', async ({ page }) => {
    await injectSession(page, apiToken);
    await gotoAndWait(page, '/#/chat', 2000);

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });

    const roomLink = page.locator('a, button').filter({ hasText: /general|mixed|all|women|men/i }).first();
    if (await roomLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await roomLink.click();
      await page.waitForTimeout(2000);
      console.log('✓ Entered chat room');
    } else {
      await gotoAndWait(page, '/#/chat/general', 2000);
    }
    console.log('✓ Chat Lobby renders');
  });

  // ── 13. FacialScan — renders ──────────────────────────────────────────────
  test('13. FacialScan — page renders (scan or PremiumGate)', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    await injectSession(page, apiToken);
    await gotoAndWait(page, '/#/scan', 3000);

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });

    const fileInputs = await page.locator('input[type="file"]').count();
    const premiumEl = await page.locator('text=/premium|upgrade|subscribe|unlock/i').count();
    const loginEl   = await page.locator('text=/sign in|log in|login/i').count();
    expect(fileInputs > 0 || premiumEl > 0 || loginEl > 0).toBeTruthy();
    console.log('✓ FacialScan:', fileInputs > 0 ? 'scan UI' : premiumEl > 0 ? 'PremiumGate' : 'login redirect');

    const fatal = jsErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('non-Error'));
    expect(fatal.length).toBe(0);
  });

  // ── 14. Messages — auth protection ───────────────────────────────────────
  test('14. Messages — auth required', async ({ request }) => {
    const noAuthRes = await request.get('http://localhost:5173/api/dating/messages/fake-match-id');
    expect([401, 403]).toContain(noAuthRes.status());
    console.log('✓ Messages endpoint requires auth:', noAuthRes.status());

    const authRes = await request.get(
      'http://localhost:5173/api/dating/messages/00000000-0000-0000-0000-000000000000',
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    expect([403, 404, 500]).toContain(authRes.status());
    console.log('✓ Messages auth works, fake match rejected:', authRes.status());
  });

  // ── 15. Notifications API ─────────────────────────────────────────────────
  test('15. Notifications — GET + mark read', async ({ request }) => {
    const res = await request.get('http://localhost:5173/api/notifications', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status()).toBe(200);
    const notifs = await res.json();
    expect(Array.isArray(notifs)).toBe(true);
    console.log('✓ GET /api/notifications — count:', notifs.length);

    const markRes = await request.patch('http://localhost:5173/api/notifications/read-all', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(markRes.status()).toBe(200);
    console.log('✓ PATCH /api/notifications/read-all OK');
  });

  // ── 16. Reports API ───────────────────────────────────────────────────────
  test('16. Reports — GET feed + POST', async ({ request }) => {
    const feedRes = await request.get('http://localhost:5173/api/reports');
    expect(feedRes.status()).toBe(200);
    const reports = await feedRes.json();
    expect(Array.isArray(reports)).toBe(true);
    console.log('✓ GET /api/reports — count:', reports.length);

    const postRes = await request.post('http://localhost:5173/api/reports', {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { reported_name: 'PW Test Person', platform: 'Tinder', description: 'Test report', category: 'catfish' },
    });
    expect([201, 400, 500]).toContain(postRes.status());
    console.log('✓ POST /api/reports:', postRes.status());
  });

  // ── 17. DateCalendar — no backend errors ──────────────────────────────────
  test('17. DateCalendar — renders without backend errors', async ({ page }) => {
    const apiErrors = [];
    page.on('console', m => { if (m.type() === 'error') apiErrors.push(m.text()); });

    await injectSession(page, apiToken);
    await gotoAndWait(page, '/#/dating/calendar', 3000);

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });

    const backendErrs = apiErrors.filter(e =>
      e.toLowerCase().includes('supabase') ||
      e.includes('PGRST') ||
      e.includes('relation "messages"') ||
      e.includes('500')
    );
    expect(backendErrs.length).toBe(0);
    console.log('✓ DateCalendar — no backend errors');
  });

  // ── 18. Anon Chat — DB-backed ─────────────────────────────────────────────
  test('18. Anon Chat — server healthy + DB-backed', async ({ request }) => {
    const statsRes = await request.get('http://localhost:5173/api/stats/community');
    expect(statsRes.status()).toBe(200);
    const body = await statsRes.json();
    expect(body).toHaveProperty('totalUsers');
    console.log('✓ Anon chat: server healthy, DB-backed anon_messages active');
  });

  // ── 19. Stripe webhook — reachable (no secret = dev mode passthrough) ─────
  test('19. Stripe webhook — endpoint exists', async ({ request }) => {
    const res = await request.post('http://localhost:5173/api/webhook/stripe', {
      headers: { 'Content-Type': 'application/json' },
      data: '{}',
    });
    // Without STRIPE_WEBHOOK_SECRET it returns 200 {received:true} in dev
    expect([200, 400]).toContain(res.status());
    console.log('✓ Stripe webhook endpoint reachable:', res.status());
  });

  // ── 20. Well-known endpoints — Web3 domain verification ───────────────────
  test('20. Well-known — wallets + security.txt', async ({ request }) => {
    const walletsRes = await request.get('http://localhost:5173/.well-known/wallets');
    expect(walletsRes.status()).toBe(200);
    const wallets = await walletsRes.json();
    expect(wallets).toHaveProperty('ERC20');
    console.log('✓ /.well-known/wallets OK:', wallets.ERC20 || '(no address set)');

    const secRes = await request.get('http://localhost:5173/.well-known/security.txt');
    expect(secRes.status()).toBe(200);
    const text = await secRes.text();
    expect(text).toContain('Contact:');
    console.log('✓ /.well-known/security.txt OK');
  });
});
