// Global Variables to store map state
let map;                // The Leaflet map object
let currentTileLayer;   // Holds the current tile layer object
let currentLayer;       // Holds the current tile layer (Street vs Satellite)
let markers = [];       // Array to store all our pin objects
let routePath;          // Object to store the drawn route line

// DOM variables
const confirmRouteBtn = document.getElementById('floating-confirm-btn');
const clearPinsBtn = document.getElementById('floating-clear-btn');
const getWeatherBtn = document.getElementById('floating-weather-btn');
confirmRouteBtn.addEventListener('click', planRouteMap);
clearPinsBtn.addEventListener('click', clearAllPins);
getWeatherBtn.addEventListener('click', getWeatherForLocation);

// 1. INITIALIZATION
// This function runs when the page loads to set up the map
function initMap() {
    // inits map
    map = L.map('map-container', {doubleClickZoom: false}).setView([43.8260, -111.7897], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // adds up to 5 markers
    map.on('dblclick', (e) => addPin(e));
}

// 2. MAP LAYERS
// Adds the standard street view layer to the map
function addStreetLayer() {
    // If a layer already exists, remove it so they don't stack up (becasue that is inefficient)
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    // Load OpenStreetMap (Street View)
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenStreetMap'
    }).addTo(map);
    console.log("Map initialized.");

    // Update buttons
    document.getElementById('btn-street').classList.add('active');
    document.getElementById('btn-satellite').classList.remove('active');
}

// Switches between standard street view and satellite imagery
function switchLayer(layerType) {
    if (layerType === 'street') {
        addStreetLayer();
    } else if (layerType === 'satellite') {
        // If a layer exists, remove it
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }

        // LOAD THE SATELLITE LAYER (Esri World Imagery (not nasa lol))
        currentTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(map);

        // Update buttons
        document.getElementById('btn-satellite').classList.add('active');
        document.getElementById('btn-street').classList.remove('active');
    }
}

function toggleRadar() {
    // TODO: Check if radar layer exists
    // TODO: If yes, remove it. If no, add RainViewer API tile layer on top
    console.log("Toggled weather radar.");
}

// 3. PINS & LOCATIONS
// Adds a marker to the map and stores it in our list
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
    // removes each marker from map and clears markers array
    markers.forEach((marker) => {
        marker.marker.remove();
    });
    markers = [];
    map.removeControl(routePath);
}

function updatePinListUI() {
    // TODO: Clear the current HTML list
    // TODO: Loop through markers and create <li> elements for each
}

// 4. ROUTING (The "Trip Planning" requirement)
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

    // TODO: Call a Geocoding API to convert city names to Lat/Lng coordinates
    // TODO: Call a Routing API (like OSRM) with those coordinates
    // TODO: Draw the resulting polyline (route) on the map
    
    // Advanced: Check weather along the route points
    checkWeatherAlongRoute();
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

function checkWeatherAlongRoute() {
    // TODO: Take sample points along the routePath
    // TODO: Fetch weather for each point to see if there are storms
}

// Start the app
document.addEventListener('DOMContentLoaded', initMap);