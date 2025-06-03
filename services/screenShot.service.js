import puppeteer from 'puppeteer';

export async function captureScreenshot(imageUrl, savePath) {
  // Get BASE_URL from environment or construct it
  // In production (Render), we use the provided URL from RENDER_EXTERNAL_URL
  const isProduction = process.env.NODE_ENV === 'production';
  const BASE_URL = process.env.RENDER_EXTERNAL_URL || 
                   process.env.BASE_URL || 
                   `http://localhost:${process.env.PORT || 8000}`;
  
  const fullUrl = `${BASE_URL}/preview?image=${encodeURIComponent(imageUrl)}`;
  
  console.log("Environment:", isProduction ? "Production" : "Development");
  console.log("Navigating to:", fullUrl);

  let browser = null;
  
  try {
    // Configure Puppeteer based on environment
    const options = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };
    
    // In production, use the system Chrome installation
    if (isProduction && process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.log(`Using Chrome at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    
    browser = await puppeteer.launch(options);
    console.log("Browser launched successfully");
    
    const page = await browser.newPage();
    
    // Set a reasonable viewport
    await page.setViewport({
      width: 1280,
      height: 800
    });
    
    // Navigate with a longer timeout for production
    await page.goto(fullUrl, { 
      waitUntil: 'networkidle0', 
      timeout: isProduction ? 90000 : 60000 
    });
    
    console.log("Page loaded, waiting for image");
    
    // Wait for the image to be visible and fully loaded
    await page.waitForSelector('img', { visible: true, timeout: 30000 });
    await page.waitForFunction(() => {
      const img = document.querySelector('img');
      return img && img.complete && img.naturalHeight !== 0;
    }, { timeout: 30000 });
    
    console.log("Image loaded, taking screenshot");
    
    // Take the screenshot
    await page.screenshot({ path: savePath });
    console.log(`Screenshot saved to ${savePath}`);
    
  } catch (err) {
    console.error("Error during screenshot capture:", err);
    throw err;
  } finally {
    // Ensure browser is always closed
    if (browser) {
      console.log("Closing browser");
      await browser.close();
    }
  }
}
