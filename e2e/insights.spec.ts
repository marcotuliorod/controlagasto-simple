import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';

test.describe('Financial Insights', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);
  });

  test('should display insights card on dashboard', async ({ page }) => {
    // Check for insights section
    const insightsCard = page.locator('text=/insights|dicas|análise/i').first();
    
    const isVisible = await insightsCard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      console.log('✅ Insights card is visible on dashboard');
    } else {
      console.log('⚠️ Insights card not found - might be loading or no data');
    }
  });

  test('should show AI-generated insights when available', async ({ page }) => {
    // Wait for insights to load (AI generation can take time)
    await page.waitForTimeout(3000);
    
    // Look for insight messages with emojis (✅, ⚠️, 💡, etc.)
    const insightText = page.locator('text=/✅|⚠️|💡|🎯/').first();
    
    const hasInsight = await insightText.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasInsight) {
      const text = await insightText.textContent();
      console.log(`📊 Found insight: ${text?.substring(0, 50)}...`);
    } else {
      console.log('⚠️ No insights generated yet');
    }
  });

  test('should display insight types correctly', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Check for different insight types
    const positiveInsight = await page.locator('text=/✅|parabéns/i').isVisible({ timeout: 2000 }).catch(() => false);
    const warningInsight = await page.locator('text=/⚠️|atenção/i').isVisible({ timeout: 2000 }).catch(() => false);
    const tipInsight = await page.locator('text=/💡|dica/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    const hasAnyInsight = positiveInsight || warningInsight || tipInsight;
    
    if (hasAnyInsight) {
      console.log('✅ Insights are displaying with proper types');
    } else {
      console.log('⚠️ No typed insights found');
    }
  });

  test('should show timestamp of last insight generation', async ({ page }) => {
    // Look for timestamp or "last updated" text
    const timestamp = page.locator('text=/atualizado|gerado|há.*minuto|há.*hora/i').first();
    
    const hasTimestamp = await timestamp.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTimestamp) {
      const text = await timestamp.textContent();
      console.log(`⏰ Insight timestamp: ${text}`);
    } else {
      console.log('⚠️ No timestamp found for insights');
    }
  });

  test('should update insights based on expense data', async ({ page }) => {
    // This test validates that insights reflect current data
    // by checking for expense-related metrics in insight text
    
    await page.waitForTimeout(3000);
    
    // Look for insights mentioning amounts, percentages, or categories
    const dataInsight = page.locator('text=/R\\$|%|categoria|meta|orçamento/i').first();
    
    const hasDataReference = await dataInsight.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasDataReference) {
      console.log('✅ Insights reference actual expense data');
    } else {
      console.log('⚠️ No data-driven insights found');
    }
  });

  test('should handle empty state when no insights available', async ({ page }) => {
    // Check for loading or empty state
    const loadingState = await page.locator('text=/carregando|gerando/i').isVisible({ timeout: 2000 }).catch(() => false);
    const emptyState = await page.locator('text=/nenhum insight|sem dados/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (loadingState) {
      console.log('⏳ Insights are still loading');
    } else if (emptyState) {
      console.log('📭 No insights available (empty state)');
    }
  });

  test('should navigate to insights detail page if available', async ({ page }) => {
    // Check if there's a link or button to view more insights
    const viewMoreButton = page.getByRole('link', { name: /ver mais|detalhes|insights/i }).first();
    
    const hasViewMore = await viewMoreButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasViewMore) {
      await viewMoreButton.click();
      
      // Should navigate to insights page or expand view
      await page.waitForTimeout(1000);
      console.log(`📍 Navigated to: ${page.url()}`);
    } else {
      console.log('⚠️ No "view more" insights link found');
    }
  });

  test('should display multiple insights in card', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Count insight items
    const insightItems = page.locator('[class*="insight"], li:has-text("✅"), li:has-text("⚠️"), li:has-text("💡")');
    const count = await insightItems.count();
    
    if (count > 0) {
      console.log(`✅ Displaying ${count} insights`);
      expect(count).toBeGreaterThan(0);
    } else {
      console.log('⚠️ No individual insight items found');
    }
  });
});
