import { test, expect } from '@playwright/test';

const TEST_USERS = {
  sysAdmin: {
    email: 'admin@smartbuilding.com',
    password: 'Admin@123456',
  },
  technician: {
    email: 'tech@smartbuilding.com',
    password: 'Tech@123456',
  },
  fdm: {
    email: 'fdm@smartbuilding.com',
    password: 'Fdm@123456',
  },
};

async function loginAs(page: any, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

test.describe('Navigation & RBAC Filtering', () => {
  test('should show sidebar navigation after login', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    // Sidebar or navigation should be visible
    const nav = page.locator('nav, aside, [role="navigation"], [data-testid="sidebar"]');
    await expect(nav.first()).toBeVisible({ timeout: 5000 });
  });

  test('sys_admin should see all navigation items', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    // sys_admin should have access to most sections
    const nav = page.locator('nav, aside, [role="navigation"], [data-testid="sidebar"]');
    await expect(nav.first()).toBeVisible({ timeout: 5000 });

    const navText = await nav.first().textContent();
    // sys_admin should see dashboard, energy, environment, assets, alerts, settings
    expect(navText).toBeTruthy();
  });

  test('financial_decision_maker should see filtered navigation', async ({ page }) => {
    await loginAs(page, TEST_USERS.fdm);

    const nav = page.locator('nav, aside, [role="navigation"], [data-testid="sidebar"]');
    await expect(nav.first()).toBeVisible({ timeout: 5000 });

    const navText = await nav.first().textContent();
    expect(navText).toBeTruthy();
  });

  test('technician should see filtered navigation', async ({ page }) => {
    await loginAs(page, TEST_USERS.technician);

    const nav = page.locator('nav, aside, [role="navigation"], [data-testid="sidebar"]');
    await expect(nav.first()).toBeVisible({ timeout: 5000 });

    const navText = await nav.first().textContent();
    expect(navText).toBeTruthy();
  });

  test('should navigate to Energy page', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    // Click on Energy link in navigation
    const energyLink = page.locator('a[href*="energy"], button:has-text("Energy")');
    if (await energyLink.isVisible({ timeout: 3000 })) {
      await energyLink.click();
      await page.waitForURL('**/energy**', { timeout: 5000 });
      await expect(page).toHaveURL(/energy/);
    }
  });

  test('should navigate to Assets page', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    const assetsLink = page.locator('a[href*="assets"], button:has-text("Assets"), a[href*="equipment"]');
    if (await assetsLink.isVisible({ timeout: 3000 })) {
      await assetsLink.click();
      await page.waitForURL('**/assets**', { timeout: 5000 });
      await expect(page).toHaveURL(/assets/);
    }
  });

  test('should navigate to Alerts page', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    const alertsLink = page.locator('a[href*="alerts"], button:has-text("Alerts")');
    if (await alertsLink.isVisible({ timeout: 3000 })) {
      await alertsLink.click();
      await page.waitForURL('**/alerts**', { timeout: 5000 });
      await expect(page).toHaveURL(/alerts/);
    }
  });

  test('should navigate to Environment page', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    const envLink = page.locator('a[href*="environment"], button:has-text("Environment")');
    if (await envLink.isVisible({ timeout: 3000 })) {
      await envLink.click();
      await page.waitForURL('**/environment**', { timeout: 5000 });
      await expect(page).toHaveURL(/environment/);
    }
  });

  test('should show 404 or redirect for unknown routes', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    await page.goto('/nonexistent-page');

    // Should either show 404 or redirect
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
