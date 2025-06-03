import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs';

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
    // Create a user data directory in /tmp for Chrome
    const userDataDir = '/tmp/puppeteer_user_data';
    try {
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true, mode: 0o777 });
        console.log(`Created user data directory at ${userDataDir}`);
      }
    } catch (error) {
      console.error(`Failed to create user data directory: ${error.message}`);
    }
    
    // Configure Puppeteer based on environment
    let options;
    
    if (isProduction) {
      // Special configuration for Render environment
      console.log("Using Render-specific Puppeteer configuration");
      
      // Check if running on Render
      const isOnRender = !!process.env.RENDER;
      console.log(`Running on Render: ${isOnRender}`);
      
      options = {
        headless: 'new',
        // Don't set executablePath on Render - let Puppeteer use its bundled Chromium
        executablePath: isOnRender ? undefined : (process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'),
        userDataDir: userDataDir,
        timeout: 180000, // 3 minutes overall timeout
        ignoreHTTPSErrors: true,
        dumpio: true, // Log stdout and stderr from the browser
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--font-render-hinting=none',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--no-zygote',
          '--headless',
          '--single-process', // Important for Render
          `--user-data-dir=${userDataDir}`,
          '--window-size=1280,800',
          '--remote-debugging-port=0',
          '--disable-web-security',
          '--allow-file-access-from-files'
        ]
      };
    } else {
      // Local development configuration
      options = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu'
        ]
      };
    }
    
    console.log("Chrome executable path check:");
    console.log(`  PUPPETEER_EXECUTABLE_PATH env: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'not set'}`);
    console.log(`  Using executable path: ${options.executablePath || 'default bundled Chromium'}`);
    
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
    console.log(`Navigating to ${fullUrl} with timeout ${isProduction ? 120000 : 60000}ms`);
    await page.goto(fullUrl, { 
      waitUntil: 'networkidle0', 
      timeout: isProduction ? 120000 : 60000 
    });
    
    console.log("Page loaded, waiting for image");
    
    // Check if we have any page errors right away
    const pageContent = await page.content();
    console.log("Initial page HTML length:", pageContent.length);
    if (pageContent.length < 100) {
      console.error("Page seems to have minimal content, might indicate an error");
    }
    
    // Wait for either success or error state
    try {
      // First check if we got an error
      const hasError = await Promise.race([
        page.waitForSelector('body[data-image-error="true"]', { timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page.waitForSelector('body[data-image-loaded="true"]', { timeout: 5000 })
          .then(() => false)
          .catch(() => false)
      ]);
      
      if (hasError) {
        console.error("Image failed to load according to page error state");
        throw new Error("Image failed to load in the preview page");
      }
      
      // Wait for the image to be fully loaded with better waiting strategy
      console.log("Waiting for image to be fully loaded...");
      
      // First wait for the image element to exist
      await page.waitForSelector('img#previewImage', { 
        visible: true, 
        timeout: isProduction ? 60000 : 30000 
      });
      
      // Then wait for the loaded attribute to be set by our JavaScript
      await page.waitForSelector('body[data-image-loaded="true"]', { 
        timeout: isProduction ? 60000 : 30000 
      });
      
      console.log("Image loaded successfully according to page state");
      
      // Get image dimensions for better viewport sizing
      const imageDimensions = await page.evaluate(() => {
        const img = document.querySelector('img#previewImage');
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: img.width,
          displayHeight: img.height
        };
      });
      
      console.log("Image dimensions:", imageDimensions);
      
      // Resize viewport to better fit the image if needed
      if (imageDimensions.naturalWidth > 0 && imageDimensions.naturalHeight > 0) {
        const viewportWidth = Math.max(imageDimensions.naturalWidth, 1280);
        const viewportHeight = Math.max(imageDimensions.naturalHeight, 800);
        
        console.log(`Resizing viewport to ${viewportWidth}x${viewportHeight}`);
        await page.setViewport({
          width: Math.min(viewportWidth, 2000),  // Cap at 2000px
          height: Math.min(viewportHeight, 2000) // Cap at 2000px
        });
      }
      
      // Add a small delay to ensure everything is rendered
      await page.waitForTimeout(1000);
      
      console.log("Taking screenshot now...");
      await page.screenshot({ 
        path: savePath,
        fullPage: true
      });
      console.log(`Screenshot saved to ${savePath}`);
    } catch (err) {
      console.error("Error while waiting for image:", err.message);
      
      // Take a screenshot anyway to help with debugging
      console.log("Taking debug screenshot despite error...");
      await page.screenshot({ 
        path: savePath + '.error.png',
        fullPage: true
      });
      
      // Get page HTML for debugging
      const html = await page.content();
      console.log("Page HTML at time of error (first 500 chars):", html.substring(0, 500));
      
      // Re-throw the error
      throw err;
    }
    
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
