const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    console.log("Launching Edge...");
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log("Edge launched. Navigating to register page...");
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('https://frontend-kappa-fawn-15.vercel.app/register', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log("Page loaded. Extracting HTML...");
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('page_content.html', html);
    
    console.log("Checking for form fields...");
    const inputs = await page.$$eval('input', inputs => inputs.map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder })));
    console.log("Inputs found:", inputs);
    
    const buttons = await page.$$eval('button', buttons => buttons.map(b => ({ text: b.textContent, type: b.type })));
    console.log("Buttons found:", buttons);
    
    console.log("Done.");
  } catch (error) {
    console.error("Script Error:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
