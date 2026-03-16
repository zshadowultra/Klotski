import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  
  await page.goto('http://localhost:3000');
  
  // Click on a piece to trigger sound
  await page.waitForSelector('.piece');
  const piece = await page.$('.piece');
  if (piece) {
    await piece.click();
    await page.waitForTimeout(1000);
  }
  
  // Check audio context state
  const state = await page.evaluate(() => {
    return window.__audioCtxState || 'unknown';
  });
  console.log('AudioContext state:', state);
  
  await browser.close();
})();
