import path from 'path';
import fs from 'fs';
import os from 'os';
import { __dirname } from '../utils/pathHelper.util.js';
import { captureScreenshot } from '../services/screenShot.service.js';

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Helper function to check directory permissions
function checkDirectoryPermissions(dirPath) {
  try {
    // Try creating a test file
    const testFile = path.join(dirPath, `.permissions-test-${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`Directory ${dirPath} is writable`);
    return true;
  } catch (error) {
    console.error(`Directory ${dirPath} is not writable:`, error.message);
    return false;
  }
}

// Ensure uploads directory exists with proper permissions
function ensureDirectoryExists(dirPath) {
  console.log(`Checking if directory exists: ${dirPath}`);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    try {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o777 });
      console.log(`Successfully created directory: ${dirPath}`);
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error.message);
      return false;
    }
  }
  
  return checkDirectoryPermissions(dirPath);
}

// Get appropriate uploads directory based on environment
function getUploadsDirectory() {
  // In production, use /tmp directory for better permissions
  if (isProduction) {
    const tmpDir = path.resolve(os.tmpdir(), 'screenshot-app-uploads');
    console.log(`Using temp directory for production: ${tmpDir}`);
    return tmpDir;
  }
  
  // In development, use project's uploads directory
  const projectUploads = path.resolve(__dirname, 'uploads');
  console.log(`Using project directory for development: ${projectUploads}`);
  return projectUploads;
}

export async function handleScreenshot(req, res) {
  console.log("Screenshot request received with query params:", req.query);
  console.log("Current working directory:", process.cwd());
  console.log("__dirname value:", __dirname);
  
  // Get image URL from query parameter (from form) or from app.locals
  const imageUrl = req.query.image || req.app.locals.imageUrl;

  if (!imageUrl) {
    console.error("Screenshot request failed: No image URL found in request or app.locals");
    return res.status(400).send('No image URL provided. Please upload an image first.');
  }

  // Get appropriate uploads directory and ensure it exists
  const uploadsDir = getUploadsDirectory();
  const directoryOK = ensureDirectoryExists(uploadsDir);
  
  if (!directoryOK) {
    console.error("Failed to create or access uploads directory");
    return res.status(500).send('Server error: Could not access uploads directory');
  }
  
  // Generate a unique filename with timestamp
  const timestamp = new Date().getTime();
  const screenshotPath = path.resolve(uploadsDir, `screenshot-${timestamp}.png`);

  console.log("Environment:", isProduction ? "Production" : "Development");
  console.log("Screenshot directory (absolute path):", uploadsDir);
  console.log("Screenshot will be saved to (absolute path):", screenshotPath);

  try {
    // Log the image URL we're going to screenshot
    console.log("Taking screenshot of URL:", imageUrl);

    // Capture the screenshot
    await captureScreenshot(imageUrl, screenshotPath);
    
    // Verify file exists before sending
    if (!fs.existsSync(screenshotPath)) {
      throw new Error(`Screenshot file was not created at ${screenshotPath}`);
    }
    
    console.log("Screenshot captured successfully, sending file to client");
    
    // Send the file to the client
    res.download(screenshotPath, `image-screenshot-${timestamp}.png`, (err) => {
      if (err) {
        console.error("Download failed:", err);
        // Only attempt cleanup if there was no download error
        return;
      }
      
      // Clean up temp file after successful download
      console.log("Download complete, cleaning up file:", screenshotPath);
      fs.unlink(screenshotPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Failed to clean up screenshot file:", unlinkErr);
        }
      });
    });
  } catch (err) {
    console.error("Screenshot capture failed with error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).send(`Failed to take screenshot: ${err.message}`);
  }
}
