import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import router from "./tools/router.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend/dist'));

// Security Headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline';");
    next();
})

app.use("/api", router);

// Start Server
app.listen(4010, () => console.log('App is active on port 4010'));