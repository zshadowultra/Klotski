import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  
  // We need to know the URL. The soundManager uses the imported URL.
  // I'll try to fetch a known path.
  const urls = [
    '/assets/sounds/move.mp3',
    '/assets/move-CHX_qmNS.mp3' // Based on previous list_dir
  ];
  
  for (const url of urls) {
    try {
      const res = await page.goto('http://localhost:3000' + url);
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
