import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  
  // We need to know the URL. The soundManager uses the imported URL.
  // I'll try to fetch a known path.
  const urls = [
    '/sounds/move.wav',
    '/sounds/select.wav',
    '/sounds/win.wav'
  ];
  
  for (const url of urls) {
    try {
      const res = await page.goto('http://127.0.0.1:3000' + url);
      console.log(`Fetch ${url}:`, res?.status(), res?.headers()['content-type']);
      if (res?.status() === 200) {
        const buffer = await res.body();
        console.log(`Buffer length: ${buffer.length}`);
      }
    } catch (e) {
      console.error(`Fetch ${url} failed:`, e);
    }
  }
  
  await browser.close();
})();
