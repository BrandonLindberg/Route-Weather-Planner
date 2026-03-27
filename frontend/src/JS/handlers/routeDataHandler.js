import { renderRoute, renderWeatherUI } from "./renderRouteWeatherHandler.js";
import { addPinFromName } from "../main.js";

export async function fetchRouteData(locations, map) {
    const DEFAULT_ROUTE_ERROR = "Could not generate a valid route for those points. Please try different locations.";

    if (locations.length > 0) {
        try {
            const locData = await fetch(`http://localhost:4010/api/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations })
            });

            const routeData = await locData.json();

            if (!locData.ok) {
                throw new Error(routeData?.error || DEFAULT_ROUTE_ERROR);
            }

            if (!routeData?.route || !Array.isArray(routeData.coordinates) || !Array.isArray(routeData.weather)) {
                throw new Error(DEFAULT_ROUTE_ERROR);
            }

            const route = routeData.route;
            const coords = routeData.coordinates;
            const sampledCoords = routeData.sampledCoordinates ?? [];
            const weather = routeData.weather;

            coords.forEach(c => addPinFromName(c.lat, c.lng));
            sampledCoords.forEach(c => addPinFromName(c.lat, c.lng));

            renderRoute(route, map);
            renderWeatherUI(weather);
            document.getElementById('weather-section').style.display = 'block';
        }
        catch(err) {
            console.log(err);
            alert(err?.message || DEFAULT_ROUTE_ERROR);
        }
    }
    else {
        alert("Please enter both a start and end location.");
        return;
    }
}