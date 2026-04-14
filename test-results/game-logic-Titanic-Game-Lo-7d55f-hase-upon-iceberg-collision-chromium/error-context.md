# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game-logic.spec.js >> Titanic Game Logic >> should trigger sinking phase upon iceberg collision
- Location: tests/game-logic.spec.js:42:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#message-display')
Expected substring: "Айсберг"
Received string:    "Подорож починається..."

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#message-display')
    6 × locator resolved to <div id="message-display">Подорож починається...</div>
      - unexpected value "Подорож починається..."

```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | const path = require('path');
  3  | 
  4  | const filePath = `file://${path.resolve(__dirname, '../index.html')}`;
  5  | 
  6  | test.describe('Titanic Game Logic', () => {
  7  |     test.beforeEach(async ({ page }) => {
  8  |         await page.goto(filePath);
  9  |     });
  10 | 
  11 |     test('should start the game when button is clicked', async ({ page }) => {
  12 |         // Start screen should be visible
  13 |         await expect(page.locator('#start-screen')).toBeVisible();
  14 | 
  15 |         // Click start
  16 |         await page.click('#start-btn');
  17 | 
  18 |         // Start screen should fade out
  19 |         await expect(page.locator('#start-screen')).toHaveClass(/fade-out/);
  20 |     });
  21 | 
  22 |     test('should switch modes between Ship, Jack, and Rose', async ({ page }) => {
  23 |         await page.click('#start-btn');
  24 | 
  25 |         // Initial mode is 'Корабель'
  26 |         await expect(page.locator('#current-mode')).toHaveText('Корабель');
  27 | 
  28 |         // Click on canvas to ensure focus
  29 |         await page.click('#game-canvas');
  30 | 
  31 |         // Press '2' for Jack
  32 |         await page.keyboard.press('2');
  33 |         await page.waitForTimeout(100); // Wait for game loop
  34 |         await expect(page.locator('#current-mode')).toHaveText('Джек');
  35 |         await expect(page.locator('#character-stats')).not.toHaveClass(/hidden/);
  36 | 
  37 |         // Press '3' for Rose
  38 |         await page.keyboard.press('3');
  39 |         await expect(page.locator('#current-mode')).toHaveText('Роуз');
  40 |     });
  41 | 
  42 |     test('should trigger sinking phase upon iceberg collision', async ({ page, browserName }) => {
  43 |         test.skip(browserName === 'webkit', 'Canvas interaction tests are more stable on Chromium');
  44 | 
  45 |         await page.click('#start-btn');
  46 | 
  47 |         // Use evaluate to force a collision state for testing purposes
  48 |         await page.evaluate(() => {
  49 |             game.ship.x = game.icebergs[0].x - 100;
  50 |             game.ship.y = game.icebergs[0].y;
  51 |             // Immediate check collision
  52 |             checkCollisions();
  53 |         });
  54 | 
  55 |         // Check if message display shows the panic message
> 56 |         await expect(page.locator('#message-display')).toContainText('Айсберг');
     |                                                        ^ Error: expect(locator).toContainText(expected) failed
  57 |     });
  58 | });
  59 | 
```