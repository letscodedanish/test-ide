import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AI API responses
    await page.route('/api/ai/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/completion')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              content: 'function hello() {\n  console.log("Hello, World!");\n}',
              type: 'code',
              confidence: 0.9,
            },
          }),
        });
      } else if (url.includes('/inline')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            suggestion: '() => {',
          }),
        });
      } else if (url.includes('/explain')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            explanation: 'This function logs a greeting message to the console.',
          }),
        });
      }
    });
  });

  test('should open AI prompt bar with keyboard shortcut', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Wait for editor to load
    await page.waitForSelector('[data-testid="monaco-editor"]');
    
    // Press Ctrl+K (or Cmd+K on Mac)
    await page.keyboard.press('ControlOrMeta+k');
    
    // AI prompt bar should be visible
    await expect(page.getByText('AI Assistant')).toBeVisible();
  });

  test('should generate code completion', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Open AI prompt bar
    await page.getByText('AI').click();
    
    // Type a prompt
    await page.getByPlaceholder('Ask AI to help with your code...').fill('Create a hello world function');
    
    // Submit the prompt
    await page.getByRole('button', { name: /send/i }).click();
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Should show suggestion overlay
    await expect(page.getByText('AI Suggestion')).toBeVisible();
    await expect(page.getByText('function hello()')).toBeVisible();
  });

  test('should explain selected code', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Wait for editor to load
    await page.waitForSelector('[data-testid="monaco-editor"]');
    
    // Select some code (simulate)
    await page.getByTestId('monaco-editor').click();
    await page.keyboard.press('ControlOrMeta+a'); // Select all
    
    // Open AI prompt bar
    await page.getByText('AI').click();
    
    // Click explain code quick action
    await page.getByText('Explain Code').click();
    
    // Should show explanation
    await expect(page.getByText('AI Explanation')).toBeVisible();
    await expect(page.getByText('This function logs a greeting message')).toBeVisible();
  });

  test('should show quick action buttons', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Open AI prompt bar
    await page.getByText('AI').click();
    
    // Check all quick action buttons are present
    await expect(page.getByText('Complete Code')).toBeVisible();
    await expect(page.getByText('Explain Code')).toBeVisible();
    await expect(page.getByText('Refactor')).toBeVisible();
    await expect(page.getByText('Find Bugs')).toBeVisible();
    await expect(page.getByText('Ask AI')).toBeVisible();
  });

  test('should accept AI suggestion', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Open AI prompt and generate suggestion
    await page.getByText('AI').click();
    await page.getByPlaceholder('Ask AI to help with your code...').fill('Create a function');
    await page.getByRole('button', { name: /send/i }).click();
    
    // Wait for suggestion overlay
    await expect(page.getByText('AI Suggestion')).toBeVisible();
    
    // Accept the suggestion
    await page.getByRole('button', { name: /accept/i }).click();
    
    // Suggestion overlay should disappear
    await expect(page.getByText('AI Suggestion')).not.toBeVisible();
  });

  test('should reject AI suggestion', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Open AI prompt and generate suggestion
    await page.getByText('AI').click();
    await page.getByPlaceholder('Ask AI to help with your code...').fill('Create a function');
    await page.getByRole('button', { name: /send/i }).click();
    
    // Wait for suggestion overlay
    await expect(page.getByText('AI Suggestion')).toBeVisible();
    
    // Reject the suggestion
    await page.getByRole('button', { name: /reject/i }).click();
    
    // Suggestion overlay should disappear
    await expect(page.getByText('AI Suggestion')).not.toBeVisible();
  });

  test('should handle AI errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('/api/ai/completion', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded. Try again in 30 seconds.',
        }),
      });
    });

    await page.goto('/playground/test-id');
    
    // Try to generate completion
    await page.getByText('AI').click();
    await page.getByPlaceholder('Ask AI to help with your code...').fill('Create a function');
    await page.getByRole('button', { name: /send/i }).click();
    
    // Should show error message
    await expect(page.getByText('Rate limit exceeded')).toBeVisible();
  });

  test('should show inline suggestions', async ({ page }) => {
    await page.goto('/playground/test-id');
    
    // Wait for editor to load
    await page.waitForSelector('[data-testid="monaco-editor"]');
    
    // Type some code to trigger inline suggestion
    await page.getByTestId('monaco-editor').click();
    await page.keyboard.type('const myFunction = ');
    
    // Should show inline suggestion hint
    await expect(page.getByText('AI Suggestion')).toBeVisible();
    await expect(page.getByText('Press Tab to accept')).toBeVisible();
  });
});