import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  
  await page.goto('http://localhost:3000');
  
  await page.evaluate(async () => {
    try {
      const dataUri = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYxLjEuMTAwAAAAAAAAAAAAAAD/+0DAAAAAAAAAAAAAAAAAAAAAAABJbmZvAAAADwAAAAEAAAAYAAADcAAEBwgKDA4QEhQWGBocHh8iJCYoKissLS8yNDY4Ojw+QEJDREVHSEpMT1FUVVdYWlxeYGJkZmhqbG5wcXN1eHl7fH6AgYODhYeJiouNjo+Rk5WWmJqcn6GjpKanqKqtr7Gztbe5u72/wcLDxMbIy83P0NLU1tfY2tzd3+Hj5ebn6Ors7vDx8/X3+fr8/f8AAAAATGF2YzYxLjMuMTAwAAAAAAAAAAAAAAAAJAAAAAAAAAAAcAAEBwgKDA4QEhQWGBocHh8iJCYoKissLS8yNDY4Ojw+QEJDREVHSEpMT1FUVVdYWlxeYGJkZmhqbG5wcXN1eHl7fH6AgYODhYeJiouNjo+Rk5WWmJqcn6GjpKanqKqtr7Gztbe5u72/wcLDxMbIy83P0NLU1tfY2tzd3+Hj5ebn6Ors7vDx8/X3+fr8/f8AAAAATGF2YzYxLjMuMTAwAAAAAAAAAAAAAAAAJAAAAAAAAAAAcAAEBwgKDA4QEhQWGBocHh8iJCYoKissLS8yNDY4Ojw+QEJDREVHSEpMT1FUVVdYWlxeYGJkZmhqbG5wcXN1eHl7fH6AgYODhYeJiouNjo+Rk5WWmJqcn6GjpKanqKqtr7Gztbe5u72/wcLDxMbIy83P0NLU1tfY2tzd3+Hj5ebn6Ors7vDx8/X3+fr8/f8AAAAATGF2YzYxLjMuMTAwAAAAAAAAAAAAAAAAJAAAAAAAAAAA';
      const res = await fetch(dataUri);
      console.log('Fetch data URI ok:', res.ok);
      const buffer = await res.arrayBuffer();
      console.log('Buffer length:', buffer.byteLength);
    } catch (e) {
      console.error('Fetch data URI failed:', e);
    }
  });
  
  await browser.close();
})();
