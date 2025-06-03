#!/usr/bin/env node

/**
 * Test script to verify Puppeteer and Chrome setup
 * Run with: node test-puppeteer.js
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get current file directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const TEST_OUTPUT_DIR = path.join(__dirname, 'tmp');
const SCREENSHOT_PATH = path.join(TEST_OUTPUT_DIR, 'test-screenshot.png');
const HTML_PATH = path.join(TEST_OUTPUT_DIR, 'test-page.html');

// Create a simple test HTML page
const TEST_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Puppeteer Test Page</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    .container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    h1 { color: #333; }
    p { color: #666; }
    .timestamp { font-size: 0.8em; color: #999; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Puppeteer Test Successful! 🎉</h1>
    <p>If you can see this screenshot, Chrome and Puppeteer are working correctly.</p>
    <p class="timestamp">Generated: ${new Date().toISOString()}</p>
  </div>
</body>
</html>
`;

async function cleanup() {
  try {
    // Check if the file exists before attempting to delete
    await fs.access(SCREENSHOT_PATH).catch(() => {});
    await fs.unlink(SCREENSHOT_PATH).catch(() => {});
    
    await fs.access(HTML_PATH).catch(() => {});
    await fs.unlink(HTML_PATH).catch(() => {});
    
    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }
}

async function setupTestDirectory() {
  try {
    // Create test directory if it doesn't exist
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    console.log(`✅ Test directory created: ${TEST_OUTPUT_DIR}`);
    
    // Write test HTML file
    await fs.writeFile(HTML_PATH, TEST_HTML);
    console.log(`✅ Test HTML page created: ${HTML_PATH}`);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

async function printSystemInfo() {
  console.log('\n----- SYSTEM INFORMATION -----');
  console.log(`Platform: ${os.platform()}`);
  console.log(`Architecture: ${os.arch()}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Total Memory: ${Math.round(os.totalmem() / (1024 * 1024))} MB`);
  console.log(`Free Memory: ${Math.round(os.freemem() / (1024 * 1024))} MB`);
  
  console.log('\n----- ENVIRONMENT VARIABLES -----');
  const relevantVars = [
    'PUPPETEER_EXECUTABLE_PATH',
    'CHROME_PATH',
    'PUPPETEER_CACHE_DIR',
    'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD',
    'PUPPETEER_SKIP_DOWNLOAD',
    'PUPPETEER_NO_SANDBOX'
  ];
  
  relevantVars.forEach(varName => {
    console.log(`${varName}: ${process.env[varName] || '(not set)'}`);
  });
  console.log('----------------------------------\n');
}

async function main() {
  console.log('🚀 Starting Puppeteer/Chrome test...');
  let browser = null;
  
  try {
    await printSystemInfo();
    await setupTestDirectory();
    
    console.log('📊 Attempting to launch browser...');
    
    // Configure browser launch options
    const options = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
    
    // Add executable path if set in environment
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`🔍 Using Chrome at: ${options.executablePath}`);
    } else {
      console.log('🔍 Using default Chrome (no PUPPETEER_EXECUTABLE_PATH set)');
    }
    
    // Launch browser
    browser = await puppeteer.launch(options);
    const version = await browser.version();
    console.log(`✅ Browser launched successfully! Version: ${version}`);
    
    // Open a new page
    const page = await browser.newPage();
    console.log('✅ New page created');
    
    // Navigate to the test HTML file
    const htmlUrl = `file://${HTML_PATH}`;
    console.log(`🌐 Navigating to: ${htmlUrl}`);
    await page.goto(htmlUrl);
    console.log('✅ Navigation successful');
    
    // Take a screenshot
    console.log(`📸 Taking screenshot: ${SCREENSHOT_PATH}`);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log('✅ Screenshot saved');
    
    // Verify screenshot was created
    const stats = await fs.stat(SCREENSHOT_PATH);
    console.log(`✅ Screenshot verified (${stats.size} bytes)`);
    
    console.log('\n🎉 TEST PASSED! Chrome and Puppeteer are working correctly.');
    console.log(`📁 Check the screenshot at: ${SCREENSHOT_PATH}`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error details:', error);
    
    // Try to get additional Chrome information if available
    try {
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        console.log(`\nAttempting to check Chrome executable at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
        const { execSync } = await import('child_process');
        try {
          const chromeVersionOutput = execSync(`"${process.env.PUPPETEER_EXECUTABLE_PATH}" --version`).toString();
          console.log('Chrome version output:', chromeVersionOutput);
        } catch (e) {
          console.log('Failed to get Chrome version:', e.message);
        }
      }
    } catch (e) {
      console.log('Failed to run additional diagnostics:', e.message);
    }
    
    process.exit(1);
  } finally {
    // Close the browser
    if (browser) {
      console.log('🧹 Closing browser...');
      await browser.close();
      console.log('✅ Browser closed');
    }
    
    // Cleanup if not in debug mode
    if (!process.env.DEBUG) {
      console.log('🧹 Cleaning up test files...');
      await cleanup();
    } else {
      console.log('🔍 Debug mode: Skipping cleanup');
    }
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});

