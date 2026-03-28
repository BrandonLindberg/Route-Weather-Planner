import express from "express";
const router = express.Router();

import normalizeLocations from "../services/normalizeService.js";
import getRoute from "../services/routeService.js";
import getWeather from "../services/weatherService.js";
import { generateSafetyReview } from "../services/aiService.js";
import sampleRoutePoints from "../services/sampleRoutePoints.js";

function getTotalSampleCount(distanceMeters) {
    const MIN_INTERIOR_POINTS = 1;
    const MAX_INTERIOR_POINTS = 18;
    const METERS_PER_INTERIOR_POINT = 75000;

    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
        return MIN_INTERIOR_POINTS + 2;
    }

    const interiorPoints = Math.ceil(distanceMeters / METERS_PER_INTERIOR_POINT);
    const clampedInteriorPoints = Math.min(
        MAX_INTERIOR_POINTS,
        Math.max(MIN_INTERIOR_POINTS, interiorPoints)
    );

    // sampleRoutePoints expects total points including origin/destination.
    return clampedInteriorPoints + 2;
}

router.post("/route", async (req, res) => {
    const { locations } = req.body;

    // FIX: Add early validation. If there are no locations, return a 400 Bad Request.
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: "Missing or invalid locations array." });
    }

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
        const totalSampleCount = getTotalSampleCount(route.distance);

        const { coords: sampledCoords, etas: sampledEtas } = sampleRoutePoints(
            route.geometry.coordinates,
            etas,
            totalSampleCount
        );
        const weather = await getWeather(sampledCoords, sampledEtas);

        res.json({
            coordinates: coords,
            sampledCoordinates: sampledCoords.slice(1, -1),
            route,
            weather
        });

        

    } catch (err) {
        console.error("Route generation error:", err);

        const statusCode = Number.isInteger(err?.status) ? err.status : 500;
        const message = statusCode === 500
            ? "Failed to generate route data."
            : (err?.message || "Failed to generate route data.");

        res.status(statusCode).json({ error: message });
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