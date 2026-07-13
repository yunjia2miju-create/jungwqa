const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/item/view/local-1783925950250', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  const fs = require('fs');
  fs.writeFileSync('rendered_prod.html', content);
  
  const url = await page.evaluate(() => window.location.href);
  console.log("FINAL URL:", url);
  
  await browser.close();
})();
