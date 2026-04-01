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

const DEFAULT_LOCAL_API_URL = 'http://localhost:4010';
const RAW_API_URL = `${import.meta.env.VITE_API_URL ?? ''}`.trim();
const hasConfiguredApiUrl = RAW_API_URL && RAW_API_URL !== 'undefined' && RAW_API_URL !== 'null';
const isLocalhostHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_URL = hasConfiguredApiUrl
    ? RAW_API_URL.replace(/\/+$/, '')
    : (isLocalhostHost ? DEFAULT_LOCAL_API_URL : '');
const REVIEW_ENDPOINT = API_URL ? `${API_URL}/api/review` : '/api/review';
const MIN_MAP_ZOOM = 3;
const MAP_BOUNDS = [[-85, -180], [85, 180]];
const MAP_LATLNG_BOUNDS = L.latLngBounds(MAP_BOUNDS);
const ORIGIN_MARKER_COLOR = '#1f7a39';
const DESTINATION_MARKER_COLOR = '#b9382b';
const REVIEW_REQUEST_TIMEOUT_MS = 15000;

// ==============
// Global States
// ==============
let map;
let markers = [];
let currentTileLayer;
let isRouteLoading = false;
const originInput = document.getElementById('origin-input');
const destinationInput = document.getElementById('destination-input');
const confirmRouteBtn = document.getElementById('floating-confirm-btn');
const clearMapBtn = document.getElementById('floating-clear-btn');
const routeLoadingStatus = document.getElementById('route-loading-status');

