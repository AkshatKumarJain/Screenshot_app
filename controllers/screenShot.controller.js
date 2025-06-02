import path from 'path';
import fs from 'fs';
import { __dirname } from '../utils/pathHelper.js';
import { captureScreenshot } from '../services/screenshotService.js';

// A function to handle screenshots.
export async function handleScreenshot(req, res) {
  const screenshotPath = path.join(__dirname, '..', 'tmp', 'screenshot.png');
  const imagePageUrl = 'http://localhost:8000/preview';

  try {
    await captureScreenshot(imagePageUrl, screenshotPath);
    res.download(screenshotPath, 'image-screenshot.png', () => {
      fs.unlink(screenshotPath, () => {});
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to take screenshot');
  }
}
