const locationList = document.getElementById('pin-list');
let routeLayer = null;

export function renderWeatherUI(weatherData) {
    locationList.innerHTML = "";
    
    weatherData.forEach(item => {
        const temp = Math.round(item.main.temp);
        const desc = item.weather[0].description;
        const iconCode = item.weather[0].icon;
        
        const li = document.createElement('li');
        li.className = 'pin-item';
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <span style="text-transform: capitalize;">${desc}</span>
            </div>
            <div style="text-align: right;">
                <span style="font-size: 1.2rem; font-weight: bold;">${temp}°F</span>
                <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="icon" style="width: 30px; vertical-align: middle;">
            </div>
        `;
        locationList.appendChild(li);
    });
}

export function renderRoute(route, map) {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    routeLayer = L.geoJSON(route.geometry).addTo(map);
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
}

function clearWeatherData(){
    locationList.innerHTML = '<li class="empty-state">No locations added yet.</li>';
}