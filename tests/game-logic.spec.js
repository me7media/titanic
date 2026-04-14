const { test, expect } = require('@playwright/test');
const path = require('path');

const filePath = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('Titanic Game Logic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(filePath);
    });

    test('should start the game when button is clicked', async ({ page }) => {
        // Start screen should be visible
        await expect(page.locator('#start-screen')).toBeVisible();

        // Click start
        await page.click('#start-btn');

        // Start screen should fade out
        await expect(page.locator('#start-screen')).toHaveClass(/fade-out/);
    });

    test('should switch modes between Ship, Jack, and Rose', async ({ page }) => {
        await page.click('#start-btn');

        // Initial mode is 'Корабель'
        await expect(page.locator('#current-mode')).toHaveText('Корабель');

        // Click on canvas to ensure focus
        await page.click('#game-canvas');

        // Press '2' for Jack
        await page.keyboard.press('2');
        await page.waitForTimeout(100); // Wait for game loop
        await expect(page.locator('#current-mode')).toHaveText('Джек');
        await expect(page.locator('#character-stats')).not.toHaveClass(/hidden/);

        // Press '3' for Rose
        await page.keyboard.press('3');
        await expect(page.locator('#current-mode')).toHaveText('Роуз');
    });

    test('should trigger sinking phase upon iceberg collision', async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', 'Canvas interaction tests are more stable on Chromium');

        await page.click('#start-btn');

        // Use evaluate to force a collision state for testing purposes
        await page.evaluate(() => {
            game.ship.x = game.icebergs[0].x - 100;
            game.ship.y = game.icebergs[0].y;
            // Immediate check collision
            checkCollisions();
        });

        // Check if message display shows the panic message
        await expect(page.locator('#message-display')).toContainText('Айсберг');
    });
});
