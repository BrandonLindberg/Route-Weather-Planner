import express from "express";
const router = express.Router();

import normalizeLocations from "../services/normalizeService.js";
import getRoute from "../services/routeService.js";
import getWeather from "../services/weatherService.js";
import { generateSafetyReview } from "../services/aiService.js";
import sampleRoutePoints from "../services/sampleRoutePoints.js";

router.post("/route", async (req, res) => {
    const { locations } = req.body;

    try {
        const coords = await normalizeLocations(locations);
        const route = await getRoute(coords);

        // OSRM returns leg durations in seconds. 
        // --- ETA CALCULATION WITH LOGS ---
        let currentTimeSeconds = Math.floor(Date.now() / 1000);
        const etas = [currentTimeSeconds]; 
        console.log(`\n=== ROUTE CALCULATION ===`);
        console.log(`Start Time (UTC): ${new Date(currentTimeSeconds * 1000).toISOString()}`);

        if (route.legs) {
            route.legs.forEach((leg, index) => {
                const adjustedDuration = leg.duration * 0.85; //  REMOVE THIS LINE OF CODE LATER // Apply 15% reduction for real-world conditions
                // leg.duration is in seconds
                const travelMinutes = Math.round(adjustedDuration / 60);
                const travelHours = (travelMinutes / 60).toFixed(1);
                
                currentTimeSeconds += adjustedDuration; 
                etas.push(currentTimeSeconds);      
                
                console.log(`Leg ${index + 1}: Drive time is ${travelHours} hours (${travelMinutes} mins).`);
                console.log(`Waypoint ${index + 2} ETA (UTC): ${new Date(currentTimeSeconds * 1000).toISOString()}`);
            });
        }
        console.log(`=========================\n`);
        // ---------------------------------

        // Pass both coords and etas array to the weather service
        const { coords: sampledCoords, etas: sampledEtas } = sampleRoutePoints(
            route.geometry.coordinates,
            etas,
            5  // number of weather points — tune this as needed
        );
        const weather = await getWeather(sampledCoords, sampledEtas);

        res.json({
            coordinates: coords,
            route,
            weather
        });

        

    } catch (err) {
        console.error("Route generation error:", err);
        res.status(500).json({ error: "Failed to generate route data." });
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