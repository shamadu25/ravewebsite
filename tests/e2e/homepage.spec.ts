import { test, expect } from '@playwright/test';

test('homepage loads and displays hero section', async ({ page }) => {
  await page.goto('/');
  // The headline is split across block-level spans, so match with flexible whitespace.
  await expect(page.locator('h1')).toHaveText(/Software Solutions\s*Built to\s*Power Modern\s*African\s*Businesses/);
  // Check that at least one 'Book a Free Consultation' link is visible
  const ctaLinks = page.locator('a', { hasText: 'Book a Free Consultation' });
  await expect(ctaLinks.first()).toBeVisible();
});
