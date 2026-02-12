import express from "express";
const router = express.Router();

import normalizeLocations from "../services/normalizeService.js";
import getRoute from "../services/routeService.js";
import getWeather from "../services/weatherService.js";

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

export default router;