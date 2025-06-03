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
  
  // Set response timeout
  res.setTimeout(120000); // 2 minute timeout
  
  // Log system info
  console.log('System information:');
  console.log(`  Platform: ${os.platform()}`);
  console.log(`  Architecture: ${os.arch()}`);
  console.log(`  CPUs: ${os.cpus().length}`);
  console.log(`  Memory: ${Math.round(os.totalmem() / 1024 / 1024)} MB total, ${Math.round(os.freemem() / 1024 / 1024)} MB free`);
  
  // Log process info
  const memoryUsage = process.memoryUsage();
  console.log('Process memory usage:');
  console.log(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  console.log(`  Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.log(`  Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
  
  try {
    console.log('Puppeteer imported successfully');
    
    // Create test HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Debug Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
          .container { background: white; padding: 20px; border-radius: 5px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Puppeteer Debug Test</h1>
          <p>Current time: ${new Date().toISOString()}</p>
          <p>This is a test page for Puppeteer screenshot functionality.</p>
        </div>
      </body>
      </html>
    `;
    
    // Set up a simple file path for the screenshot
    const fs = await import('fs');
    const path = await import('path');
    const tmpDir = '/tmp';
    const screenshotPath = path.join(tmpDir, `debug-screenshot-${Date.now()}.png`);
    
    // Ensure tmp directory exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    console.log(`Creating screenshot at: ${screenshotPath}`);
    
    // Basic browser configuration for debugging
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
    
    console.log('Browser launched successfully');
    console.log(`Browser version: ${await browser.version()}`);
    
    // Create a new page and set content
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    console.log('Page content set successfully');
    
    // Take a screenshot
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot captured successfully');
    
    // Close the browser
    await browser.close();
    console.log('Browser closed successfully');
    
    // Check if the screenshot was created
    if (fs.existsSync(screenshotPath)) {
      // Send the screenshot back to the client
      res.sendFile(screenshotPath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Clean up the screenshot file
        fs.unlink(screenshotPath, () => {});
      });
    } else {
      res.status(500).send('Failed to create screenshot');
    }
  } catch (error) {
    console.error('=== DEBUG ROUTE ERROR ===');
    console.error(error);
    res.status(500).send(`Debug Error: ${error.message}\n\nStack: ${error.stack}`);
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
