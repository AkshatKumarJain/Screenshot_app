import path from 'path';
import fs from 'fs';
import { __dirname } from '../utils/pathHelper.util.js';
import { captureScreenshot } from '../services/screenShot.service.js';

export async function handleScreenshot(req, res) {
  const imageUrl = req.app.locals.imageUrl;

  if (!imageUrl) {
    return res.status(400).send("No image uploaded.");
  }

  const screenshotPath = path.join(__dirname, 'uploads', 'screenshot.png');

  try {
    await captureScreenshot(imageUrl, screenshotPath);
    res.download(screenshotPath, 'image-screenshot.png', () => {
      fs.unlink(screenshotPath, () => {});
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to take screenshot');
  }
}
