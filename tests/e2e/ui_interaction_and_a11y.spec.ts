import { test, expect } from '@playwright/test';

test.describe('UI Integrity, Mobile Menu Keyboard A11y & Legal Notices', () => {
  test('Dynamic Copyright Year matches current calendar year', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.locator('h1')).toBeVisible();
    const currentYear = new Date().getFullYear().toString();
    const footerText = await page.locator('footer').textContent();
    expect(footerText).toContain(currentYear);
  });

  test('Clickable brand logo always navigates to home page', async ({ page }) => {
    await page.goto('http://localhost:5173/about');
    await expect(page.locator('h1')).toContainText('About GreenPay');

    // Click logo in header
    const logoButton = page.locator('button[aria-label="GreenPay Bengaluru Home"]');
    await logoButton.click();

    // Verify redirected to home
    await page.waitForURL('http://localhost:5173/', { timeout: 5000 });
    await expect(page.locator('text=MUNICIPAL ACCOUNTABILITY SYSTEM').first()).toBeVisible();
  });

  test('Verified tel: and mailto: links format and targets', async ({ page }) => {
    await page.goto('http://localhost:5173/contact');
    await expect(page.locator('h1')).toContainText('Contact GreenPay');

    // Check mailto links
    const mailtoLinks = page.locator('a[href^="mailto:"]');
    const mailtoCount = await mailtoLinks.count();
    expect(mailtoCount).toBeGreaterThan(0);

    for (let i = 0; i < mailtoCount; i++) {
      const href = await mailtoLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
    }

    // Check tel links if present
    const telLinks = page.locator('a[href^="tel:"]');
    const telCount = await telLinks.count();
    expect(telCount).toBeGreaterThan(0);
    for (let i = 0; i < telCount; i++) {
      const href = await telLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^tel:\+?[0-9\s-]+$/);
    }
  });

  test('Mobile Menu Keyboard Navigation & Escape Trap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/');
    await expect(page.locator('h1')).toBeVisible();

    // Hamburger button
    const hamburger = page.locator('button[aria-label="Open navigation menu"]');
    await expect(hamburger).toBeVisible();

    // Click hamburger to open
    await hamburger.click();
    await expect(page.locator('button[aria-label="Close navigation menu"]')).toBeVisible();
    
    // Check that mobile menu items are visible inside the mobile drawer
    const mobileLink = page.locator('.md\\:hidden nav button:has-text("How It Works")');
    await expect(mobileLink).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');

    // Verify menu closes and button reverts to Open navigation menu
    await expect(page.locator('button[aria-label="Open navigation menu"]')).toBeVisible();
    await expect(mobileLink).not.toBeVisible();
  });

  test('Unique Meta Titles and Descriptions per Page (Amendment #5)', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    expect(await page.title()).toContain('Transparent Household Waste Tracking');

    await page.goto('http://localhost:5173/green-score');
    await expect(page.locator('h1')).toContainText('The Explainable Green Score');
    expect(await page.title()).toContain('Green Score Simulator');

    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toContain('Green Score');
  });

  test('Municipal Non-Affiliation Declaration prominently present', async ({ page }) => {
    await page.goto('http://localhost:5173/about');
    await expect(page.locator('h1')).toContainText('About GreenPay');
    await expect(page.locator('text=Independent Prototype Declaration')).toBeVisible();
    await expect(page.locator('text=GreenPay is NOT affiliated with').first()).toBeVisible();
    await expect(page.locator('text=Bruhat Bengaluru Mahanagara Palike (BBMP)').first()).toBeVisible();
  });
});
