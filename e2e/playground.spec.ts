import { test, expect } from '@playwright/test';

test.describe('Playground Application', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Code in the Cloud')).toBeVisible();
    await expect(page.getByText('Create Playground')).toBeVisible();
  });

  test('should navigate to playground creation', async ({ page }) => {
    await page.goto('/');
    
    await page.getByText('Create Playground').click();
    await expect(page).toHaveURL('/playground/new');
    await expect(page.getByText('Create New Playground')).toBeVisible();
  });

  test('should create a new playground', async ({ page }) => {
    await page.goto('/playground/new');
    
    // Fill in playground details
    await page.getByLabel(/playground name/i).fill('Test E2E Playground');
    await page.getByLabel(/description/i).fill('End-to-end test playground');
    
    // Select React template
    await page.getByText('React').click();
    await expect(page.getByText('Selected')).toBeVisible();
    
    // Create playground
    await page.getByText('Create Playground').click();
    
    // Should redirect to playground page
    await expect(page).toHaveURL(/\/playground\/[a-f0-9-]+/);
    await expect(page.getByText('Test E2E Playground')).toBeVisible();
  });

  test('should display file explorer and editor', async ({ page }) => {
    // Navigate to a playground (using mock data)
    await page.goto('/playground/test-id');
    
    // Check file explorer
    await expect(page.getByText('Files')).toBeVisible();
    await expect(page.getByText('src')).toBeVisible();
    
    // Check editor area
    await expect(page.getByTestId('monaco-editor')).toBeVisible();
  });

  test('should handle authentication flow', async ({ page }) => {
    await page.goto('/');
    
    // Click login
    await page.getByText('Login').click();
    
    // Should show login form (if implemented)
    // This would need actual login page implementation
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByText('Code in the Cloud')).toBeVisible();
    await expect(page.getByText('Create Playground')).toBeVisible();
  });
});