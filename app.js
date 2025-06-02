import express from "express";
import "dotenv/config.js"
import puppeteer from "puppeteer";
import path from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("view engine", "ejs");
app.set('views', './views');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

  app.get("/screenshot", async (req, res) => {
  const url = req.query.url || "https://google.com";
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const screenshotPath = path.join(__dirname, "/public/screenshot.png");
  await page.screenshot({ path: screenshotPath });
  await browser.close();

  res.status(201).sendFile(screenshotPath);
});

app.listen(process.env.PORT || 8000, (err) => {
    console.log(`The server is running at port: ${process.env.PORT}.`);
});