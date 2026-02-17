import L from "leaflet";

// State management
let rainLayer = null;
let cachedRainData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (Radar updates roughly every 10m)

// Optimized Leaflet Tile Options
const TILE_OPTS = {
    opacity: 0.6,
    pane: 'radarPane',
    attribution: '© RainViewer',
    maxZoom: 19,
    tileSize: 256,
    zIndex: 10,
    keepBuffer: 4,         // Keep off-screen tiles in memory so they don't reload when panning back
    updateWhenIdle: false, // Load tiles *during* panning (smoother) rather than waiting for stop
    updateInterval: 100    // Check for new tiles more frequently
};

/**
 * Helper to get RainViewer data with caching
 * Prevents re-fetching the JSON API on every toggle
 */
async function getRainViewerData() {
    const now = Date.now();
    // Return cached data if it's less than 10 minutes old
    if (cachedRainData && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedRainData;
    }

    // Otherwise fetch fresh data
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await response.json();
    
    cachedRainData = data;
    lastFetchTime = now;
    return data;
}

/**
 * Main function: Toggles the latest radar frame
 */
export async function toggleRainRadar(map) {
    // If layer exists, remove it and exit
    if (rainLayer && map.hasLayer(rainLayer)) {
        map.removeLayer(rainLayer);
        rainLayer = null;
        return;
    }

    try {
        const data = await getRainViewerData();
        const radarFrames = data.radar.past;
        
        if (radarFrames?.length > 0) {
            const latestTimestamp = radarFrames[radarFrames.length - 1].path;
            const url = `https://tilecache.rainviewer.com${latestTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;
            
            rainLayer = L.tileLayer(url, TILE_OPTS);
            rainLayer.addTo(map);
            console.log('RainViewer precipitation layer added');
        }
    } catch (error) {
        console.error('Error loading RainViewer data:', error);
    }
}

/**
 * Advanced version: Toggles the latest forecast frame
 * (and stores frames for animation if needed)
 */
export async function toggleAnimatedPrecipitation(map) {
    if (rainLayer && map.hasLayer(rainLayer)) {
        map.removeLayer(rainLayer);
        rainLayer = null;
        return;
    }

    try {
        const data = await getRainViewerData();
        
        // Combine past + forecast
        const allFrames = [...data.radar.past, ...data.radar.nowcast];
        
        if (allFrames?.length > 0) {
            const latestFrame = allFrames[allFrames.length - 1].path;
            const url = `https://tilecache.rainviewer.com${latestFrame}/256/{z}/{x}/{y}/2/1_1.png`;
            
            rainLayer = L.tileLayer(url, {
                ...TILE_OPTS, 
                attribution: '© RainViewer (Forecast)'
            });
            
            rainLayer.addTo(map);
            
            // Store frames for animation logic elsewhere
            window.rainViewerFrames = allFrames;
            console.log('RainViewer forecast layer added');
        }
    } catch (error) {
        console.error('Error loading RainViewer forecast:', error);
    }
}