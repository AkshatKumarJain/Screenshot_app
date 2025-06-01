import express from "express";
import "dotenv/config.js"

const app = express();

app.set("view engine", "ejs");
app.set('views', './views');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("index");
});

app.listen(process.env.PORT || 8000, (err) => {
    console.log(`The server is running at port: ${process.env.PORT}.`);
});