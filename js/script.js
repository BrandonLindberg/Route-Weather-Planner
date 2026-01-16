// Global Variables to store map state
let map;                // The map object
let currentLayer;       // Holds the current tile layer (Street vs Satellite)
let markers = [];       // Array to store all our pin objects
let routePath;          // Object to store the drawn route line

// 1. INITIALIZATION
// This function runs when the page loads to set up the map
function initMap() {
    // TODO: Initialize Leaflet map targeting the 'map-container' div
    // TODO: Set default view to a central location (e.g., USA)
    // TODO: Add the default "Street" tile layer (using OpenStreetMap)
    
    // Event Listener: Allow users to click on the map to drop a pin
    // map.on('click', function(e) { addPin(e.latlng); });
    const map = L.map('map-container').setView([43.8260, -111.7897], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    console.log("Map initialized.");
}

// 2. MAP LAYERS (The "Satellite View" requirement)
// Switches between standard street view and satellite imagery
function switchLayer(layerType) {
    // TODO: Remove the currentLayer from the map
    
    if (layerType === 'satellite') {
        // TODO: Load NASA GIBS or Esri Satellite tiles
        // TODO: Update button styles to show Satellite is active
    } else {
        // TODO: Load OpenStreetMap tiles
        // TODO: Update button styles to show Street is active
    }
    
    console.log(`Switched to ${layerType} view.`);
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