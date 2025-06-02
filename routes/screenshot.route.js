import express from 'express';
import { handleScreenshot } from '../controllers/screenshotController.js';

const router = express.Router();
router.get('/', handleScreenshot);

export default router;
