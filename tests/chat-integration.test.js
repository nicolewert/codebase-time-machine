const { test, expect, chromium } = require('@playwright/test');

// Test configuration
const TEST_URL = 'http://localhost:3004';
const CHAT_TEST_URL = `${TEST_URL}/test-chat`;

test.describe('Chat Interface Integration Tests', () => {
  let browser;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    
    // Navigate to test chat page
    await page.goto(CHAT_TEST_URL);
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Chat Interface Test")');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should load chat interface correctly', async () => {
    // Verify main elements are present
    await expect(page.locator('h1')).toContainText('Chat Interface Test');
    
    // Check for chat interface components
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Ask a question"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
    
    // Check for initial assistant message
    await expect(page.locator('.bg-secondary')).toContainText('Hello! I can help you understand your codebase');
  });

  test('should handle user message input', async () => {
    const testMessage = 'What is this repository about?';
    
    // Type message
    await page.fill('input[placeholder*="Ask a question"]', testMessage);
    
    // Verify send button is enabled
    await expect(page.locator('button:has-text("Send")')).not.toBeDisabled();
    
    // Send message
    await page.click('button:has-text("Send")');
    
    // Verify user message appears
    await expect(page.locator('.bg-primary')).toContainText(testMessage);
    
    // Verify loading state
    await expect(page.locator('text=Thinking...')).toBeVisible();
    
    // Wait for AI response (timeout after 5 seconds)
    await page.waitForSelector('.bg-secondary', { timeout: 5000 });
    
    // Verify AI response appears
    const responseElements = await page.locator('.bg-secondary').count();
    expect(responseElements).toBeGreaterThan(1); // Initial message + new response
  });

  test('should display context sources', async () => {
    // Check context sources are displayed
    await expect(page.locator('h3:has-text("Context Sources")')).toBeVisible();
    
    // Verify different context source types are shown
    await expect(page.locator('text=commit:')).toBeVisible();
    await expect(page.locator('text=file:')).toBeVisible();
    await expect(page.locator('text=diff:')).toBeVisible();
  });

  test('should handle context source interaction', async () => {
    // Click on a context source
    const firstContextCard = page.locator('.cursor-pointer').first();
    await firstContextCard.click();
    
    // Verify dialog opens with source details
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('button:has-text("View Source")')).toBeVisible();
  });

  test('should handle export functionality', async () => {
    // Test export dropdown
    const exportButton = page.locator('button[data-testid="export-button"]').first();
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // Verify export options are available
      await expect(page.locator('text=Copy to Clipboard')).toBeVisible();
      await expect(page.locator('text=Download')).toBeVisible();
    }
  });

  test('should test Convex connection', async () => {
    // Click test connection button
    await page.click('button:has-text("Test Convex Connection")');
    
    // Wait for and verify toast message appears
    await page.waitForSelector('[class*="bg-green-100"], [class*="bg-yellow-100"], [class*="bg-red-100"]', { timeout: 5000 });
    
    // Verify some kind of feedback is shown
    const toastVisible = await page.locator('[class*="bg-green-100"], [class*="bg-yellow-100"], [class*="bg-red-100"]').count();
    expect(toastVisible).toBeGreaterThan(0);
  });

  test('should handle error scenarios gracefully', async () => {
    // Test empty message submission
    await page.click('button:has-text("Send")');
    
    // Send button should be disabled for empty input
    await expect(page.locator('button:has-text("Send")')).toBeDisabled();
  });

  test('should display debug information', async () => {
    // Verify debug info is present
    await expect(page.locator('h3:has-text("Debug Information")')).toBeVisible();
    await expect(page.locator('text=Messages:')).toBeVisible();
    await expect(page.locator('text=Context Sources:')).toBeVisible();
    await expect(page.locator('text=Loading:')).toBeVisible();
  });

  test('should handle message timestamps', async () => {
    // Check that messages have timestamps
    const timeElements = await page.locator('[class*="text-xs text-muted-foreground"]').count();
    expect(timeElements).toBeGreaterThan(0);
  });

  test('should handle confidence scores', async () => {
    // Check for confidence score display in assistant messages
    const confidenceText = await page.locator('text=Confidence:').count();
    expect(confidenceText).toBeGreaterThan(0);
  });

  test('should handle context source badges', async () => {
    // Send a message to trigger context sources in response
    await page.fill('input[placeholder*="Ask a question"]', 'Tell me about the code structure');
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Thinking...', { state: 'detached', timeout: 10000 });
    
    // Check for context source badges in messages
    const sourceBadges = await page.locator('[class*="px-2 py-1 rounded-md text-xs"]').count();
    expect(sourceBadges).toBeGreaterThan(0);
  });
});

test.describe('API Integration Tests', () => {
  test('should handle context builder API', async () => {
    // Test the context builder API directly
    const response = await fetch(`${TEST_URL}/api/ai/context-builder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: 'test-repo-id',
        question: 'What is this project about?',
        maxCommits: 3,
        maxFiles: 2
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('contextSources');
    expect(data).toHaveProperty('contextQuality');
  });
});