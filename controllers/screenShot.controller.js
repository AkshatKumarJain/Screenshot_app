import path from 'path';
import fs from 'fs';
import { __dirname } from '../utils/pathHelper.util.js';
import { captureScreenshot } from '../services/screenShot.service.js';

export async function handleScreenshot(req, res) {
  const imageUrl = req.app.locals.imageUrl;

  if (!imageUrl) {
    console.error("Screenshot request failed: No imageUrl found in app.locals");
    return res.status(400).send('No image uploaded.');
  }

  const screenshotPath = path.join(__dirname, 'uploads', 'screenshot.png');

  try {
    // Log for debugging
    console.log("Taking screenshot of:", imageUrl);

    await captureScreenshot(imageUrl, screenshotPath);

    res.download(screenshotPath, 'image-screenshot.png', (err) => {
      if (err) {
        console.error("Download failed:", err);
      }
      // Clean up temp file
      fs.unlink(screenshotPath, () => {});
    });
  } catch (err) {
    console.error("Screenshot capture failed:", err.message);
    res.status(500).send('Failed to take screenshot');
  }
}
