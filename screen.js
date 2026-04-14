const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('file:///Users/me/PhpstormProjects/my/titanic/index.html');
  await page.waitForTimeout(1000);
  await page.click('#start-btn');
  await page.waitForTimeout(3000); // Wait for fade and rendering
  await page.screenshot({ path: '/Users/me/.gemini/antigravity/brain/d994b98a-a07b-4813-8a1d-a254983ae135/playwright_3d_verify.png' });
  await browser.close();
})();
