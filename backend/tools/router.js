import express from "express";
const router = express.Router();

import normalizeLocations from "../services/normalizeService.js";
import getRoute from "../services/routeService.js";
import getWeather from "../services/weatherService.js";
import { generateSafetyReview } from "../services/aiService.js";

router.post("/route", async (req, res) => {
    const { locations } = req.body;

    try {
        const coords = await normalizeLocations(locations);
        const route = await getRoute(coords);
        const weather = await getWeather(coords);

        res.json ({
            coordinates: coords,
            route,
            weather
        })

    } catch (err) {

    }
});

// The AI Review Route
router.post('/review', async (req, res) => {
    console.log("Review route hit!");
    try {
        const { startCoords, endCoords, midCoords } = req.body;

        // Validation
        if (!startCoords || !endCoords) {
            return res.status(400).json({ error: "Missing start or end coordinates" });
        }

        // Call the service
        const reviewText = await generateSafetyReview(startCoords, endCoords, midCoords);

        // Send response
        res.json({ review: reviewText });
        console.log("Review generated successfully!");

    } catch (error) {
        // Handle errors
        res.status(500).json({ error: "Failed to generate review." });
    }
});

export default router;