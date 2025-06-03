import express from 'express';
import multer from 'multer';
import path from 'path';
import { __dirname } from '../utils/pathHelper.util.js';

const router = express.Router();
const uploadPath = path.join(__dirname, 'uploads');

const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => cb(null, 'uploaded.png'),
});

const upload = multer({ storage });

router.post('/', upload.single('image'), (req, res) => {
  const imageUrl = `/uploads/${req.file.filename}`;
  req.app.locals.imageUrl = imageUrl; // Store in app.locals
  res.redirect(`/preview?image=${encodeURIComponent(imageUrl)}`);
});

export default router;
