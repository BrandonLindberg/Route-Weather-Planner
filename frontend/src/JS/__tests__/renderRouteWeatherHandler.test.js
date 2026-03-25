// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// 1. Mock Leaflet (L) globally since it's not imported at the top of your file
const mockAddTo = vi.fn(() => ({ id: 'route-layer' }));
const mockRemoveLayer = vi.fn();
global.L = {
    geoJSON: vi.fn(() => ({
        addTo: mockAddTo
    }))
};

describe('Render Route & Weather Handler Tests', () => {
    let handler;
    let mockMap;

    beforeAll(async () => {
        // 2. Build the DOM *BEFORE* importing the module
        document.body.innerHTML = `
            <div id="weather-section" style="display: block;"></div>
            <ul id="pin-list"></ul>
        `;

        // 3. Dynamically import the module now that the DOM exists!
        handler = await import('../handlers/renderRouteWeatherHandler.js');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset the DOM state before each test
        document.getElementById('pin-list').innerHTML = '';
        document.getElementById('weather-section').style.display = 'block';

        // Setup a fake Leaflet map object
        mockMap = {
            removeLayer: mockRemoveLayer
        };
    });

    it('should correctly render the Weather UI and format the timezone', () => {
        const mockWeatherData = [
            {
                name: "Rexburg",
                main: { temp: 72.4 },
                weather: [{ description: "clear sky", icon: "01d" }],
                eta_timestamp: 1710000000, 
                timezone_offset: -25200 // -7 Hours (Mountain Time)
            }
        ];

        // Run your function
        handler.renderWeatherUI(mockWeatherData);

        // Assertions: Did it build the HTML correctly?
        const list = document.getElementById('pin-list');
        expect(list.children.length).toBe(1);
        
        const html = list.innerHTML;
        expect(html).toContain('Rexburg');
        expect(html).toContain('72°F'); // Did it round the temp properly?
        expect(html).toContain('clear sky');
        expect(html).toContain('Current Time'); // First item should say Current Time
    });

    it('should add the route geoJSON to the map', () => {
        const mockRoute = { geometry: { type: "LineString", coordinates: [] } };

        handler.renderRoute(mockRoute, mockMap);

        // Did it call Leaflet to create the GeoJSON line?
        expect(global.L.geoJSON).toHaveBeenCalledWith(mockRoute.geometry);
        // Did it attach it to the map?
        expect(mockAddTo).toHaveBeenCalledWith(mockMap);
    });

    it('should clear all map data, markers, and DOM sections', () => {
        // Create some fake markers with spy functions
        const mockMarker1 = { marker: { remove: vi.fn() } };
        const mockMarker2 = { marker: { remove: vi.fn() } };
        const markersArray = [mockMarker1, mockMarker2];

        // We need to render a route first so routeLayer is populated and can be removed
        handler.renderRoute({}, mockMap);

        // Run the clear function
        handler.clearMapData(markersArray, mockMap);

        // 1. Did it clear the markers?
        expect(mockMarker1.marker.remove).toHaveBeenCalled();
        expect(mockMarker2.marker.remove).toHaveBeenCalled();
        expect(markersArray.length).toBe(0);

        // 2. Did it remove the route layer?
        expect(mockRemoveLayer).toHaveBeenCalled();

        // 3. Did it hide the weather section?
        const weatherSection = document.getElementById('weather-section');
        expect(weatherSection.style.display).toBe('none');

        // 4. Did it reset the pin list UI?
        const list = document.getElementById('pin-list');
        expect(list.innerHTML).toContain('No locations added yet.');
    });
});