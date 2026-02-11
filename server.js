require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline';");
    next();
})

const geoKey = process.env.MAPBOX_DEV_KEY;
const apiKey = process.env.OPENWEATHER_API_KEY;


// --- AI CONFIGURATION ---
// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// THE WEATHER ROUTE
app.get("/api/weather", async (req, res) => {
    const { lat, lng } = req.query; // Get lat/lng from the URL

    // Access the key from .env
    if (!apiKey) {
        return res.status(500).json({ error: "Server missing API Key" });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // Pass the weather data back to the frontend
        res.json(data);
    } catch (error) {
        console.error("Weather Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
});

// AI Review Route
app.post('/api/review', async (req, res) => {
    try {
        // We expect the frontend to send coordinates
        const { startCoords, endCoords } = req.body;

        const prompt = `
            I am planning a road trip.
            Start Coordinates: ${startCoords}
            End Coordinates: ${endCoords}
            
            Please provide a short "Safety Review" for a trip between these two rough locations. 
            Assumption: Assume typical weather for this region.
            Include:
            1. A safety rating (Low/Medium/High Risk).
            2. Any major terrain challenges (mountains, deserts, etc).
            3. A fun fact about the destination area.
            Keep it under 100 words.
            Do NOT use bullet points, numbered lists, bold text for emphasis, italics, or headers/titles (H1, H2, etc.).
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ review: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to generate review." });
    }
});

// Start Server
app.listen(3000, () => console.log('App is active on port 3000'));