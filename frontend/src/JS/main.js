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
document.getElementById('midpoint-btn').addEventListener('click', addMidpoint);
document.getElementById('remove-midpoint-btn').addEventListener('click', removeMidpoint);
document.getElementById('btn-street').addEventListener('click', () => switchLayer('street'));
document.getElementById('btn-satellite').addEventListener('click', () => switchLayer('satellite'));
document.getElementById('btn-radar').addEventListener('click', () => toggleRainRadar(map));
document.getElementById('plan-route-btn').addEventListener('click', planRouteNames);
document.getElementById('clear-pins-btn').addEventListener('click', () => clearMapData(markers, map));
document.getElementById('ai-review-btn').addEventListener('click', getTripReview);

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

// =====
// Pins
// =====
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

// ======================================
// Call fetching for pins/place names
// ======================================
function planRoutePins(){
    const waypointCoords = markers.map(m => ({
        type: "coords",
        lat: m.crds[0],
        lng: m.crds[1]
    }));
    fetchRouteData(waypointCoords, map);
}

function planRouteNames(){
    const locations = Array.from(document.querySelectorAll('.ui-loc'), loc => ({
        type: "name",
        value: loc.value
    }));
    clearMapData(markers, map);
    fetchRouteData(locations, map);
}
    
// ==========
// AI Review
// ==========
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
        const response = await fetch(`/api/review`, {
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

// =========
// App Init
// =========
document.addEventListener('DOMContentLoaded', initMap);