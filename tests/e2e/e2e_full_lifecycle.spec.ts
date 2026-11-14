import { test, expect } from '@playwright/test';

test.describe('GreenPay Full End-to-End Civic Lifecycle', () => {
  const uniqueId = Date.now().toString().slice(-6);
  const testMeter = `BES-99${uniqueId}`;
  const testEmail = `citizen.${uniqueId}@example.com`;
  let registeredGreenpayId = '';

  test('Complete Flow: Registration (PENDING) -> Doorstep Activation -> Weighment -> Credit Ledger -> Admin Audit', async ({ page, browser }) => {
    // -------------------------------------------------------------
    // Step 1: Citizen Registers on Citizen Portal (http://localhost:5173)
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/register');
    await expect(page.locator('h1')).toContainText('Register Electricity Meter');

    // Fill registration form
    await page.fill('#reg-meter', testMeter);
    await page.fill('#reg-name', 'Ananya Sharma');
    await page.selectOption('#reg-ward', 'Koramangala');
    await page.fill('#reg-pwd', 'Password123!');
    await page.fill('input[type="email"]', testEmail);

    // Consent
    await page.check('#chk-terms');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Welcome back, Ananya Sharma');

    // Verification of Amendment #3: Account must be PENDING
    const pendingNotice = page.locator('div[role="alert"]');
    await expect(pendingNotice).toBeVisible();
    await expect(pendingNotice).toContainText('Account Status: Pending Doorstep Verification');

    // Extract the citizen's generated GreenPay ID
    const greenpayIdBtn = page.locator('button:has-text("GP-")');
    registeredGreenpayId = (await greenpayIdBtn.textContent())?.replace('→', '').trim() || '';
    expect(registeredGreenpayId).toContain('GP-');

    // -------------------------------------------------------------
    // Step 2: Supervisor Logs In on Admin Portal (http://localhost:5174)
    const supervisorContext = await browser.newContext();
    const supervisorPage = await supervisorContext.newPage();
    await supervisorPage.goto('http://localhost:5174/');
    await expect(supervisorPage.locator('h1')).toContainText('Admin & Supervisor Portal');

    // Login as Koramangala Supervisor
    await supervisorPage.fill('#admin-email', 'supervisor.koramangala@greenpay.blr');
    await supervisorPage.fill('#admin-pass', 'AdminSecure2026!');
    await supervisorPage.click('button[type="submit"]');

    await supervisorPage.waitForURL('**/supervisor', { timeout: 15000 });
    await expect(supervisorPage.locator('h1')).toContainText('Field Weighment Entry');

    // -------------------------------------------------------------
    // Step 3: Supervisor Looks Up Citizen & Confirms Identity (Amendment #3)
    // -------------------------------------------------------------
    await supervisorPage.fill('#citizen-search', registeredGreenpayId);
    await supervisorPage.click('button:has-text("Search")');

    // Citizen details card appears with PENDING status
    await expect(supervisorPage.locator('h2')).toContainText('Ananya Sharma');
    await expect(supervisorPage.locator('span:has-text("PENDING")')).toBeVisible();

    // Verify weighment submit is disabled when pending
    const submitBtn = supervisorPage.locator('button[type="submit"]:has-text("Activate Account Above")');
    await expect(submitBtn).toBeDisabled();

    // Supervisor confirms doorstep identity
    await supervisorPage.click('button:has-text("Confirm Doorstep Identity & Activate Account")');

    // Account status updates to ACTIVE
    await expect(supervisorPage.locator('span:has-text("ACTIVE")')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // Step 4: Supervisor Enters Weighment & Issues Civic Credits
    // -------------------------------------------------------------
    await supervisorPage.fill('#wt-wet', '2.0');
    await supervisorPage.fill('#wt-dry', '3.5');
    await supervisorPage.fill('#wt-notes', 'Pristine doorstep segregation.');

    // Live preview updates
    await expect(supervisorPage.locator('text=+45 pts')).toBeVisible({ timeout: 5000 });

    // Submit collection
    await supervisorPage.click('button[type="submit"]:has-text("Record Doorstep Collection & Award Credits")');

    // Receipt visible
    await expect(supervisorPage.locator('text=Collection Verified & Points Awarded')).toBeVisible({ timeout: 10000 });
    await supervisorPage.close();
    await supervisorContext.close();

    // -------------------------------------------------------------
    // Step 5: Citizen Checks Credits Ledger on Citizen Web Portal
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/credits');
    await expect(page.locator('h1')).toContainText('Green Credits Ledger');

    // Verify verified transaction is present
    await expect(page.locator('text=+45 pts')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Append-only database triggers active')).toBeVisible();
    await expect(page.locator('text=Non-Monetary Civic Points')).toBeVisible();

    // -------------------------------------------------------------
    // Step 6: Super Admin Inspects Ward Analytics & Audit Logs
    // -------------------------------------------------------------
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await adminPage.goto('http://localhost:5174/');
    await adminPage.fill('#admin-email', 'admin@greenpay.blr');
    await adminPage.fill('#admin-pass', 'AdminSecure2026!');
    await adminPage.click('button[type="submit"]');

    await adminPage.waitForURL('**/analytics', { timeout: 15000 });
    await expect(adminPage.locator('h1')).toContainText('Bengaluru Ward Analytics');
    await expect(adminPage.locator('text=DEMO DATA ONLY')).toBeVisible();

    // Check Audit Logs
    await adminPage.goto('http://localhost:5174/audit-logs');
    await expect(adminPage.locator('h1')).toContainText('Municipal Audit Logs');
    await expect(adminPage.locator('text=DOORSTEP_CITIZEN_ACTIVATION').first()).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=LOG_WEIGHMENT').first()).toBeVisible();

    await adminPage.close();
    await adminContext.close();
  });
});
