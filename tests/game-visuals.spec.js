import { test, expect } from '@playwright/test';

test.describe('🚢 3D WebGL Engine Visuals & UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000'); 
  });

  test('🖥️ Should load the WebGL canvas and UI start screen correctly', async ({ page }) => {
    // Assert Start screen is visible
    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toBeVisible();

    // The WebGL canvas injected by Three.js should exist
    const canvas = page.locator('canvas');
    await expect(canvas).toBeAttached();

    // Check title text exists
    const title = page.locator('h1.logo');
    await expect(title).toHaveText('Титанік 3D');
  });
  
  test('🎬 Start button should hide overlay and show game UI', async ({ page }) => {
    // Start the game
    const startBtn = page.locator('#start-btn');
    await startBtn.click();
    
    // Start screen should fade out
    const startScreen = page.locator('#start-screen');
    await expect(startScreen).not.toBeVisible({ timeout: 3000 });
    
    // UI overlay should be visible
    const ui = page.locator('#ui-overlay');
    await expect(ui).toBeVisible();
    
    // Controls Hint should be visible
    const hints = page.locator('#controls-hint');
    await expect(hints).toBeVisible();
    
    // Test logging message appears
    const msg = page.locator('#message-display');
    await expect(msg).toContainText("Гра розпочата.");
  });

  test('⚠️ No console errors should occur during initialization', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
            errors.push(msg.text());
        }
    });

    await page.goto('http://localhost:3000');
    await page.click('#start-btn');
    await page.waitForTimeout(2000);
    
    // We expect no critical JS errors in the Three.js loop or modules
    expect(errors).toEqual([]);
  });
});
