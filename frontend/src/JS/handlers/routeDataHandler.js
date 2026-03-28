import { renderRoute, renderWeatherUI } from "./renderRouteWeatherHandler.js";
import { addPinFromName, addSampledWaypoint, addEndpointPin } from "../main.js";

const API_URL = (import.meta.env.VITE_API_URL || '').trim();
const ROUTE_ENDPOINT = API_URL ? `${API_URL}/api/route` : '/api/route';

export async function fetchRouteData(locations, map) {
    const DEFAULT_ROUTE_ERROR = "Could not generate a valid route for those points. Please try different locations.";

    if (locations.length > 0) {
        try {
            const locData = await fetch(ROUTE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations })
            });

            let routeData = {};

            try {
                routeData = await locData.json();
            } catch {
                routeData = {};
            }

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
            const interiorWeather = weather.slice(1, -1);

            coords.forEach((c, index) => {
                if (index === 0) {
                    addEndpointPin(c.lat, c.lng, 'origin');
                } else if (index === coords.length - 1) {
                    addEndpointPin(c.lat, c.lng, 'destination');
                } else {
                    addPinFromName(c.lat, c.lng);
                }
            });
            sampledCoords.forEach((c, index) => {
                const waypointLocationName = interiorWeather[index]?.name;
                addSampledWaypoint(c.lat, c.lng, index + 1, waypointLocationName);
            });

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