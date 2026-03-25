import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import router from "./tools/router.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Security Headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://tilecache.rainviewer.com; " +
        "connect-src 'self' https://api.rainviewer.com;"
    );
    next();
})

app.use(express.static('../frontend/dist'));
app.use("/api", router);

// Only start the server if Vitest isn't running it
if (process.env.NODE_ENV !== 'test') {
    app.listen(4010, () => console.log('App is active on port 4010'));
}

export default app;