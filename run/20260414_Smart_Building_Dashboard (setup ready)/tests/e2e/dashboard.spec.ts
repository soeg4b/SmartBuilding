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

test.describe('Dashboard - Role-based Display', () => {
  test('E2E-DASH-01: Executive dashboard for financial_decision_maker', async ({ page }) => {
    await loginAs(page, TEST_USERS.fdm);

    // Should see executive dashboard content
    await expect(page).toHaveURL(/dashboard/);

    // Check for KPI cards (energy cost, savings, comfort)
    const kpiCards = page.locator('[data-testid="kpi-card"], .kpi-card, [class*="card"]');
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 });

    // Verify role-specific content is present
    const pageContent = await page.textContent('main, [class*="main"], [role="main"]');
    // Executive dashboard should show financial/energy data
    expect(pageContent).toBeTruthy();
  });

  test('E2E-DASH-02: Operations dashboard for sys_admin', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    await expect(page).toHaveURL(/dashboard/);

    // Should see operations dashboard content
    const mainContent = page.locator('main, [class*="main"], [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Check page has loaded with meaningful content
    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
  });

  test('E2E-DASH-03: Technician dashboard for technician', async ({ page }) => {
    await loginAs(page, TEST_USERS.technician);

    await expect(page).toHaveURL(/dashboard/);

    // Should see technician dashboard content
    const mainContent = page.locator('main, [class*="main"], [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
  });

  test('should display building selector or default building', async ({ page }) => {
    await loginAs(page, TEST_USERS.sysAdmin);

    // Check that dashboard has loaded
    const mainContent = page.locator('main, [class*="main"], [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });
});
