// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock our internal handlers so we don't accidentally run them
import { clearMapData } from './handlers/renderRouteWeatherHandler.js';
import { fetchRouteData } from './handlers/routeDataHandler.js';
import { toggleRainRadar } from './handlers/rainRadarHandler.js';

vi.mock('./handlers/renderRouteWeatherHandler.js', () => ({ clearMapData: vi.fn() }));
vi.mock('./handlers/routeDataHandler.js', () => ({ fetchRouteData: vi.fn() }));
vi.mock('./handlers/rainRadarHandler.js', () => ({ toggleRainRadar: vi.fn() }));
vi.mock('leaflet-routing-machine', () => ({}));
vi.mock('leaflet-routing-machine/dist/leaflet-routing-machine.css', () => ({}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: 'marker2x.png' }));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'marker.png' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'shadow.png' }));

// 2. Mock Leaflet thoroughly
const mockAddTo = vi.fn();
const mockMapInstance = {
    setView: vi.fn().mockReturnThis(),
    createPane: vi.fn(),
    getPane: vi.fn(() => ({ style: {} })),
    on: vi.fn(),
    removeLayer: vi.fn()
};

vi.mock('leaflet', () => {
    return {
        default: {
            Icon: {
                Default: {
                    prototype: { _getIconUrl: vi.fn() },
                    mergeOptions: vi.fn()
                }
            },
            map: vi.fn(() => mockMapInstance),
            tileLayer: vi.fn(() => ({ addTo: mockAddTo })),
            marker: vi.fn(() => ({ addTo: mockAddTo }))
        }
    };
});
import L from 'leaflet';

// 3. Mock Global Fetch
global.fetch = vi.fn();
global.alert = vi.fn();

describe('Main Entry Point Tests', () => {
    let mainModule;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        // Setup the COMPLETE DOM before importing main.js
        document.body.innerHTML = `
            <div id="map-container"></div>
            <button id="floating-confirm-btn"></button>
            <button id="floating-clear-btn"></button>
            <button id="street-btn" class="active"></button>
            <button id="satellite-btn"></button>
            <button id="radar-btn"></button>
            <button id="ai-btn"></button>
            <div id="ai-response-text" style="display: none;"></div>
        `;

        // Mock Vite's import.meta.env before import
        vi.stubGlobal('import.meta', { env: { VITE_API_URL: 'http://localhost:4010' } });

        // Now dynamically import the file!
        mainModule = await import('./main.js');

        // Initialize module state so map-dependent functions can run safely.
        document.dispatchEvent(new Event('DOMContentLoaded'));

        const aiBox = document.getElementById('ai-response-text');
        if (aiBox) {
            aiBox.style.display = 'none';
            aiBox.innerText = '';
        }
    });

    it('should initialize the map on DOMContentLoaded', () => {
        // Fire the event that tells main.js the page is ready
        document.dispatchEvent(new Event('DOMContentLoaded'));

        // Did it create the map on the #map-container div?
        expect(L.map).toHaveBeenCalledWith('map-container', { doubleClickZoom: false });
        
        // Did it set the initial view to Idaho?
        expect(mockMapInstance.setView).toHaveBeenCalledWith([43.8260, -111.7897], 13);
        
        // Did it set up the double-click listener for adding pins?
        expect(mockMapInstance.on).toHaveBeenCalledWith('dblclick', expect.any(Function));
    });

    it('should export and execute addPinFromName correctly', () => {
        // Your exported function!
        mainModule.addPinFromName(40.7128, -74.0060); // NYC

        // Did it create a marker?
        expect(L.marker).toHaveBeenCalledWith([40.7128, -74.0060]);
        
        // Did it re-center the map?
        expect(mockMapInstance.setView).toHaveBeenCalledWith([40.7128, -74.0060], 6);
    });

    it('should successfully fetch AI trip review when the button is clicked', async () => {
        // Add a couple pins first so the validation passes
        mainModule.addPinFromName(43.82, -111.79);
        mainModule.addPinFromName(47.67, -116.78);

        // Setup fake AI response
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ review: "Watch out for snow on I-15!" })
        });

        // Simulate a user clicking the AI button
        document.getElementById('ai-btn').click();

        // We need to wait a tiny bit for the async fetch to resolve in the DOM
        await new Promise(process.nextTick); 

        // Did it hit the correct API endpoint?
        expect(fetch).toHaveBeenCalledWith('http://localhost:4010/api/review', expect.any(Object));

        // Did it update the UI with the AI response?
        const aiBox = document.getElementById('ai-response-text');
        expect(aiBox.style.display).toBe('block');
        expect(aiBox.innerText).toBe("Watch out for snow on I-15!");
    });

    it('should show an error message when AI endpoint returns a non-OK response', async () => {
        mainModule.addPinFromName(43.82, -111.79);
        mainModule.addPinFromName(47.67, -116.78);

        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({})
        });

        document.getElementById('ai-btn').click();
        await new Promise(process.nextTick);

        const aiBox = document.getElementById('ai-response-text');
        expect(aiBox.innerText).toBe('Error: Could not reach the AI service.');
    });

    it('should fallback to alert when AI output box does not exist', async () => {
        const aiBox = document.getElementById('ai-response-text');
        aiBox.remove();

        mainModule.addPinFromName(43.82, -111.79);
        mainModule.addPinFromName(47.67, -116.78);

        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ review: 'Conditions are clear.' })
        });

        document.getElementById('ai-btn').click();
        await new Promise(process.nextTick);

        expect(global.alert).toHaveBeenCalledWith('AI Safety Review:\nConditions are clear.');
    });

    it('should alert when there are not enough pins for AI review', async () => {
        fetch.mockClear();

        document.getElementById('ai-btn').click();
        await new Promise(process.nextTick);

        expect(global.alert).toHaveBeenCalledWith('Please double-click the map to add at least a Start and End point.');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should trigger the correct handler when the Clear button is clicked', () => {
        document.getElementById('floating-clear-btn').click();
        // clearMapData should have been called!
        expect(clearMapData).toHaveBeenCalled();
    });
});