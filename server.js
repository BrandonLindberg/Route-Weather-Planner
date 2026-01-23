const express = require('express');
const cors = require('cors');
const app = express();
// require("dotenv").config();

app.use(express.static('public'));
// app.use(cors());

// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline';");
//     next();
// })

// const geoKey = process.env.MAPBOX_DEV_KEY;
// const apiKey = process.env.OPENWEATHER_API_KEY;

// app.get("/api/weather", async (req, res) => {

app.listen(3000, () => console.log('App is active on port 3000'));