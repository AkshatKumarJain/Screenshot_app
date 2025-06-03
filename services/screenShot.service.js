import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

// Helper function to get Chrome version
async function getChromeVersion() {
  try {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      const { stdout } = await execPromise(`${process.env.PUPPETEER_EXECUTABLE_PATH} --version`);
      return stdout.trim();
    }
    return "Using bundled Chromium";
  } catch (error) {
    console.error("Error getting Chrome version:", error.message);
    return "Unable to determine Chrome version";
  }
}

// Helper function to log memory usage
function logMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  console.log("MEMORY USAGE:");
  console.log(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  console.log(`  Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.log(`  Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
  console.log(`  External: ${Math.round(memoryUsage.external / 1024 / 1024)} MB`);
  console.log(`  System Total Memory: ${Math.round(os.totalmem() / 1024 / 1024)} MB`);
  console.log(`  System Free Memory: ${Math.round(os.freemem() / 1024 / 1024)} MB`);
}

export async function captureScreenshot(imageUrl, savePath) {
  console.log("=== SCREENSHOT CAPTURE STARTED ===");
  logMemoryUsage();
  
  // Log system information
  console.log("SYSTEM INFO:");
  console.log(`  Platform: ${os.platform()}`);
  console.log(`  Architecture: ${os.arch()}`);
  console.log(`  CPUs: ${os.cpus().length}`);
  
  // Get Chrome version
  const chromeVersion = await getChromeVersion();
  console.log(`Chrome Version: ${chromeVersion}`);
  console.log(`Puppeteer Path: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'Using bundled Chromium'}`);
  
  // Get BASE_URL from environment or construct it
  // In production (Render), we use the provided URL from RENDER_EXTERNAL_URL
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log("URL CONSTRUCTION:");
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL || 'not set'}`);
  console.log(`  BASE_URL env var: ${process.env.BASE_URL || 'not set'}`);
  console.log(`  PORT: ${process.env.PORT || '8000 (default)'}`);
  
  const BASE_URL = process.env.RENDER_EXTERNAL_URL || 
                   process.env.BASE_URL || 
                   `http://localhost:${process.env.PORT || 8000}`;
  
  const fullUrl = `${BASE_URL}/preview?image=${encodeURIComponent(imageUrl)}`;
  
  console.log("Environment:", isProduction ? "Production" : "Development");
  console.log("Final URL:", fullUrl);
  console.log("Image URL parameter:", imageUrl);

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
    
    console.log("Launching browser with options:", JSON.stringify(options, null, 2));
    browser = await puppeteer.launch(options);
    console.log("Browser launched successfully");
    
    // Get browser version information
    const version = await browser.version();
    console.log(`Browser version info: ${version}`);
    
    const page = await browser.newPage();
    console.log("New page created");
    
    // Enable request/response logging
    page.on('request', request => {
      console.log(`Network request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`Network response: ${response.status()} ${response.url()}`);
    });
    
    page.on('console', msg => {
      console.log('PAGE CONSOLE:', msg.text());
    });
    
    // Set a reasonable viewport
    await page.setViewport({
      width: 1280,
      height: 800
    });
    console.log("Viewport set to 1280x800");
    
    // Navigate with a longer timeout for production
    console.log(`Navigating to ${fullUrl} with timeout ${isProduction ? 90000 : 60000}ms`);
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
    console.log("Taking screenshot now...");
    await page.screenshot({ path: savePath });
    console.log(`Screenshot saved to ${savePath}`);
    
    logMemoryUsage();
    console.log("=== SCREENSHOT CAPTURE COMPLETED SUCCESSFULLY ===");
    
  } catch (err) {
    console.error("=== ERROR DURING SCREENSHOT CAPTURE ===");
    console.error(`Error message: ${err.message}`);
    console.error(`Error stack: ${err.stack}`);
    
    if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error("Network connection refused. Check if the server is accessible.");
    } else if (err.message.includes('Navigation timeout')) {
      console.error("Page load timed out. The server might be slow or unresponsive.");
    } else if (err.message.includes('Failed to launch')) {
      console.error("Failed to launch Chrome. Check Chrome installation.");
    }
    
    logMemoryUsage();
    throw err;
  } finally {
    // Ensure browser is always closed
    if (browser) {
      console.log("Closing browser");
      await browser.close();
    }
  }
}
