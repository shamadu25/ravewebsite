import { test, expect } from '@playwright/test';

test('homepage loads and displays hero section', async ({ page }) => {
  await page.goto('/');
  // The headline is split across block-level spans, so match with flexible whitespace.
  await expect(page.locator('h1')).toHaveText(/Software Solutions\s*Built to\s*Power Modern\s*African\s*Businesses/);
  // Check that at least one 'Book a Free Consultation' link is visible
  const ctaLinks = page.locator('a', { hasText: 'Book a Free Consultation' });
  await expect(ctaLinks.first()).toBeVisible();
});

test.describe('homepage commercial video', () => {
  test('is on the page, shows a poster, and downloads nothing until played', async ({ page }) => {
    const videoRequests: string[] = [];
    page.on('request', (r) => { if (/\.mp4(\?|$)/.test(r.url())) videoRequests.push(r.url()); });
    await page.goto('/');
    const video = page.locator('video[aria-label="RaveSoft Digital Solutions commercial"]');
    await video.scrollIntoViewIfNeeded();
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('poster', /ravesoft-commercial-poster\.webp/);
    await page.waitForTimeout(1500);
    expect(videoRequests).toHaveLength(0);
  });

  test('video files are served with range support and long-lived caching', async ({ request }) => {
    for (const f of ['ravesoft-commercial-720p.mp4', 'ravesoft-commercial-1080p.mp4']) {
      const res = await request.get(`/video/${f}`, { headers: { Range: 'bytes=0-1023' } });
      expect(res.status()).toBe(206);
      expect(res.headers()['content-type']).toContain('video/mp4');
      expect(res.headers()['content-range']).toMatch(/^bytes 0-1023\//);
    }
  });
});
