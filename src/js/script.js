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
let markers = [];

let routePath = null;
let routeLayer = null;
let radarLayer = null;
let currentTileLayer;

document.getElementById('floating-confirm-btn').addEventListener('click', planRouteMap);
document.getElementById('floating-clear-btn').addEventListener('click', clearAllPins);
document.getElementById('midpoint-btn').addEventListener('click', addMidpoint);
document.getElementById('remove-midpoint-btn').addEventListener('click', removeMidpoint);

document.getElementById('btn-street').addEventListener('click', () => switchLayer('street'));
document.getElementById('btn-satellite').addEventListener('click', () => switchLayer('satellite'));
// document.getElementById('btn-radar').addEventListener('click', toggleRadar);

document.getElementById('plan-route-btn').addEventListener('click', fetchRouteWeather);
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
}

function clearAllPins() {
    markers.forEach(m => m.marker.remove());
    markers = [];

    if (routePath) {
        map.removeControl(routePath);
        routePath = null;
    }
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
    routePath = L.Routing.control({waypoints: waypointCrds, routeWhileDragging: true}).addTo(map);
}

async function fetchRouteWeather() {

    clearAllPins();
    markers = [];

    const locations = Array.from(document.querySelectorAll('.ui-loc'), loc => loc.value);
    
    if (locations.length > 0) {
        try {
            const locData = await fetch('http://localhost:3000/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations })
            });

            const routeData = await locData.json();
            const route = routeData.route;
            const coords = routeData.coordinates;
            const weather = routeData.weather;

            coords.forEach(c => addManualPin(c.lat, c.lng));

            renderRoute(route);
            renderWeatherUI(weather);
        }
        catch(err) {
            console.log(err);
        }
    }
    else {
        alert("Please enter both a start and end location.");
        return;
    }
}

function renderRoute(route) {
    console.log(routeLayer);
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    routeLayer = L.geoJSON(route.geometry).addTo(map);
}

function renderWeatherUI(weatherData) {
    const pinList = document.getElementById('pin-list');
    
    // Clear the list to avoid duplicates each time we run this
    pinList.innerHTML = ""; 

    if (markers.length === 0) {
        pinList.innerHTML = '<li class="empty-state">No pins added yet.</li>';
        return;
    }

    // const requests = markers.map(async (markerObj, index) => {
    //     const [lat, lng] = markerObj.crds;
        
    //     try {
    //         const response = await fetch(`http://localhost:3000/api/weather?lat=${lat}&lng=${lng}`);
    //         const data = await response.json();
            
    //         // Return an object with the data AND the marker so we can update the UI
    //         return { 
    //             data: data, 
    //             marker: markerObj.marker, 
    //             id: index + 1 
    //         };
    //     } catch (err) {
    //         console.error("Error fetching weather:", err);
    //         return null;
    //     }
    // });

    // PROCESS RESULTS & UPDATE UI
    weatherData.forEach(item => {
        // if (!item || !item.data.main) return; // Skip errors

        const temp = Math.round(item.main.temp);
        const desc = item.weather[0].description;
        const iconCode = item.weather[0].icon;
        
        // 1. UPDATE THE SIDEBAR LIST
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
        pinList.appendChild(li);
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
