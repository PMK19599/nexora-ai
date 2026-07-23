const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://frontend-kappa-fawn-15.vercel.app/register', { waitUntil: 'networkidle0' });
    
    // Find the submit button
    const buttons = await page.$$('button');
    let submitBtn;
    for (let b of buttons) {
      const text = await b.evaluate(node => node.textContent);
      if (text.includes('Continue')) { submitBtn = b; break; }
    }
    
    // Test 1: Empty Form
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 500)); // wait for validation msg
    // Try to find any error text in the DOM (assuming it might be a div with text containing 'required' or similar)
    const errorText1 = await page.evaluate(() => document.body.innerText.split('\n').filter(l => l.toLowerCase().includes('required') || l.toLowerCase().includes('error') || l.toLowerCase().includes('invalid')));
    console.log("Empty form errors:", errorText1);
    
    // Test 2: Invalid email
    await page.type('#name', 'Test User');
    await page.type('#regEmail', 'invalid-email');
    await page.type('#regPass', '123');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const errorText2 = await page.evaluate(() => document.body.innerText.split('\n').filter(l => l.toLowerCase().includes('required') || l.toLowerCase().includes('error') || l.toLowerCase().includes('invalid')));
    console.log("Invalid email errors:", errorText2);

    // Test 3: valid submission (might trigger a network request)
    await page.evaluate(() => { document.querySelector('#name').value = ''; document.querySelector('#regEmail').value = ''; document.querySelector('#regPass').value = ''; });
    await page.type('#name', 'Test User');
    await page.type('#regEmail', 'test_' + Date.now() + '@example.com');
    await page.type('#regPass', 'ValidPassword123!');
    
    // Catch API call
    page.on('request', request => {
      if (request.url().includes('api') || request.url().includes('register')) {
        console.log('API Request:', request.url(), request.postData());
      }
    });
    
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    console.log("Current URL after submit:", page.url());
    
  } catch (error) {
    console.error(error);
  } finally {
    if (browser) await browser.close();
  }
})();
