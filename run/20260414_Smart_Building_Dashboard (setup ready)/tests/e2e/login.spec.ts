import { test, expect } from '@playwright/test';

const TEST_USERS = {
  sysAdmin: {
    email: 'admin@smartbuilding.com',
    password: 'Admin@123456',
    name: 'Admin User',
  },
  technician: {
    email: 'tech@smartbuilding.com',
    password: 'Tech@123456',
    name: 'Tech User',
  },
  fdm: {
    email: 'fdm@smartbuilding.com',
    password: 'Fdm@123456',
    name: 'Finance User',
  },
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('E2E-AUTH-01: should login successfully with valid credentials', async ({ page }) => {
    // Fill email
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.sysAdmin.email);
    // Fill password
    await page.fill('input[name="password"], input[type="password"]', TEST_USERS.sysAdmin.password);
    // Click login button
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('E2E-AUTH-02: should show error message on invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'wrong@email.com');
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should stay on login page
    await expect(page).toHaveURL(/login/);

    // Should show error message
    const errorMessage = page.locator('[role="alert"], .error, [data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('E2E-AUTH-03: should redirect to login after logout', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.sysAdmin.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USERS.sysAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // Find and click logout
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Admin"), [aria-label="User menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');
    await logoutButton.click();

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should show login form elements', async ({ page }) => {
    // Verify form elements exist
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should not submit with empty fields', async ({ page }) => {
    // Click submit without filling anything
    await page.click('button[type="submit"]');

    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('E2E-AUTH-04: should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
