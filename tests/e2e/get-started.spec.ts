import { test, expect, type Page } from '@playwright/test';

const SECTION_HEADLINES = [
  'TECHNOLOGY THAT MOVES YOUR BUSINESS FORWARD.',
  'TELL US ABOUT YOUR BUSINESS',
  'WHAT CAN WE HELP YOU SOLVE?',
  'YOUR BUSINESS DESERVES BETTER SYSTEMS.',
  'RAVESOFT SOLUTIONS',
  'GET STARTED IN FOUR SIMPLE STEPS.',
  'WHY RAVESOFT',
  "LET'S FIND THE RIGHT TECHNOLOGY SOLUTION FOR YOUR BUSINESS.",
];

const QUERY_TO_OPTION: [string, string][] = [
  ['cliqpos', 'pos'], ['erp', 'erp'], ['hospital-management', 'hospital-management'], ['hotel-management', 'hotel-management'],
  ['school-management', 'school-management'], ['restaurant-management', 'restaurant-management'], ['legal-practice', 'legal-practice'],
  ['custom-software', 'custom-software'], ['ai-automation', 'ai-agents'],
];

async function trackedEvents(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __ev: string[] }).__ev = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) => { if (a[0] === 'event') (window as unknown as { __ev: string[] }).__ev.push(String(a[1])); };
  });
  return () => page.evaluate(() => (window as unknown as { __ev: string[] }).__ev);
}

async function fillValid(page: Page) {
  await page.fill('#lead-fullName', 'Ama Mensah');
  await page.fill('#lead-businessName', 'Ama Ltd');
  await page.fill('#lead-phone', '+233 24 123 4567');
  await page.fill('#lead-email', 'ama@company.com');
  await page.selectOption('#lead-businessType', 'retail');
  await page.selectOption('#lead-solution', 'pos');
}

