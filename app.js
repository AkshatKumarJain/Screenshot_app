import express from 'express';
import path from 'path';
import 'dotenv/config.js';
import { __dirname } from './utils/pathHelper.util.js';
import fs from 'fs';
import os from 'os';
import puppeteer from 'puppeteer';

import uploadRoute from './routes/upload.route.js';
import screenshotRoute from './routes/screenshot.route.js';

// Create middleware for request logging
const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

const app = express();

// Add request logging middleware
app.use(requestLogger);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug route to test Puppeteer and Chrome - register before other routes
app.get('/debug', async (req, res) => {
  console.log('=== DEBUG ROUTE ACCESSED ===');
  
  // Build a response object to collect diagnostic information
  const diagnostics = {
    timestamp: new Date().toISOString(),
    system: {},
    chrome: {},
    environment: {},
    tests: [],
    errors: []
  };
  
  // Set response timeout
  res.setTimeout(120000); // 2 minute timeout
  
  // Log and collect system info
  try {
    console.log('System information:');
    diagnostics.system.platform = os.platform();
    diagnostics.system.architecture = os.arch();
    diagnostics.system.cpus = os.cpus().length;
    diagnostics.system.totalMemory = `${Math.round(os.totalmem() / 1024 / 1024)} MB`;
    diagnostics.system.freeMemory = `${Math.round(os.freemem() / 1024 / 1024)} MB`;
    
    // Log process info
    const memoryUsage = process.memoryUsage();
    diagnostics.system.processMemory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    };
    
    console.log(`Platform: ${diagnostics.system.platform}`);
    console.log(`Architecture: ${diagnostics.system.architecture}`);
    console.log(`CPUs: ${diagnostics.system.cpus}`);
    console.log(`Memory: ${diagnostics.system.totalMemory} total, ${diagnostics.system.freeMemory} free`);
    
    // Check environment variables
    diagnostics.environment.NODE_ENV = process.env.NODE_ENV || 'not set';
    diagnostics.environment.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'not set';
    diagnostics.environment.CHROME_PATH = process.env.CHROME_PATH || 'not set';
    
    console.log('Environment variables:');
    console.log(`NODE_ENV: ${diagnostics.environment.NODE_ENV}`);
    console.log(`PUPPETEER_EXECUTABLE_PATH: ${diagnostics.environment.PUPPETEER_EXECUTABLE_PATH}`);
    console.log(`CHROME_PATH: ${diagnostics.environment.CHROME_PATH}`);
    
    // Test 1: Check if Chrome executable exists
    diagnostics.tests.push({ name: "Chrome executable check", status: "running" });
    console.log('Checking Chrome executable...');
    
    // Check for Chrome in multiple possible locations
    const possibleChromePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ].filter(Boolean); // Remove undefined values
    
    diagnostics.chrome.possiblePaths = possibleChromePaths;
    console.log("Checking for Chrome in these locations:", possibleChromePaths);
    
    let execPath = null;
    let chromeVersion = null;
    
    try {
      const { execSync } = require('child_process');
      const { existsSync } = require('fs');
      
      // Try each possible path
      for (const path of possibleChromePaths) {
        try {
          if (existsSync(path)) {
            console.log(`Chrome found at: ${path}`);
            execPath = path;
            chromeVersion = execSync(`${path} --version`).toString().trim();
            console.log(`Chrome version: ${chromeVersion}`);
            break;
          }
        } catch (err) {
          console.log(`Failed to check ${path}: ${err.message}`);
        }
      }
      
      if (execPath) {
        diagnostics.chrome.version = chromeVersion;
        diagnostics.chrome.path = execPath;
        diagnostics.tests[0].status = "success";
        diagnostics.tests[0].result = chromeVersion;
      } else {
        // Try using puppeteer's own mechanism
        console.log("No Chrome found in standard locations. Trying puppeteer's mechanism...");
        diagnostics.tests[0].status = "warning";
        diagnostics.tests[0].result = "No Chrome found in standard locations. Will try puppeteer's mechanism.";
      }
    } catch (error) {
      console.error(`Error checking Chrome version: ${error.message}`);
      diagnostics.tests[0].status = "failed";
      diagnostics.tests[0].error = error.message;
      diagnostics.errors.push({
        stage: "Chrome executable check",
        error: error.message
      });
    }
    
    // Test 2: Try to launch browser without page creation
    diagnostics.tests.push({ name: "Browser launch test", status: "running" });
    console.log('Attempting to launch browser...');
    
    try {
      // Use puppeteer.connect with browserWSEndpoint if on Render
      const isOnRender = process.env.RENDER === 'true';
      console.log(`Running on Render: ${isOnRender}`);
      
      const minimalOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--single-process'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        channel: 'chrome'
      };
      
      // Only set executablePath if we found a valid Chrome
      if (execPath) {
        minimalOptions.executablePath = execPath;
      }
      
      console.log(`Launch options: ${JSON.stringify(minimalOptions, null, 2)}`);
      
      const browser = await puppeteer.launch(minimalOptions);
      const version = await browser.version();
      console.log(`Browser launched successfully. Version: ${version}`);
      
      diagnostics.chrome.browserVersion = version;
      diagnostics.tests[1].status = "success";
      diagnostics.tests[1].result = version;
      
      await browser.close();
      console.log('Browser closed successfully');
    } catch (error) {
      console.error(`Error launching browser: ${error.message}`);
      diagnostics.tests[1].status = "failed";
      diagnostics.tests[1].error = error.message;
      diagnostics.errors.push({
        stage: "Browser launch",
        error: error.message,
        stack: error.stack
      });
    }
    
    // Send diagnostic information
    if (diagnostics.errors.length > 0) {
      res.status(500).json(diagnostics);
    } else {
      res.status(200).json(diagnostics);
    }
  } catch (error) {
    console.error('=== DEBUG ROUTE ERROR ===');
    console.error(error);
    
    diagnostics.errors.push({
      stage: "Overall diagnostics",
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json(diagnostics);
  }
});

// Register other routes AFTER debug route
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/preview', (req, res) => {
  const imageUrl = req.query.image;
  res.render('image_view', { imageUrl });
});

app.use('/upload', uploadRoute);
app.use('/screenshot', screenshotRoute);

// Add a 404 handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).send('404 - Not Found');
});

// Add an error handler
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).send(`Server Error: ${err.message}`);
});

// Start server with error handling
const server = app.listen(process.env.PORT || 8000, () => {
  console.log(`The server is running at port:${process.env.PORT || 8000}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
