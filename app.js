import express from 'express';
import path from 'path';
import 'dotenv/config.js';
import { __dirname } from './utils/pathHelper.util.js';

import uploadRoute from './routes/upload.route.js';
import screenshotRoute from './routes/screenshot.route.js';

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/preview', (req, res) => {
  const imageUrl = req.query.image;
  res.render('image_view', { imageUrl });
});

app.use('/upload', uploadRoute);
app.use('/screenshot', screenshotRoute);

app.listen(process.env.PORT, () => {
  console.log(`The server is running at port:${process.env.PORT}`);
});
