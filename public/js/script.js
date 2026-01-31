// ==============================
// GLOBAL STATE
// ==============================
let map;
let currentTileLayer;
let radarLayer = null;
let markers = [];
let routePath = null;
let pointsUI = [];

// ==============================
// DOM REFERENCES
// ==============================

// Buttons
const confirmRouteBtn = document.getElementById('floating-confirm-btn');
const confirmRouteUiBtn = document.getElementById('get-route-ui-btn');
const clearPinsBtn = document.getElementById('floating-clear-btn');
const getWeatherBtn = document.getElementById('floating-weather-btn');
const addMidpointBtn = document.getElementById('add-midpoint-btn');
const removeMidpointBtn = document.getElementById('delete-midpoint-btn');

// Event Listeners
confirmRouteBtn.addEventListener('click', (e) => {planRoute(e)});
confirmRouteUiBtn.addEventListener('click', (e) => {planRoute(e)});
clearPinsBtn.addEventListener('click', clearAllPins);
getWeatherBtn.addEventListener('click', () => {getWeatherForLocation()});
addMidpointBtn.addEventListener('click', addMidpointUI);
removeMidpointBtn.addEventListener('click', removeMidpointUI);

// Weather Along Route Section
const weather1 = document.getElementById('weather1');
const weather2 = document.getElementById('weather2');
const weather3 = document.getElementById('weather3');
const weather4 = document.getElementById('weather4');
const weather5 = document.getElementById('weather5');
const weatherPoints = [weather1, weather2, weather3, weather4, weather5];

// ==============================
// MAP INITIALIZATION
// ==============================
function initMap() {
    // inits map
    map = L.map('map', {doubleClickZoom: false}).setView([43.8260, -111.7897], 13);
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
}

function clearAllPins() {
    markers.forEach(m => m.marker.remove());
    markers = [];
    pointsUI.forEach(p => p.remove());
    pointsUI = [];
    weatherPoints.forEach(w => w.innerText = '');

    if (routePath) {
        map.removeControl(routePath);
        routePath = null;
    }
}

// ==============================
// UI
// ==============================
async function getCrdsUI() {
    const geocodio_key = '9a8aa24a77b839353c6bc6aba47ccb42596825a';
    
    const start = document.getElementById('start-loc').value;
    const midpoints = pointsUI.map(point => point.value);
    const end = document.getElementById('end-loc').value;
    const locations = [start, ...midpoints, end];
    
    const crds = await Promise.all(
        locations.map(async loc => {
            let url = `https://api.geocod.io/v1.9/geocode?q=${loc}&api_key=${geocodio_key}`;
            const response = await fetch(url);
            const data = await response.json();
            return [data.results[0].location.lat, data.results[0].location.lng];
        })
    );

    return crds;
}

function addMidpointUI() {
    if (pointsUI.length > 2) {
        return;
    }

    const pointsHolder = document.getElementById('points');

    document.getElementById('end-loc').remove();
    const endpoint = document.createElement('input');
    endpoint.type = 'text';
    endpoint.id = 'end-loc';
    endpoint.placeholder = 'End Location (e.g. Salt Lake City)';

    const midpoint = document.createElement('input');
    midpoint.type = 'text';
    midpoint.className = 'midpoint';
    midpoint.placeholder = 'Midpoint Location';

    pointsHolder.appendChild(midpoint);
    pointsHolder.appendChild(endpoint);
    pointsUI.push(midpoint);
}

function removeMidpointUI() {
    pointsUI[pointsUI.length-1].remove();
    pointsUI.pop();
}

// ==============================
// ROUTING
// ==============================
async function planRoute(e) {
    // gets coordinates for each marker
    if (e.target.id === 'floating-confirm-btn') {
        const waypointCrds = markers.map(marker => {
            return L.latLng(marker.crds[0], marker.crds[1]);
        })
        const crds = waypointCrds.map(waypoint => {
            return [waypoint.lat, waypoint.lng];
        });
        const weather = await getWeatherForLocation(crds);
        for (let i = 0; i < weather.length; i++) {
            weatherPoints[i].innerText = weather[i].name + ' | ' + weather[i].weather[0].main + ' | ' + convertK(weather[i].main.temp) + ' F';
        }
        // console.log(weather);
        
        // creates route path based on each marker and adds to map
        routePath = L.Routing.control({
            waypoints: waypointCrds,
            routeWhileDragging: true
        }).addTo(map);
    } else {
        const crds = await getCrdsUI();
        const weather = await getWeatherForLocation(crds);
        console.log(weather);

        routePath = L.Routing.control({
            waypoints: crds,
            routeWhileDragging: true
        }).addTo(map);
    }
}

// ==============================
// WEATHER
// ==============================
async function getWeatherForLocation(crds=null) {
    // api key. TODO: Store elsewhere
    const API_key = '2341b339626b41ba3b7ef07d98278f81';
    
    if (crds === null) {
        crds = markers.map(m => m.crds);

        const weather_objs = await Promise.all(crds.map(async (crd) => {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${crd[0]}&lon=${crd[1]}&appid=${API_key}`);
            return response.json();
        }));

        for (let i = 0; i<weather_objs.length; i++) {
            weatherPoints[i].innerText = weather_objs[i].name + ' | ' + weather_objs[i].weather[0].main + ' | ' + weather_objs[i].main.temp
        }
    }

    // queries api and gets a list of objects containing weather data for each pin
    const weather_objs = await Promise.all(crds.map(async (crd) => {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${crd[0]}&lon=${crd[1]}&appid=${API_key}`);
        return response.json();
    }));

    return weather_objs;
}

function convertK(temp_k) {
    return ((temp_k - 273.15)*(9/5)+32).toFixed(2);
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