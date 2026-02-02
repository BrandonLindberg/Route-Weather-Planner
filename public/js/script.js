// ==============================
// GLOBAL STATE
// ==============================
let map;
let currentTileLayer;
let radarLayer = null;
let markers = [];
let routePath = null;

// ==============================
// DOM REFERENCES
// ==============================
const confirmRouteBtn = document.getElementById('floating-confirm-btn');
const clearPinsBtn = document.getElementById('floating-clear-btn');
const getWeatherBtn = document.getElementById('floating-weather-btn');
confirmRouteBtn.addEventListener('click', planRouteMap);
clearPinsBtn.addEventListener('click', clearAllPins);
getWeatherBtn.addEventListener('click', getWeatherForLocation);

// ==============================
// MAP INITIALIZATION
// ==============================
function initMap() {
    // inits map
    map = L.map('map-container', {doubleClickZoom: false}).setView([43.8260, -111.7897], 13);
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.createPane('radarPane');
    map.getPane('radarPane').style.zIndex = 650;
    
    // adds up to 5 markers
    map.on('dblclick', (e) => addPin(e));
}

// ==============================
// MAP LAYERS
// ==============================
function addStreetLayer() {
    if (currentTileLayer) map.removeLayer(currentTileLayer);

    currentTileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 17,
            attribution: '© OpenStreetMap'
        }
    ).addTo(map);

    document.getElementById('btn-street').classList.add('active');
    document.getElementById('btn-satellite').classList.remove('active');
}

function switchLayer(type) {
    if (currentTileLayer) map.removeLayer(currentTileLayer);

    if (type === 'street') {
        addStreetLayer();
        return;
    }

    currentTileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles © Esri'
        }
    ).addTo(map);

    document.getElementById('btn-satellite').classList.add('active');
    document.getElementById('btn-street').classList.remove('active');
}

// ==============================
// RADAR (RAINVIEWER)
// ==============================
async function toggleRadar() {
    if (radarLayer && map.hasLayer(radarLayer)) {
        map.removeLayer(radarLayer);
        radarLayer = null;
        console.log("Radar removed");
        return;
    }

    try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        const latestTime = data.radar.past.at(-1).time;

        const colorSelect = document.getElementById('radar-color');
        const colorScheme = colorSelect ? colorSelect.value : 2;

        radarLayer = L.tileLayer(
            `https://tilecache.rainviewer.com/v2/radar/${latestTime}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`,
            {
                opacity: 0.6,
                pane: 'radarPane'
            }
        );

        radarLayer.addTo(map);
        console.log("Radar added:", new Date(latestTime * 1000).toLocaleTimeString());
    } catch (err) {
        console.error("Radar failed:", err);
    }
}

// ==============================
// PINS
// ==============================
function addPin(e) {
    // gets lat, lng, and crds from double click.
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const crds = [lat, lng];

    // creates and adds marker obj to markers array and adds pin to map (up to 5)
    if (markers.length < 5) {
        const markerObj = {};
        const marker = L.marker(crds);
        markerObj.marker = marker;
        markerObj.crds = crds;
        
        markers.push(markerObj);
        markerObj.marker.addTo(map);
    }
    
    // TODO: write updatePinListUI function to update HTML list in sidebar
    updatePinListUI();
}

function clearAllPins() {
    markers.forEach(m => m.marker.remove());
    markers = [];

    if (routePath) {
        map.removeControl(routePath);
        routePath = null;
    }
}

function updatePinListUI() {
    // Optional — safe stub
}

// ==============================
// ROUTING
// ==============================
function planRouteMap() {
    // gets coordinates for each marker
    const waypointCrds = markers.map(marker => {
        return L.latLng(marker.crds[0], marker.crds[1]);
    })
    
    // creates route path based on each marker and adds to map
    routePath = L.Routing.control({
        waypoints: waypointCrds,
        routeWhileDragging: true
    }).addTo(map);
}

