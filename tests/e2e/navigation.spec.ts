import { test, expect } from '@playwright/test';

test.describe('header navigation', () => {
  test('desktop: Products dropdown opens and lists all products', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const products = page.getByRole('button', { name: 'Products' });
    await expect(products).toHaveAttribute('aria-expanded', 'false');
    await products.click();
    await expect(products).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['CliqPOS', 'ERP System', 'Hospital Management System', 'School Management System', 'Hotel Management System']) {
      await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(products).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop: keyboard can reach and activate a product link', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Products' }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/products(\/|$)/);
  });

  test('mobile: menu offers Products and AI Solutions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const mobile = page.getByRole('navigation', { name: 'Mobile' });
    await mobile.getByRole('button', { name: 'Products' }).click();
    await expect(mobile.getByRole('link', { name: /CliqPOS/ })).toBeVisible();
    await expect(mobile.getByRole('link', { name: /AI Solutions/ })).toHaveAttribute('href', '/ai-employee');
    await page.keyboard.press('Escape');
    await expect(mobile).toBeHidden();
  });

  test('mobile: the chat launcher is hidden while the menu is open and returns after', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');
    const launcher = page.getByRole('button', { name: /^Chat with/ });
    await expect(launcher).toBeVisible();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(launcher).toBeHidden();
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(launcher).toBeVisible();
  });

  test('skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });
});
