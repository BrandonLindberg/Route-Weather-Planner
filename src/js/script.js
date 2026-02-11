import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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
document.getElementById('floating-confirm-btn').addEventListener('click', planRouteMap);
document.getElementById('floating-clear-btn').addEventListener('click', clearAllPins);
document.getElementById('midpoint-btn').addEventListener('click', addMidpoint);
document.getElementById('remove-midpoint-btn').addEventListener('click', removeMidpoint);

document.getElementById('btn-street').addEventListener('click', () => switchLayer('street'));
document.getElementById('btn-satellite').addEventListener('click', () => switchLayer('satellite'));
document.getElementById('btn-radar').addEventListener('click', toggleRadar);

document.getElementById('plan-route-btn').addEventListener('click', planRoute);
document.getElementById('clear-pins-btn').addEventListener('click', clearAllPins);

document.getElementById('ai-review-btn').addEventListener('click', getTripReview);

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
    updatePinListUI();
}

function addManualPin(lat, lng) {
    if (markers.length >= 5) return;

    const crds = [lat, lng];
    const marker = L.marker(crds).addTo(map);

    markers.push({
        marker: marker,
        crds: crds
    });
    
    // Center the map on the new pin so the user sees it
    map.setView(crds, 6); 
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

function addMidpoint() {
    const uiPoints = document.querySelectorAll('.ui-loc');
    if (uiPoints.length > 6) return;

    const controlGroup = document.querySelector('.input-group');

    const endpoint = document.getElementById('end-loc');
    endpoint.remove();

    const midpoint = document.createElement('input');
    midpoint.type = 'text';
    midpoint.className = 'ui-loc';
    midpoint.placeholder = 'Middle Location';

    controlGroup.appendChild(midpoint);
    controlGroup.appendChild(endpoint);
}

function removeMidpoint() {
    const uiPoints = document.querySelectorAll('.ui-loc');
    if (uiPoints.length === 2) return;
    uiPoints[1].remove();
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
    
    getWeatherForLocation();
}

async function planRoute() {
    const locations = Array.from(document.querySelectorAll('.ui-loc'), loc => loc.value);
    if (locations.length === 0) {
        alert("Please enter both a start and end location.");
        return;
    }

    // 1. CLEAR OLD PINS (Optional: keeps the map clean for the new trip)
    clearAllPins();

    try {
        // 2. GEOCODE ALL LOCATIONS
        // We use the free OSM Nominatim API
        const locData = await Promise.all(locations.map(l => 
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(l)}`).then(r => r.json()))
        );

        // Validation: Did we find the cities?
        // currently no validation

        // 3. EXTRACT COORDINATES (Nominatim returns 'lat' and 'lon' as strings)
        const crds = locData.map(array => {
            return { lat: parseFloat(array[0].lat), lng: parseFloat(array[0].lon) }
        });

        // 4. ADD PINS TO MAP
        // addManualPin(startCoords.lat, startCoords.lng);
        // addManualPin(endCoords.lat, endCoords.lng);
        crds.forEach(crd => addManualPin(crd.lat, crd.lng));

        // 5. TRIGGER EXISTING FUNCTIONS
        // Draw the line
        planRouteMap();
        
        // Fetch the weather for these new pins
        // We add a small delay to ensure the pins are registered before fetching
        setTimeout(() => {
            getWeatherForLocation();
        }, 500);

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// ===============================
// 5. WEATHER DATA integration
// ===============================
async function getWeatherForLocation() {
    const pinList = document.getElementById('pin-list');
    
    // Clear the list to avoid duplicates each time we run this
    pinList.innerHTML = ""; 

    if (markers.length === 0) {
        pinList.innerHTML = '<li class="empty-state">No pins added yet.</li>';
        return;
    }

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
