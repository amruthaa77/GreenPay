import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'iPhone SE (320px)', width: 320, height: 568 },
  { name: 'Galaxy S8 (360px)', width: 360, height: 640 },
  { name: 'iPhone 14 (390px)', width: 390, height: 844 },
  { name: 'iPad Portrait (768px)', width: 768, height: 1024 },
  { name: 'iPad Landscape (1024px)', width: 1024, height: 768 },
  { name: 'Desktop Large (1440px)', width: 1440, height: 900 },
];

const PAGES_TO_TEST = [
  '/',
  '/how-it-works',
  '/green-score',
  '/wards',
  '/about',
  '/contact',
  '/faq',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/cookie-policy',
  '/accessibility',
];

test.describe('Responsive Design & Horizontal Overflow Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`Verify Zero Horizontal Overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of PAGES_TO_TEST) {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('domcontentloaded');

        // Measure document scroll width vs client viewport width
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          return {
            scrollWidth: docWidth,
            innerWidth: winWidth,
            hasOverflow: docWidth > winWidth + 1, // allow 1px sub-pixel rounding
          };
        });

        expect(
          overflow.hasOverflow,
          `Horizontal overflow detected on route '${route}' at viewport ${vp.name}: scrollWidth=${overflow.scrollWidth}px, innerWidth=${overflow.innerWidth}px`
        ).toBeFalsy();
      }
    });
  }
});
