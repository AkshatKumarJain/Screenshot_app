import express from 'express';
import { handleScreenshot } from '../controllers/screenShot.controller.js';

const router = express.Router();
router.get('/', handleScreenshot);

export default router;
