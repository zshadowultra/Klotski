import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:3000');
  
  // Click on a piece to trigger sound
  await page.waitForSelector('.piece');
  const piece = await page.$('.piece');
  if (piece) {
    await piece.click();
    await page.waitForTimeout(1000);
  } else {
    console.log('No piece found');
  }
  
  await browser.close();
})();
