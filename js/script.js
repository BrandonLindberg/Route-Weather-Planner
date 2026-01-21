// Global Variables to store map state
let map;                // The Leaflet map object
let currentTileLayer;   // Holds the current tile layer object
let currentLayer;       // Holds the current tile layer (Street vs Satellite)
let markers = [];       // Array to store all our pin objects
let routePath;          // Object to store the drawn route line

// 1. INITIALIZATION
// This function runs when the page loads to set up the map
function initMap() {
    // 1. Initialize map centered on US
    map = L.map('map-container').setView([43.8260, -111.7897], 13);

    // 2. Load the default "Street" layer
    addStreetLayer();

    // 3. Add click listener for pins
    map.on('click', function(e) {
        addPin(e.latlng.lat, e.latlng.lng, "Dropped Pin");
    });

    console.log("Map initialized.");
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
function addPin(lat, lng, label = "Custom Location") {
    // TODO: Create a Leaflet marker at [lat, lng]
    // TODO: Bind a popup to the marker with the label
    // TODO: Add marker to the 'markers' array
    
    // Call function to fetch weather for this specific pin
    getWeatherForLocation(lat, lng);
    
    // Update the HTML list in the sidebar
    updatePinListUI();
}

function clearAllPins() {
    // TODO: Loop through 'markers' array and remove each from map
    // TODO: Clear the array
    console.log("Map cleared.");
}

function updatePinListUI() {
    // TODO: Clear the current HTML list
    // TODO: Loop through markers and create <li> elements for each
}

// 4. ROUTING (The "Trip Planning" requirement)
function planRoute() {
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
function getWeatherForLocation(lat, lng) {
    // TODO: Fetch data from API: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}
    // TODO: On success, update the marker's popup with Temp/Condition
    console.log(`Fetching weather for ${lat}, ${lng}...`);
}

function checkWeatherAlongRoute() {
    // TODO: Take sample points along the routePath
    // TODO: Fetch weather for each point to see if there are storms
}

// Start the app
document.addEventListener('DOMContentLoaded', initMap);