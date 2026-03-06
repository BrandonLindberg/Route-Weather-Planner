import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { clearMapData } from "./handlers/renderRouteWeatherHandler";
import { fetchRouteData } from "./handlers/routeDataHandler";
import { toggleRainRadar } from "./handlers/rainRadarHandler";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const API_URL = import.meta.env.VITE_API_URL

// ==============
// Global States
// ==============
let map;
let markers = [];
let currentTileLayer;

document.getElementById('floating-confirm-btn').addEventListener('click', planRoutePins);
document.getElementById('floating-clear-btn').addEventListener('click', () => clearMapData(markers, map));
document.getElementById('street-btn').addEventListener('click', () => switchLayer('street'));
document.getElementById('satellite-btn').addEventListener('click', () => switchLayer('satellite'));
document.getElementById('radar-btn').addEventListener('click', () => toggleRainRadar(map));
document.getElementById('ai-btn').addEventListener('click', getTripReview);

// =========
// Map Init
// =========
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

// ===========
// Map Layers
// ===========
// TODO: We could enhance this by adding more layer options like terrain, dark mode, or even custom styles. We could also add a dropdown menu for easier selection if we end up with more than 2-3 layers. For now, we'll keep it simple with just Street and Satellite views, but there's definitely room for expansion here in the future.
function addStreetLayer() {
    if (currentTileLayer) map.removeLayer(currentTileLayer);

    currentTileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 17,
            attribution: '© OpenStreetMap'
        }
    ).addTo(map);

    document.getElementById('street-btn').classList.add('active');
    document.getElementById('satellite-btn').classList.remove('active');
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

    document.getElementById('satellite-btn').classList.add('active');
    document.getElementById('street-btn').classList.remove('active');
}

// =====
// Pins
// =====
// TODO: We could get the location of the user on page load and center the map there for a more personalized experience. We could also add a "Locate Me" button that does this on demand. For now, we'll just start with a default view of the US, but adding geolocation would be a nice enhancement for future iterations.
// TODO: We could store the users pins in local storage so they persist across sessions, or even allow them to save and load different routes. For the MVP, we'll keep it simple and just have the pins exist in memory while the page is open, but there's definitely room for expansion here in the future.
// TODO: We could add suggestive locations when typing in the input fields using a geocoding API like Mapbox or Google Places. This would make it easier for users to enter their desired locations and reduce the chances of typos or invalid entries. For the MVP, we'll just have users enter freeform text and try to geocode it, but adding suggestions would be a great enhancement for future iterations.
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
}

export function addPinFromName(lat, lng) {
    if (markers.length >= 5) return;

    const crds = [lat, lng];
    const marker = L.marker(crds).addTo(map);

    markers.push({
        marker: marker,
        crds: crds
    });
    
    // Center the map on the new pin so the user sees it
    map.setView(crds, 6);
}

// ======================================
// Call fetching for pins/place names
// ======================================
// TODO: We could combine these two functions into one that detects whether the input is a name or coordinates, but for simplicity and clarity, I've kept them separate for now.
// TODO: We should also add some error handling here for invalid place names or failed API calls, but for the MVP, this will do. We can always enhance it later with user-friendly error messages and input validation.
// TODO: We could add an option to calculate the gas needed for the trip based on the distance and average fuel efficiency which could be a fun addition for users planning their road trip budget.
// TODO: We could also add an option to include rest stops or points of interest along the route, which could be a fun feature for users planning a road trip.
function planRoutePins(){
    const waypointCoords = markers.map(m => ({
        type: "coords",
        lat: m.crds[0],
        lng: m.crds[1]
    }));
    fetchRouteData(waypointCoords, map);
}
    
// ==========
// AI Review
// ==========
async function getTripReview() {
    if (typeof markers === 'undefined' || markers.length < 2) {
        alert("Please double-click the map to add at least a Start and End point.");
        return;
    }

    const startPin = markers[0].crds; 
    const endPin = markers[markers.length - 1].crds; 
    const midPins = markers.slice(1, -1).map(m => m.crds.join(', '));

    const aiOutputBox = document.getElementById('ai-response-text');
    
    if(aiOutputBox) {
        aiOutputBox.style.display = 'block';
        aiOutputBox.innerText = "Consulting AI...";
    }

    try {
        const response = await fetch(`http://localhost:4010/api/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                startCoords: startPin.join(', '),
                endCoords: endPin.join(', '),
                midCoords: midPins
            })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        const data = await response.json();
        
        if(aiOutputBox) {
            aiOutputBox.innerText = data.review;
        } else {
            alert("AI Safety Review:\n" + data.review);
        }

    } catch (error) {
        console.error("Error getting review:", error);
        if(aiOutputBox) aiOutputBox.innerText = "Error: Could not reach the AI service.";
    }
}

// =========
// App Init
// =========
document.addEventListener('DOMContentLoaded', initMap);


// TODO: We could think about a mobile version of this app in the future, which would have a different UI/UX and might use native geolocation and mapping features. For the MVP, we'll focus on a web-based version that works well on desktop browsers, but there's definitely potential to expand into mobile down the line.