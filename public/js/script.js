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

confirmRouteBtn.addEventListener('click', planRouteMap);
clearPinsBtn.addEventListener('click', clearAllPins);

// ==============================
// MAP INITIALIZATION
// ==============================
function initMap() {
    map = L.map('map-container', {
        doubleClickZoom: false
    }).setView([43.8260, -111.7897], 13);

    // Base street layer
    currentTileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 17,
            attribution: '© OpenStreetMap contributors'
        }
    ).addTo(map);

    // Radar pane (keeps radar above map)
    map.createPane('radarPane');
    map.getPane('radarPane').style.zIndex = 650;

    // Pin placement (dbl-click)
    map.on('dblclick', addPin);

    console.log("Map initialized");
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
    if (markers.length >= 5) return;

    const latlng = [e.latlng.lat, e.latlng.lng];
    const marker = L.marker(latlng).addTo(map);

    markers.push({
        marker,
        crds: latlng
    });

    updatePinListUI();
}

function clearAllPins() {
    markers.forEach(m => m.marker.remove());
    markers = [];

    if (routePath) {
        map.removeControl(routePath);
        routePath = null;
    }

    console.log("Pins cleared");
}

function updatePinListUI() {
    // Optional — safe stub
}

// ==============================
// ROUTING
// ==============================
function planRouteMap() {
    if (markers.length < 2) return;

    const waypoints = markers.map(m =>
        L.latLng(m.crds[0], m.crds[1])
    );

    if (routePath) map.removeControl(routePath);

    routePath = L.Routing.control({
        waypoints,
        routeWhileDragging: true
    }).addTo(map);
}

// ==============================
// WEATHER (STUB)
// ==============================
function getWeatherForLocation(lat, lng) {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`)
        .then(r => r.json())
        .then(data => console.log(data));
}

// ==============================
// START APP
// ==============================
document.addEventListener('DOMContentLoaded', initMap);
