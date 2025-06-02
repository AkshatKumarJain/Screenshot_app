import puppeteer from 'puppeteer';

// for capturing the screenshot of the image
export async function captureScreenshot(url, savePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: savePath });
  await browser.close();
}
