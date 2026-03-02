// TODO: Get predictive weather/temperature for each pin/waypoint and display it in the marker popup. We can use the OpenWeather API's "One Call" endpoint to get current weather and forecasts for each location. This would give users a better idea of what weather to expect at each point along their route, which could be especially helpful for longer trips with multiple stops. For the MVP, we'll just fetch the current weather for each pin when it's added to the map, but we could easily expand this in the future to include forecasts or even historical weather data for those interested in seeing typical conditions for their route.
// TODO: We could get emergency alerts for each pin/waypoint and display them in the marker popup as well. This would be especially useful for users planning a trip through areas prone to severe weather or other hazards. We can use the OpenWeather API's "Alerts" endpoint to get any active alerts for each location and display them prominently in the popup. For the MVP, we'll focus on just fetching and displaying the current weather, but adding alerts would be a valuable enhancement for future iterations.
// Updated to accept the new 'etas' array
async function getWeather(coords, etas) {
    return Promise.all(coords.map(async (c, i) => {
        const targetUnixTime = etas[i];
        
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${c.lat}&lon=${c.lng}&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`);
        const data = await response.json();

        // Safety check
        if (!data.list) return null;

        // Find the forecast block closest to our target ETA
        let closestForecast = data.list[0];
        let minDiff = Math.abs(closestForecast.dt - targetUnixTime);

        for (const forecast of data.list) {
            const diff = Math.abs(forecast.dt - targetUnixTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestForecast = forecast;
            }
        }

        // Return a custom object structured for our frontend needs
        console.log(`[Weather] Waypoint ${i + 1} | Exact ETA: ${new Date(targetUnixTime * 1000).toLocaleString()} | API Matched: ${new Date(closestForecast.dt * 1000).toLocaleString()}`);

        return {
            name: data.city ? data.city.name : "Waypoint",
            main: closestForecast.main,
            weather: closestForecast.weather,
            eta_timestamp: targetUnixTime, 
            timezone_offset: data.city ? data.city.timezone : 0 
        };
    }));
}

export default getWeather;