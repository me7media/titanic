import { test, expect } from '@playwright/test';

test('Game starts and reaches playing phase without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    page.on('pageerror', err => {
        errors.push(err.message);
    });

    // Use 127.0.0.1 instead of localhost
    await page.goto('http://127.0.0.1:3000');
    console.log("Navigated to:", page.url());

    // 1. Initial Screen
    await expect(page.locator('#start-screen')).toBeVisible();

    // 2. Start Game
    const startBtn = page.getByRole('button', { name: 'Почати подорож' });
    await startBtn.click();

    // 3. Verify Game Container
    await expect(page.locator('#game-container')).toBeVisible();

    // 4. Wait for initialization
    await page.waitForTimeout(2000);

    // 5. Check for critical errors
    if (errors.length > 0) {
        throw new Error(`Console errors detected: \n${errors.join('\n')}`);
    }

    console.log("✅ Smoke test passed: Game started successfully.");
});

test('Automated Test Suite (test.html) passes', async ({ page }) => {
    // Use 127.0.0.1
    await page.goto('http://127.0.0.1:3000/test.html');

    const results = page.locator('#results');
    
    // Log internal test results to CI console for visibility
    const testLogs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#results div')).map(div => div.innerText);
    });
    console.log("--- Internal Test Suite Logs ---");
    testLogs.forEach(log => console.log(log));

    await expect(results).toContainText('УСІ ТЕСТИ ТА ПРАВИЛА ПРОЙДЕНО УСПІШНО!', { timeout: 15000 });
});
