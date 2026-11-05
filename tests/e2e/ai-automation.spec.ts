import { test, expect, type Page } from '@playwright/test';

const INDUSTRIES = ['real-estate', 'healthcare', 'hospitality', 'retail', 'logistics', 'financial-services', 'professional-services', 'education'];
const VIEWPORTS = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 740]] as const;

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

test.describe('AI automation landing pages', () => {
  test('general page: hero copy, CTAs, six-step starter and sections', async ({ page }) => {
    await page.goto('/ai-automation');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your Business Has Problems. AI Can Solve More of Them Than You Think.');
    await expect(page.getByRole('link', { name: 'Get My Free AI Business Assessment' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore AI Automation Solutions' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Six-step assessment' }).getByRole('listitem')).toHaveCount(6);
    for (const id of ['industries', 'what-we-automate', 'solutions', 'how-it-works', 'benefits', 'use-cases', 'assessment', 'faq']) await expect(page.locator(`#${id}`)).toBeAttached();
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThanOrEqual(3);
  });

  for (const slug of INDUSTRIES) {
    test(`industry page ${slug}: unique h1, canonical, preselected industry`, async ({ page }) => {
      const res = await page.goto(`/ai-automation/${slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://ravesoftsolutions.com/ai-automation/${slug}`);
      await expect(page.locator('#hs-industry')).toHaveValue(slug);
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('unknown and reserved industry slugs return 404; assessment-only industries have no page', async ({ page }) => {
    for (const slug of ['not-an-industry', 'proposal', 'manufacturing', 'other']) expect((await page.goto(`/ai-automation/${slug}`))?.status()).toBe(404);
  });

  for (const [w, h] of VIEWPORTS) {
    test(`responsive @ ${w}px: no horizontal scroll on general and industry pages`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      for (const path of ['/ai-automation', '/ai-automation/real-estate', '/ai-automation/healthcare']) {
        await page.goto(path);
        expect(await noHorizontalOverflow(page)).toBe(true);
      }
    });
  }
});

test.describe('assessment engine', () => {
  async function fillStage1(page: Page) {
    await page.fill('#q-businessName', 'Acme Properties');
    await page.fill('#q-country', 'Ghana'); await page.fill('#q-city', 'Accra');
    await page.selectOption('#q-employees', { index: 2 }); await page.selectOption('#q-branches', { index: 1 }); await page.selectOption('#q-businessAge', { index: 2 });
    await page.fill('#q-description', 'We sell and rent homes in Accra.');
  }

  test('validates each step with clear errors and conditional questions', async ({ page }) => {
    await page.goto('/ai-automation/real-estate#assessment');
    const next = page.getByRole('button', { name: /^Next/ });
    await next.click();
    await expect(page.getByRole('alert').filter({ hasText: 'required' }).first()).toBeVisible();
    await fillStage1(page);
    await next.click();
    await expect(page.getByRole('heading', { name: 'Operations', level: 4 })).toBeVisible();
    await expect(page.getByText('How many properties do you manage or market?')).toBeVisible(); // industry-specific
    await expect(page.getByText('Which patients')).toHaveCount(0);
    await page.selectOption('#q-re_bottleneck', 'other');
    await expect(page.getByLabel('Tell us more about the bottleneck')).toBeVisible(); // conditional
    await page.selectOption('#q-re_bottleneck', 'scheduling_viewings');
    await expect(page.getByLabel('Tell us more about the bottleneck')).toHaveCount(0);
  });

  test('autosaves progress and resumes after reload (without contact details)', async ({ page }) => {
    await page.goto('/ai-automation/retail#assessment');
    await page.fill('#q-businessName', 'Resume Ltd');
    await page.waitForTimeout(700);
    await page.reload();
    await expect(page.locator('#q-businessName')).toHaveValue('Resume Ltd');
    expect(await page.evaluate(() => localStorage.getItem('ra-ai-draft-v1') ?? '')).not.toMatch(/@/);
  });

  test('complete journey with the API stubbed: submits once and shows the confirmation', async ({ page }) => {
    let posts = 0;
    await page.route('**/api/forms/token', (r) => r.fulfill({ json: { token: 'x' } }));
    await page.route('**/api/ai-automation/assessments', async (r) => { posts++; await r.fulfill({ status: 201, json: { ok: true, reference: 'AIA-TEST123456', duplicate: false } }); });
    await page.goto('/ai-automation/real-estate#assessment');
    await fillStage1(page); await page.getByRole('button', { name: /^Next/ }).click();
    await page.selectOption('#q-re_portfolio', { index: 1 }); await page.selectOption('#q-re_enquiries', { index: 1 });
    await page.getByLabel('WhatsApp', { exact: true }).first().check();
    await page.selectOption('#q-re_reps', { index: 1 }); await page.selectOption('#q-re_enquiry_handling', { index: 1 }); await page.selectOption('#q-re_bottleneck', { index: 1 });
    await page.getByLabel('Sales', { exact: true }).check(); await page.fill('#q-productsServices', 'Apartments');
    await page.locator('[data-q="commChannels"]').getByLabel('WhatsApp').check();
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.getByLabel('Lost sales').check(); await page.getByRole('button', { name: /^Next/ }).click();
    await page.getByLabel('AI WhatsApp').check(); await page.getByRole('button', { name: /^Next/ }).click();
    await page.fill('#q-outcomes', 'More viewings'); await page.getByLabel('More sales').check();
    await page.selectOption('#q-urgency', { index: 1 }); await page.selectOption('#q-timeline', { index: 1 });
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.fill('#q-fullName', 'Ama Mensah'); await page.fill('#q-position', 'Director'); await page.fill('#q-email', 'ama@acme.com'); await page.fill('#q-phone', '+233 24 000 0000'); await page.selectOption('#q-preferredChannel', { index: 1 });
    await page.getByRole('button', { name: /Get my assessment/ }).click();
    await expect(page.getByText('This is required to continue.')).toBeVisible(); // consent is mandatory
    await page.getByLabel(/I agree that RaveSoft may use these details/).check();
    await page.getByRole('button', { name: /Get my assessment/ }).click();
    await expect(page.getByText('your assessment has been received')).toBeVisible();
    await expect(page.getByText('AIA-TEST123456')).toBeVisible();
    expect(posts).toBe(1);
  });
});

test.describe('existing website regression', () => {
  for (const path of ['/', '/contact', '/services', '/ai-employee', '/get-started', '/products/cliqpos', '/industries', '/about']) {
    test(`${path} still renders`, async ({ page }) => { expect((await page.goto(path))?.status()).toBe(200); });
  }
  test('sitemap lists the new pages and the old ones', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    for (const slug of INDUSTRIES) expect(xml).toContain(`/ai-automation/${slug}`);
    for (const old of ['/ai-employee', '/services/business-automation', '/get-started', '/industries/retail']) expect(xml).toContain(old);
  });
});
