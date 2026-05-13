import { test, expect } from '@playwright/test';

test('homepage loads and displays hero section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Software Solutions Built to Power Modern African Businesses');
  // Check that at least one 'Book a Free Consultation' link is visible
  const ctaLinks = page.locator('a', { hasText: 'Book a Free Consultation' });
  await expect(ctaLinks.first()).toBeVisible();
});
