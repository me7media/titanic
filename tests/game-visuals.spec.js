const { test, expect } = require('@playwright/test');
const path = require('path');

const filePath = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('Titanic Game Visuals', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(filePath);
    });

    test('should display the main game elements', async ({ page }) => {
        // Check Canvas
        const canvas = page.locator('#game-canvas');
        await expect(canvas).toBeVisible();

        // Check UI Elements presence
        await expect(page.locator('header h1:has-text("Титанік")')).toBeVisible();
        await expect(page.locator('#mode-indicator')).toBeVisible();
        await expect(page.locator('#controls-hint')).toBeVisible();
    });

    test('should verify UI element placement', async ({ page }) => {
        // Check if stats panel is initially hidden but exists
        const stats = page.locator('#character-stats');
        await expect(stats).toBeAttached();

        // Check layout: Controls hint should be at the bottom
        const controls = await page.locator('#controls-hint').boundingBox();
        const viewport = page.viewportSize();
        expect(controls.y).toBeGreaterThan(viewport.height * 0.8);
    });
});
