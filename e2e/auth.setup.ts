import { test as setup, expect } from '@playwright/test';
import { TEST_USER, waitForPageLoad } from './fixtures/test-data';

const authFile = 'artifacts/e2e/.auth/user.json';

/**
 * Setup authentication state for tests
 * This runs once before all tests and saves the authenticated state
 */
setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...');
  
  await page.goto('/auth');
  await waitForPageLoad(page);

  // Try to sign up (will fail if user exists, which is fine)
  try {
    await page.getByPlaceholder('seu@email.com').fill(TEST_USER.email);
    await page.getByPlaceholder('Sua senha').fill(TEST_USER.password);
    await page.getByRole('button', { name: /criar conta/i }).click();
    
    // Wait for redirect to onboarding or dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10000 });
    
    // If on onboarding, complete it
    if (page.url().includes('onboarding')) {
      await page.getByPlaceholder(/meta mensal/i).fill(TEST_USER.monthlyGoal.toString());
      await page.getByRole('button', { name: `Dia ${TEST_USER.billingCycleDay}` }).click();
      await page.getByRole('button', { name: /começar/i }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });
    }
  } catch (error) {
    console.log('⚠️ Signup failed (user might exist), trying login...');
    
    // Navigate back to auth page
    await page.goto('/auth');
    await waitForPageLoad(page);
    
    // Try to login
    await page.getByPlaceholder('seu@email.com').fill(TEST_USER.email);
    await page.getByPlaceholder('Sua senha').fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar/i }).click();
    
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  // Verify we're authenticated
  await expect(page).toHaveURL(/\/dashboard/);
  
  // Save signed-in state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication setup complete');
});
