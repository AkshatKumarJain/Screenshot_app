import express from 'express';
import path from 'path';
import { __dirname } from './utils/pathHelper.js';

import uploadRoute from './routes/upload.js';
import screenshotRoute from './routes/screenshot.js';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/preview', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'image-viewer.html'));
});

app.use('/upload', uploadRoute);
app.use('/screenshot', screenshotRoute);

app.listen(process.env.PORT, () => {
  console.log(`✅ App running at port:${process.env.PORT}`);
});
