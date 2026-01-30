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
const confirmRouteUiBtn = document.getElementById('get-route-ui-btn');
const clearPinsBtn = document.getElementById('floating-clear-btn');
const getWeatherBtn = document.getElementById('floating-weather-btn');
confirmRouteBtn.addEventListener('click', planRouteMap);
confirmRouteUiBtn.addEventListener('click', planRouteUI);
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
        console.log('Radar removed');
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
        console.log('Radar added:', new Date(latestTime * 1000).toLocaleTimeString());
    } catch (err) {
        console.error('Radar failed:', err);
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

async function planRouteUI() {
    const geocodio_key = '9a8aa24a77b839353c6bc6aba47ccb42596825a';
    const start = document.getElementById('start-loc').value;
    const end = document.getElementById('end-loc').value;
    // const url = `https://api.geocod.io/v1.9/geocode?q=1109+N+Highland+St%2c+Arlington+VA&api_key=YOUR_API_KEY`
    let url = `https://api.geocod.io/v1.9/geocode?q=${start}&api_key=${geocodio_key}`;
    let response = await fetch(url);
    let data = await response.json();
    const startLat = data.results[0].location.lat;
    const startLng = data.results[0].location.lng;
    console.log(startLat, startLng)
    
    url = `https://api.geocod.io/v1.9/geocode?q=${end}&api_key=${geocodio_key}`;
    response = await fetch(url);
    data = await response.json();
    const endLat = data.results[0].location.lat;
    const endLng = data.results[0].location.lng;
    console.log(endLat, endLng)


    if (!start || !end) {
        alert('Please enter both a start and end location.');
        return;
    }

    console.log(`Calculating route from ${start} to ${end}...`);

    // TODO: Call a Geocoding API to convert city names to Lat/Lng coordinates
    // TODO: Call a Routing API (like OSRM) with those coordinates
    // TODO: Draw the resulting polyline (route) on the map
    
    // Advanced: Check weather along the route points
    checkWeatherAlongRoute();
}

function addMidpointUI() {
    document.getElementById('end-loc').remove();
    const endpoint = document.createElement('input');
    endpoint.type = 'text';
    endpoint.id = 'end-loc';
    endpoint.placeholder = 'End Location (e.g. Salt Lake City)';

    const midpoint = document.createElement('input');
    midpoint.type = 'text';
    midpoint.className = 'midpoint';
}

// 5. WEATHER DATA integration
// Fetches data from Open-Meteo or NWS
async function getWeatherForLocation() {
    // api key. TODO: Store elsewhere
    const API_key = '2341b339626b41ba3b7ef07d98278f81';

    // gets lats, lngs, and coordinates for each pin
    const lats = markers.map(marker => {
        return marker.crds[0];
    });
    const lngs = markers.map(marker => {
        return marker.crds[1];
    });
    let crds = [];
    for (let i = 0; i < lats.length; i++) {
        crds[i] = [lats[i], lngs[i]];
    };

    // queries api and gets a list of objects containing weather data for each pin
    const weather_objs = await Promise.all(crds.map(async (crd) => {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${crd[0]}&lon=${crd[1]}&appid=${API_key}`);
        return response.json();
    }));

    // console logs weather data for each pin
    weather_objs.forEach(weather_obj => {
        console.dir(weather_obj);
        console.log(weather_obj.main.temp);
        console.log(weather_obj.weather[0].description);
    });
    
    // TODO: Change console logs to update html tags visible in UI.
}

// ==============================
// START APP
// ==============================
document.addEventListener('DOMContentLoaded', initMap);
