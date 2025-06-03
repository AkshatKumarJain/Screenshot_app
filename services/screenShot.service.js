import puppeteer from 'puppeteer';

export async function captureScreenshot(imageUrl, savePath) {
  const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
  const fullUrl = `${BASE_URL}/preview?image=${encodeURIComponent(imageUrl)}`;

  console.log("Navigating to:", fullUrl);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Needed for Render
  });

  const page = await browser.newPage();

  await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  await page.waitForSelector('img', { visible: true });
  await page.waitForFunction(() => {
    const img = document.querySelector('img');
    return img && img.complete && img.naturalHeight !== 0;
  });

  await page.screenshot({ path: savePath });
  await browser.close();

  console.log(`Screenshot saved to ${savePath}`);
}