test.describe('/get-started page', () => {
  test('renders every section, the 5 solution cards and the 4 categories', async ({ page }) => {
    await page.goto('/get-started');
    for (const h of SECTION_HEADLINES) await expect(page.getByRole('heading', { name: h })).toBeVisible();
    await expect(page.getByText('SOFTWARE. INTELLIGENCE. AUTOMATION.')).toBeVisible();
    await expect(page.getByRole('link', { name: /GET A FREE BUSINESS CONSULTATION/ })).toBeVisible();
    await expect(page.locator('#selector-title ~ ul > li')).toHaveCount(5);
    for (const c of ['BUSINESS OPERATIONS', 'INDUSTRY SOFTWARE', 'DIGITAL DEVELOPMENT', 'AI AND AUTOMATION']) await expect(page.getByRole('heading', { name: c })).toBeVisible();
    await expect(page.locator('#how-title ~ ol > li')).toHaveCount(4);
    await expect(page.locator('#lead-solution option')).toHaveCount(14);
  });

  test('uses a focused header: no navigation menus to wander off to', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page.getByRole('button', { name: 'Products' })).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Free consultation/ }).first()).toBeVisible();
  });

  test('has correct SEO metadata', async ({ page }) => {
    await page.goto('/get-started?solution=erp&utm_source=facebook&fbclid=abc');
    await expect(page).toHaveTitle(/Free Business Consultation/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://ravesoftsolutions.com/get-started');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /free, no-obligation consultation/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/api\/og/);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).not.toMatch(/noindex/);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(1); // organisation + FAQ
  });

  for (const [q, option] of QUERY_TO_OPTION) {
    test(`?solution=${q} preselects ${option} and keeps every other option`, async ({ page }) => {
      await page.goto(`/get-started?solution=${q}`);
      await expect(page.locator('#lead-solution')).toHaveValue(option);
      await expect(page.getByTestId('selected-interest')).toBeVisible();
      await expect(page.locator('#lead-solution option')).toHaveCount(14);
    });
  }

  test('unknown / hostile ?solution values are ignored safely', async ({ page }) => {
    for (const v of ['nonsense', '<script>alert(1)</script>', '__proto__']) {
      await page.goto(`/get-started?solution=${encodeURIComponent(v)}`);
      await expect(page.locator('#lead-solution')).toHaveValue('');
      await expect(page.getByTestId('selected-interest')).toHaveCount(0);
    }
  });

  test('every solution card CTA preselects its solution and brings the form into view', async ({ page }) => {
    await page.goto('/get-started');
    const cards = page.locator('#selector-title ~ ul > li');
    const expected = ['pos', 'hospital-management', 'custom-software', 'website-development', 'ai-agents'];
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.getElementById('selector-title')!.getBoundingClientRect().top + window.scrollY - 40));
      await cards.nth(i).getByRole('link', { name: /Select/ }).click();
      await expect(page.locator('#lead-solution')).toHaveValue(expected[i]);
      await expect(page.locator('#lead-form')).toBeInViewport({ ratio: 0.2 });
    }
  });

  test('offering links and the final CTA scroll to the one form', async ({ page }) => {
    await page.goto('/get-started');
    await page.locator('#offerings-title ~ div').getByRole('link', { name: 'Legal Practice Management' }).click();
    await expect(page.locator('#lead-solution')).toHaveValue('legal-practice');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole('link', { name: /GET STARTED WITH RAVESOFT/ }).click();
    await expect(page.locator('#lead-form')).toBeInViewport({ ratio: 0.2 });
    await expect(page.locator('form')).toHaveCount(1); // one form, one lead system
  });

  test('FAQ has the 7 required questions', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page.locator('#faq-title ~ div button')).toHaveCount(7);
    await expect(page.getByText('Do you serve businesses outside Ghana?')).toBeVisible();
  });

  for (const [w, h] of [[360, 800], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    test(`no horizontal overflow at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/get-started');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
    });
  }
});

test.describe('lead form (API intercepted)', () => {
  test('validation: empty submit shows errors, sends nothing, tracks no conversion', async ({ page }) => {
    const events = await trackedEvents(page);
    let posted = 0;
    await page.route('**/api/contact', (r) => { posted++; r.fulfill({ status: 200, json: { success: true } }); });
    await page.goto('/get-started');
    await page.getByRole('button', { name: 'GET MY FREE CONSULTATION' }).click();
    await expect(page.getByText('Please enter your full name.')).toBeVisible();
    await expect(page.locator('#lead-fullName')).toBeFocused();
    expect(posted).toBe(0);
    expect(await events()).not.toContain('generate_lead');
  });

  test('success fires generate_lead exactly once, only after the API confirms', async ({ page }) => {
    const events = await trackedEvents(page);
    let posted = 0;
    await page.route('**/api/contact', async (r) => { posted++; await new Promise((x) => setTimeout(x, 400)); r.fulfill({ status: 200, json: { success: true, eventId: 'e2e-1' } }); });
    await page.goto('/get-started');
    await fillValid(page);
    const btn = page.getByRole('button', { name: 'GET MY FREE CONSULTATION' });
    await btn.dblclick();
    expect(await events()).not.toContain('generate_lead'); // not before the server answers
    await expect(page.getByText('YOUR ENQUIRY HAS BEEN RECEIVED.')).toBeVisible();
    expect(posted).toBe(1);
    expect((await events()).filter((e) => e === 'generate_lead')).toHaveLength(1);
  });

  for (const status of [500, 422, 429]) {
    test(`API ${status}: no success state, no generate_lead, data retained`, async ({ page }) => {
      const events = await trackedEvents(page);
      await page.route('**/api/contact', (r) => r.fulfill({ status, json: { error: 'Failed' } }));
      await page.goto('/get-started');
      await fillValid(page);
      await page.getByRole('button', { name: 'GET MY FREE CONSULTATION' }).click();
      await expect(page.locator('#lead-form [role="alert"]')).toBeVisible();
      await expect(page.getByText('YOUR ENQUIRY HAS BEEN RECEIVED.')).toHaveCount(0);
      expect(await events()).not.toContain('generate_lead');
      await expect(page.locator('#lead-email')).toHaveValue('ama@company.com');
    });
  }

  test('network failure: no success, no conversion, data retained', async ({ page }) => {
    const events = await trackedEvents(page);
    await page.route('**/api/contact', (r) => r.abort('failed'));
    await page.goto('/get-started');
    await fillValid(page);
    await page.getByRole('button', { name: 'GET MY FREE CONSULTATION' }).click();
    await expect(page.locator('#lead-form [role="alert"]')).toBeVisible();
    expect(await events()).not.toContain('generate_lead');
    await expect(page.locator('#lead-fullName')).toHaveValue('Ama Mensah');
  });
});