function createColoredPinIcon(color) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
            <path fill="${color}" d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.268 21.732 0 14 0z"/>
            <circle cx="14" cy="14" r="5" fill="#ffffff"/>
        </svg>
    `;

    return L.icon({
        iconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
        iconSize: [28, 42],
        iconAnchor: [14, 41],
        popupAnchor: [1, -34],
        shadowUrl: markerShadow,
        shadowSize: [41, 41],
        shadowAnchor: [13, 41]
    });
}

document.getElementById('floating-confirm-btn').addEventListener('click', planRoutePins);
document.getElementById('floating-clear-btn').addEventListener('click', clearMapAndInputs);
document.getElementById('street-btn').addEventListener('click', () => switchLayer('street'));
document.getElementById('satellite-btn').addEventListener('click', () => switchLayer('satellite'));
document.getElementById('radar-btn').addEventListener('click', () => toggleRainRadar(map));
document.getElementById('ai-btn').addEventListener('click', getTripReview);

function clearMapAndInputs() {
    if (isRouteLoading) {
        return;
    }

    clearMapData(markers, map);

    if (originInput) {
        originInput.value = '';
    }

    if (destinationInput) {
        destinationInput.value = '';
    }

    setRouteLoadingState(false);
}

function setRouteLoadingState(isLoading) {
    isRouteLoading = isLoading;

    if (confirmRouteBtn) {
        confirmRouteBtn.disabled = isLoading;
        confirmRouteBtn.innerText = isLoading ? 'Generating Route...' : 'Get Route & Weather';
    }

    if (clearMapBtn) {
        clearMapBtn.disabled = isLoading;
    }

    if (originInput) {
        originInput.disabled = isLoading;
    }

    if (destinationInput) {
        destinationInput.disabled = isLoading;
    }

    if (routeLoadingStatus) {
        routeLoadingStatus.innerText = isLoading
            ? 'Building route and weather timeline...'
            : '';
    }
}

// =========
// Map Init
// =========
function initMap() {
    // inits map
    map = L.map('map-container', {
        doubleClickZoom: false,
        zoomControl: false,
        minZoom: MIN_MAP_ZOOM,
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 1.0
    }).setView([43.8260, -111.7897], 13);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: MIN_MAP_ZOOM,
        maxZoom: 17,
        noWrap: true,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.createPane('radarPane');
    map.getPane('radarPane').style.zIndex = 650;

    clampMinZoomToWorldBounds();
    map.on('resize', clampMinZoomToWorldBounds);

    setupOverlayInteractionGuards();
    
    // adds up to 5 markers
    map.on('dblclick', (e) => addPin(e));
}

function clampMinZoomToWorldBounds() {
    const worldFitZoom = map.getBoundsZoom(MAP_LATLNG_BOUNDS, true);
    const clampedMinZoom = Math.max(MIN_MAP_ZOOM, worldFitZoom);

    map.setMinZoom(clampedMinZoom);

    if (map.getZoom() < clampedMinZoom) {
        map.setZoom(clampedMinZoom);
    }
}

function setupOverlayInteractionGuards() {
    const guardedSelectors = [
        '#ui-section',
        '#weather-section',
        '#ai-response-text',
        '.weather-list-scroll'
    ];

    guardedSelectors.forEach((selector) => {
        const element = document.querySelector(selector);
        if (!element) return;

        L.DomEvent.disableScrollPropagation(element);
        L.DomEvent.disableClickPropagation(element);
    });
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
            minZoom: MIN_MAP_ZOOM,
            maxZoom: 17,
            noWrap: true,
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
            minZoom: MIN_MAP_ZOOM,
            noWrap: true,
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
    const crds = [lat, lng];
    const marker = L.marker(crds).addTo(map);

    markers.push({
        marker: marker,
        crds: crds
    });

    map.setView(crds, 6);
}

export function addSampledWaypoint(lat, lng, waypointNumber, locationName) {
    const crds = [lat, lng];
    const marker = L.circleMarker(crds, {
        radius: 5,
        color: '#2f7eea',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 0.95,
        pane: 'markerPane'
    }).addTo(map);

    const tooltipLabel = locationName
        ? `Waypoint ${waypointNumber}: ${locationName}`
        : `Waypoint ${waypointNumber}`;

    marker.bindTooltip(tooltipLabel, {
        direction: 'top',
        offset: [0, -8],
        opacity: 0.95,
        className: 'sampled-waypoint-tooltip'
    });

    markers.push({
        marker: marker,
        crds: crds
    });
}

export function addEndpointPin(lat, lng, role) {
    const color = role === 'origin' ? ORIGIN_MARKER_COLOR : DESTINATION_MARKER_COLOR;
    const icon = createColoredPinIcon(color);
    const crds = [lat, lng];
    const marker = L.marker(crds, { icon }).addTo(map);

    markers.push({
        marker: marker,
        crds: crds
    });
}

// ======================================
// Call fetching for pins/place names
// ======================================
// TODO: We could combine these two functions into one that detects whether the input is a name or coordinates, but for simplicity and clarity, I've kept them separate for now.
// TODO: We should also add some error handling here for invalid place names or failed API calls, but for the MVP, this will do. We can always enhance it later with user-friendly error messages and input validation.
// TODO: We could add an option to calculate the gas needed for the trip based on the distance and average fuel efficiency which could be a fun addition for users planning their road trip budget.
// TODO: We could also add an option to include rest stops or points of interest along the route, which could be a fun feature for users planning a road trip.
async function planRoutePins(){
    if (isRouteLoading) {
        return;
    }

    const origin = originInput ? originInput.value.trim() : '';
    const destination = destinationInput ? destinationInput.value.trim() : '';
    const typedLocationsProvided = origin.length > 0 || destination.length > 0;
    const waypointCoords = markers.map((m) => ({
        type: 'coords',
        lat: m.crds[0],
        lng: m.crds[1]
    }));

    if (typedLocationsProvided && (!origin || !destination)) {
        alert('Please provide both an origin and destination.');
        return;
    }

    setRouteLoadingState(true);

    // Always clear existing route artifacts before generating a fresh route.
    clearMapData(markers, map);

    try {
        if (origin && destination) {
            const routeLocations = [
                { type: 'name', value: origin },
                { type: 'name', value: destination }
            ];

            await fetchRouteData(routeLocations, map);
            return;
        }

        await fetchRouteData(waypointCoords, map);
    } finally {
        setRouteLoadingState(false);
    }
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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REVIEW_REQUEST_TIMEOUT_MS);

        let response;
        try {
            response = await fetch(REVIEW_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({ 
                    startCoords: startPin.join(', '),
                    endCoords: endPin.join(', '),
                    midCoords: midPins
                })
            });
        } finally {
            clearTimeout(timeout);
        }

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data?.error || `Server Error: ${response.status}`);
        }
        
        if(aiOutputBox) {
            aiOutputBox.innerText = data.review;
        } else {
            alert("AI Safety Review:\n" + data.review);
        }

    } catch (error) {
        console.error("Error getting review:", error);
        const errorMessage = error?.name === 'AbortError'
            ? 'AI review timed out. Please try again.'
            : (error?.message || 'Could not reach the AI service.');

        if(aiOutputBox) aiOutputBox.innerText = `Error: ${errorMessage}`;
    }
}

// =========
// App Init
// =========
document.addEventListener('DOMContentLoaded', initMap);


// TODO: We could think about a mobile version of this app in the future, which would have a different UI/UX and might use native geolocation and mapping features. For the MVP, we'll focus on a web-based version that works well on desktop browsers, but there's definitely potential to expand into mobile down the line.