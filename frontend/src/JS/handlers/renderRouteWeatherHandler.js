const locationList = document.getElementById('pin-list');
let routeLayer = null;

export function renderWeatherUI(weatherData) {
    locationList.innerHTML = "";
    
    console.log("=== WEATHER RENDER CALCULATION ===");

    weatherData.forEach((item, index) => {
        const isOrigin = index === 0;
        const isDestination = index === weatherData.length - 1;
        const temp = Math.round(item.main.temp);
        const desc = item.weather[0].description;
        const iconCode = item.weather[0].icon;
        
        // Log the base data
        console.log(`\nLocation: ${item.name}`);
        console.log(`Raw ETA Timestamp: ${item.eta_timestamp}`);
        
        // Offset is in hours
        const offsetHours = item.timezone_offset / 3600;
        console.log(`Timezone Offset: ${offsetHours} hours from UTC`);

        // Shift the time and format it
        const shiftedTime = (item.eta_timestamp + item.timezone_offset) * 1000;
        const localDate = new Date(shiftedTime);
        
        const timeString = localDate.toLocaleTimeString([], { 
            timeZone: 'UTC', // Forces the browser not to apply your local timezone on top of it
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const tzAbbr = getTimezoneAbbr(item.timezone_offset);

        console.log(`Final Displayed Time: ${timeString}`);
        
        const timeLabel = isOrigin ? "Current Time" : `ETA: ${timeString} ${tzAbbr}`;
        const pointRole = isOrigin
            ? "Origin"
            : isDestination
                ? "Destination"
                : `Waypoint ${index}`;
        
        // Build the UI
        const li = document.createElement('li');
        li.className = 'pin-item';
        li.innerHTML = `
            <div class="pin-main">
                <div class="pin-meta-row">
                    <span class="pin-role ${isOrigin ? 'origin' : isDestination ? 'destination' : 'waypoint'}">${pointRole}</span>
                </div>
                <strong>${item.name}</strong><br>
                <span style="text-transform: capitalize;">${desc}</span><br>
                <span style="font-size: 0.85rem; color: #666; font-weight: 500;">${timeLabel}</span>
            </div>
            <div class="pin-weather">
                <span style="font-size: 1.2rem; font-weight: bold;">${temp}°F</span>
                <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="icon" style="width: 30px; vertical-align: middle;">
            </div>
        `;
        locationList.appendChild(li);
    });
    console.log("==================================");
}

// Helper to map raw UTC offsets to generic US Timezone abbreviations
function getTimezoneAbbr(offsetSeconds) {
    const hours = offsetSeconds / 3600;
    
    switch (hours) {
        case -4: return "ET";  // Eastern Time
        case -5: return "CT";  // Central Time
        case -6: return "MT";  // Mountain Time
        case -7: return "PT";  // Pacific Time
        case -8: return "AKT"; // Alaska Time
        case -9: return "HT"; // Hawaii Time
        default: 
            // Fallback for European/other international routes
            return hours > 0 ? `UTC+${hours}` : `UTC${hours}`; 
    }
}

export function renderRoute(route, map) {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    routeLayer = L.geoJSON(route.geometry).addTo(map);

    const bounds = routeLayer?.getBounds?.();
    if (bounds?.isValid?.()) {
        map.fitBounds(bounds, {
            padding: [40, 40]
        });
    }
}

export function clearMapData(markers, map) {
    markers.forEach(m => m.marker.remove());
    markers.length = 0;

    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    clearWeatherData();
    document.getElementById('weather-section').style.display = 'none';

    const aiOutputBox = document.getElementById('ai-response-text');
    if (aiOutputBox) {
        aiOutputBox.style.display = 'none';
        aiOutputBox.innerText = '';
    }
}

function clearWeatherData(){
    locationList.innerHTML = '<li class="empty-state">No locations added yet.</li>';
}