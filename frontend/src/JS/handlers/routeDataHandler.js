import { renderRoute, renderWeatherUI } from "./renderRouteWeatherHandler.js";
import { addPinFromName } from "../main.js";

export async function fetchRouteData(locations, map) {

    if (locations.length > 0) {
        try {
            const locData = await fetch(`http://localhost:3000/api/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations })
            });

            const routeData = await locData.json();
            const route = routeData.route;
            const coords = routeData.coordinates;
            const weather = routeData.weather;

            coords.forEach(c => addPinFromName(c.lat, c.lng));

            renderRoute(route, map);
            renderWeatherUI(weather);
            document.getElementById('weather-section').style.display = 'block';
        }
        catch(err) {
            console.log(err);
        }
    }
    else {
        alert("Please enter both a start and end location.");
        return;
    }
}