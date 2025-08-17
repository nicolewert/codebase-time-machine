const { test, expect } = require('@playwright/test');

// Configuration - Using a small public repo for consistent testing
const TEST_REPO_URL = 'https://github.com/vercel/micro';
const DEMO_TIMEOUT = 60000; // 60 seconds for demo readiness
const ANALYSIS_TIMEOUT = 120000; // 2 minutes for AI analysis

test.describe('Critical Demo Flow - End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeouts for demo scenarios
    test.setTimeout(300000); // 5 minutes total
  });

  test('Complete hackathon demo user flow', async ({ page }) => {
    // ========================================
    // PHASE 1: Homepage Navigation
    // ========================================
    await test.step('Navigate to homepage and verify core UI', async () => {
      // Try common Next.js development ports
      const possiblePorts = [3000, 3007, 3001];
      let baseUrl = '';
      
      for (const port of possiblePorts) {
        try {
          await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle', timeout: 10000 });
          baseUrl = `http://localhost:${port}`;
          break;
        } catch (error) {
          console.log(`Port ${port} not available, trying next...`);
        }
      }
      
      if (!baseUrl) {
        throw new Error('No development server found on common ports (3000, 3007, 3001)');
      }
      
      console.log(`✅ Using server at ${baseUrl}`);
      
      // Store baseUrl for other test steps
      page.baseUrl = baseUrl;
      
      // Verify critical homepage elements
      await expect(page.locator('h1')).toContainText('Ready to Build');
      await expect(page.locator('a[href="/test-repo"]')).toBeVisible();
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
      await expect(page.locator('a[href="/claude-demo"]')).toBeVisible();
    });

    // ========================================
    // PHASE 2: Repository Addition & Validation
    // ========================================
    await test.step('Add repository with URL validation', async () => {
      // Navigate to repository addition page
      await page.click('a[href="/test-repo"]');
      await expect(page.locator('h1')).toContainText('Repository Management Demo');
      
      // Verify form is present and functional
      const urlInput = page.locator('input[placeholder*="github.com"]');
      await expect(urlInput).toBeVisible();
      
      // Test URL validation (should show loading/validation state)
      await urlInput.fill(TEST_REPO_URL);
      await page.waitForTimeout(2000); // Allow for GitHub API validation
      
      // Submit repository
      const submitButton = page.locator('button:has-text("Add Repository")');
      await expect(submitButton).toBeVisible();
      await submitButton.click();
      
      // Wait for success message or repository to appear
      await expect(
        page.locator('text=successfully').or(page.locator('text=started'))
      ).toBeVisible({ timeout: DEMO_TIMEOUT });
    });

    // ========================================
    // PHASE 3: Repository Processing & Status
    // ========================================
    await test.step('Verify repository processing status', async () => {
      // Wait for repository to appear in the list
      await expect(
        page.locator('.grid').locator('text=micro').or(page.locator('[data-testid="repo-card"]'))
      ).toBeVisible({ timeout: DEMO_TIMEOUT });
      
      // Verify basic repository information is displayed
      const repoSection = page.locator('.grid').first();
      await expect(repoSection).toBeVisible();
      
      // Check for status indicators (processing, ready, etc.)
      await expect(
        page.locator('text=processing').or(page.locator('text=ready')).or(page.locator('text=cloning'))
      ).toBeVisible({ timeout: 30000 });
    });

    // ========================================
    // PHASE 4: Dashboard Visualization
    // ========================================
    await test.step('Navigate to dashboard and verify data visualization', async () => {
      // Navigate to main dashboard
      await page.goto(`${page.baseUrl}/dashboard`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toContainText('Repository Dashboard');
      
      // Verify repository appears in dashboard
      await expect(
        page.locator('text=micro').or(page.locator('.grid').locator('[role="button"]'))
      ).toBeVisible({ timeout: DEMO_TIMEOUT });
      
      // Try to access detailed dashboard if repository is ready
      const dashboardLink = page.locator('a[href*="/dashboard/"]').first();
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click();
        
        // Verify detailed dashboard loads (basic check)
        await expect(
          page.locator('h1').or(page.locator('h2')).or(page.locator('[data-testid="dashboard-content"]'))
        ).toBeVisible({ timeout: 30000 });
      }
    });

    // ========================================
    // PHASE 5: AI Q&A Functionality
    // ========================================
    await test.step('Test AI Q&A interface', async () => {
      // Navigate to Claude demo page
      await page.goto(`${page.baseUrl}/claude-demo`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toContainText('AI-Powered Code Analysis');
      
      // Verify repository selection is available
      await expect(
        page.locator('text=Available Repositories').or(page.locator('button:has-text("micro")'))
      ).toBeVisible({ timeout: 30000 });
      
      // Look for chat interface or Q&A components
      const chatInterface = page.locator('textarea').or(page.locator('input[placeholder*="question"]'));
      if (await chatInterface.isVisible()) {
        // Test basic Q&A interaction (non-blocking)
        await chatInterface.fill('What is this repository about?');
        
        const submitButton = page.locator('button:has-text("Send")').or(page.locator('button[type="submit"]'));
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Wait briefly for response indication (don't block on full AI response)
          await page.waitForTimeout(5000);
        }
      }
      
      // Verify commits section exists
      await expect(
        page.locator('text=Recent Commits').or(page.locator('text=commits'))
      ).toBeVisible({ timeout: 15000 });
    });

    // ========================================
    // PHASE 6: Performance & Error Handling
    // ========================================
    await test.step('Verify error handling and performance', async () => {
      // Test navigation back to test-repo page
      await page.goto(`${page.baseUrl}/test-repo`, { waitUntil: 'networkidle' });
      
      // Try adding duplicate repository (should handle gracefully)
      const urlInput = page.locator('input[placeholder*="github.com"]');
      if (await urlInput.isVisible()) {
        await urlInput.fill(TEST_REPO_URL);
        await page.waitForTimeout(1000);
        
        const submitButton = page.locator('button:has-text("Add Repository")');
        if (await submitButton.isVisible() && !await submitButton.isDisabled()) {
          await submitButton.click();
          
          // Should show error message about duplicate
          await expect(
            page.locator('text=already exists').or(page.locator('text=duplicate'))
          ).toBeVisible({ timeout: 10000 });
        }
      }
      
      // Verify all main navigation links work
      await page.click('a[href="/dashboard"]');
      await expect(page).toHaveURL(/.*dashboard.*/);
      
      await page.click('a[href="/claude-demo"]');
      await expect(page).toHaveURL(/.*claude-demo.*/);
    });
  });

  test('Critical error scenarios and recovery', async ({ page }) => {
    await test.step('Test invalid repository URL handling', async () => {
      await page.goto(`${page.baseUrl || 'http://localhost:3000'}/test-repo`);
      
      const urlInput = page.locator('input[placeholder*="github.com"]');
      await urlInput.fill('https://github.com/invalid/nonexistent-repo-xyz');
      
      const submitButton = page.locator('button:has-text("Add Repository")');
      await submitButton.click();
      
      // Should handle invalid repo gracefully
      await expect(
        page.locator('text=error').or(page.locator('text=failed')).or(page.locator('text=not found'))
      ).toBeVisible({ timeout: 30000 });
    });

    await test.step('Test dashboard with no repositories', async () => {
      await page.goto(`${page.baseUrl || 'http://localhost:3000'}/dashboard`);
      
      // Should show empty state or existing repositories
      await expect(
        page.locator('text=No repositories').or(page.locator('text=Repository Dashboard'))
      ).toBeVisible();
      
      // Verify "Clone Your First Repository" link works
      const cloneLink = page.locator('a[href="/test-repo"]');
      if (await cloneLink.isVisible()) {
        await cloneLink.click();
        await expect(page).toHaveURL(/.*test-repo.*/);
      }
    });
  });
});

// Utility test for environment verification
test.describe('Demo Environment Health Check', () => {
  test('Verify all required services are running', async ({ page }) => {
    // Try common Next.js development ports
    const possiblePorts = [3000, 3007, 3001];
    let serverUrl = '';
    
    for (const port of possiblePorts) {
      try {
        await page.goto(`http://localhost:${port}`, { waitUntil: 'load', timeout: 5000 });
        serverUrl = `http://localhost:${port}`;
        break;
      } catch (error) {
        console.log(`Port ${port} not available, trying next...`);
      }
    }
    
    if (!serverUrl) {
      throw new Error('No development server found on common ports (3000, 3007, 3001)');
    }
    
    console.log(`✅ Found server at ${serverUrl}`);
    
    // Homepage loads
    await expect(page.locator('h1')).toBeVisible();
    
    // Convex connection works (TaskList component)
    const taskList = page.locator('[data-testid="task-list"]').or(page.locator('text=Try the Convex Integration'));
    await expect(taskList).toBeVisible({ timeout: 15000 });
    
    // API endpoints respond
    const response = await page.request.get(`${serverUrl}/api/clone`);
    expect(response.status()).toBe(405); // Method not allowed is expected for GET, but endpoint exists
  });
});