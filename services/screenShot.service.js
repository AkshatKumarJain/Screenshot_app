import puppeteer from 'puppeteer';

export async function captureScreenshot(imageUrl, savePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const fullUrl = `http://localhost:${process.env.PORT}/preview?image=${encodeURIComponent(imageUrl)}`;
  console.log("Navigating to:", fullUrl);

  await page.goto(fullUrl, { waitUntil: 'networkidle0' });
  await page.waitForSelector('img', { visible: true });
  await page.waitForFunction(() => {
    const img = document.querySelector('img');
    return img && img.complete && img.naturalHeight !== 0;
  });

  await page.screenshot({ path: savePath });
  await browser.close();
}
