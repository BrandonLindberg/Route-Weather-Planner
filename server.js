require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

const apiKey = process.env.OPENWEATHER_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline';");
    next();
})

app.post("/api/route", async (req, res) => {
    const { locations } = req.body;

    try {
        const locData = await Promise.all(
            locations.map(async (l) => {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(l)}`
                );
                return response.json();
            })
        );

        const coords = locData.map(array => {
            return { lat: parseFloat(array[0].lat), lng: parseFloat(array[0].lon) };
        });

        const coordString = coords.map(c => `${c.lng},${c.lat}`).join(';');
        const routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`);

        if (!routeResponse.ok) {
            const text = await routeResponse.text();
            console.error('OSRM error:', text);
            return res.status(routeResponse.status).json({ error: 'Routing failed' });
        }

        const routeData = await routeResponse.json();

        const weatherData = await Promise.all(coords.map(async (c) => {
            const weatherResults = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${c.lat}&lon=${c.lng}&units=imperial&exclude=minutely&appid=${apiKey}`);
            return weatherResults.json();
        }))

        res.json({
            route: routeData.routes[0],
            coordinates: coords,
            weather: weatherData
        });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
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