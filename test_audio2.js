import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:3000');
  
  // Expose a function to test audio directly
  await page.evaluate(async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const res = await fetch('/src/assets/sounds/move.mp3');
      console.log('Fetch ok:', res.ok);
      const arrayBuffer = await res.arrayBuffer();
      console.log('ArrayBuffer byteLength:', arrayBuffer.byteLength);
      
      const audioBuffer = await new Promise((resolve, reject) => {
        try {
          const decodePromise = ctx.decodeAudioData(
            arrayBuffer,
            (buffer) => { console.log('Callback success'); resolve(buffer); },
            (err) => { console.log('Callback error'); reject(err); }
          );
          if (decodePromise) {
            decodePromise.then(b => { console.log('Promise success'); resolve(b); }).catch(e => { console.log('Promise error'); reject(e); });
          }
        } catch (e) {
          console.log('Sync error');
          reject(e);
        }
      });
      console.log('AudioBuffer length:', audioBuffer.length);
    } catch (e) {
      console.error('Test failed:', e);
    }
  });
  
  await browser.close();
})();