function planRouteUI() {
    const start = document.getElementById('start-loc').value;
    const end = document.getElementById('end-loc').value;

    if (!start || !end) {
        alert("Please enter both a start and end location.");
        return;
    }

    console.log(`Calculating route from ${start} to ${end}...`);

    // TODO: Call a Routing API (like OSRM) with those coordinates
    // TODO: Draw the resulting polyline (route) on the map
    
    // Advanced: Check weather along the route points
    checkWeatherAlongRoute();
}

// 5. WEATHER DATA integration
// Fetches data from Open-Meteo or NWS
async function getWeatherForLocation() {
    const pinList = document.getElementById('pin-list');
    
    // Clear the list to avoid duplicates each time we run this
    pinList.innerHTML = ""; 

    if (markers.length === 0) {
        pinList.innerHTML = '<li class="empty-state">No pins added yet.</li>';
        return;
    }

    console.log("Fetching weather for", markers.length, "pins...");

    const requests = markers.map(async (markerObj, index) => {
        const [lat, lng] = markerObj.crds;
        
        try {
            const response = await fetch(`http://localhost:3000/api/weather?lat=${lat}&lng=${lng}`);
            const data = await response.json();
            
            // Return an object with the data AND the marker so we can update the UI
            return { 
                data: data, 
                marker: markerObj.marker, 
                id: index + 1 
            };
        } catch (err) {
            console.error("Error fetching weather:", err);
            return null;
        }
    });

    // Wait for all requests to finish
    const results = await Promise.all(requests);

    // PROCESS RESULTS & UPDATE UI
    results.forEach(item => {
        if (!item || !item.data.main) return; // Skip errors

        const temp = Math.round(item.data.main.temp);
        const desc = item.data.weather[0].description;
        const iconCode = item.data.weather[0].icon;
        
        // 1. UPDATE THE SIDEBAR LIST
        const li = document.createElement('li');
        li.className = 'pin-item';
        li.innerHTML = `
            <div>
                <strong>Pin ${item.id}</strong><br>
                <span style="text-transform: capitalize;">${desc}</span>
            </div>
            <div style="text-align: right;">
                <span style="font-size: 1.2rem; font-weight: bold;">${temp}°F</span>
                <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="icon" style="width: 30px; vertical-align: middle;">
            </div>
        `;
        pinList.appendChild(li);

        // 2. UPDATE THE MAP PIN (Add a popup)
        item.marker.bindPopup(`
            <b>Temp:</b> ${temp}°F<br>
            <b>Condition:</b> ${desc}
        `).openPopup();
    });
}
    
    // TODO: Change console logs to update html tags visible in UI.


// ==============================
// AI SAFETY REVIEW
// ==============================
async function getTripReview() {
    // Makes sure we get at least 2 pins (Start and End) 
    if (markers.length < 2) {
        alert("Please double-click the map to add a Start point and an End point first.");
        return;
    }

    // Get coordinates from the markers array
    const startPin = markers[0].crds; // [lat, lng]
    const endPin = markers[markers.length - 1].crds; // [lat, lng]

    // Notify user it's loading
    const aiOutputBox = document.getElementById('ai-response-text');
    if(aiOutputBox) aiOutputBox.innerText = "Consulting AI...";

    try {
        const response = await fetch('http://localhost:3000/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                startCoords: startPin.join(', '), 
                endCoords: endPin.join(', ')
            })
        });

        const data = await response.json();
        
        // Display result
        console.log("AI Review:", data.review);
        if(aiOutputBox) {
            aiOutputBox.innerText = data.review;
        } else {
            alert("AI Safety Review:\n" + data.review);
        }

    } catch (error) {
        console.error("Error getting review:", error);
        if(aiOutputBox) aiOutputBox.innerText = "Error contacting server.";
    }
}

// ==============================
// START APP
// ==============================
document.addEventListener('DOMContentLoaded', initMap);
