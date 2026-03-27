// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRouteData } from '../handlers/routeDataHandler.js';

// 1. Mock the imported dependencies!
// We replace the real functions with vi.fn() spies so we don't accidentally
// trigger real Leaflet maps or DOM logic during this test.
import { renderRoute, renderWeatherUI } from '../handlers/renderRouteWeatherHandler.js';
vi.mock('../handlers/renderRouteWeatherHandler.js', () => ({
    renderRoute: vi.fn(),
    renderWeatherUI: vi.fn()
}));

import { addPinFromName, addSampledWaypoint, addEndpointPin } from '../main.js';
vi.mock('../main.js', () => ({
    addPinFromName: vi.fn(),
    addSampledWaypoint: vi.fn(),
    addEndpointPin: vi.fn()
}));

// 2. Mock globals
global.fetch = vi.fn();
global.alert = vi.fn(); // Browsers have alert(), Node does not!

describe('Route Data Handler Tests', () => {
    let consoleLogSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup the DOM required by this function
        document.body.innerHTML = `
            <div id="weather-section" style="display: none;"></div>
        `;

        // Intercept console.log to keep our test output clean
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should successfully fetch route data, update DOM, and delegate to render handlers', async () => {
        // Setup the fake API response matching your backend structure
        const mockBackendResponse = {
            route: { geometry: "fake-line" },
            coordinates: [
                { lat: 43.82, lng: -111.79 },
                { lat: 47.67, lng: -116.78 }
            ],
            weather: [{ name: "Rexburg" }]
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockBackendResponse)
        });

        const mockLocations = ['Rexburg, ID', 'Coeur d\'Alene, ID'];
        const mockMap = { dummyMap: true };

        // Run the function
        await fetchRouteData(mockLocations, mockMap);

        // 1. Did it format the API call correctly?
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('http://localhost:4010/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locations: mockLocations })
        });

        // 2. Did it loop through coordinates and add pins?
        expect(addEndpointPin).toHaveBeenCalledTimes(2);
        expect(addEndpointPin).toHaveBeenNthCalledWith(1, 43.82, -111.79, 'origin');
        expect(addEndpointPin).toHaveBeenNthCalledWith(2, 47.67, -116.78, 'destination');
        expect(addPinFromName).not.toHaveBeenCalled();

        // 3. Did it delegate the data to the render functions?
        expect(renderRoute).toHaveBeenCalledWith(mockBackendResponse.route, mockMap);
        expect(renderWeatherUI).toHaveBeenCalledWith(mockBackendResponse.weather);

        // 4. Did it unhide the weather section?
        const weatherSection = document.getElementById('weather-section');
        expect(weatherSection.style.display).toBe('block');
    });

    it('should add pins for both route coordinates and sampled coordinates', async () => {
        const mockBackendResponse = {
            route: { geometry: 'fake-line' },
            coordinates: [
                { lat: 43.82, lng: -111.79 },
                { lat: 47.67, lng: -116.78 }
            ],
            sampledCoordinates: [
                { lat: 45.12, lng: -113.44 },
                { lat: 46.55, lng: -115.02 }
            ],
            weather: [{ name: 'Rexburg' }, { name: 'Midpoint' }]
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockBackendResponse)
        });

        await fetchRouteData(['Rexburg, ID', 'Coeur d\'Alene, ID'], { dummyMap: true });

        expect(addEndpointPin).toHaveBeenCalledTimes(2);
        expect(addEndpointPin).toHaveBeenNthCalledWith(1, 43.82, -111.79, 'origin');
        expect(addEndpointPin).toHaveBeenNthCalledWith(2, 47.67, -116.78, 'destination');
        expect(addPinFromName).not.toHaveBeenCalled();
        expect(addSampledWaypoint).toHaveBeenCalledTimes(2);
        expect(addSampledWaypoint).toHaveBeenNthCalledWith(1, 45.12, -113.44, 1);
        expect(addSampledWaypoint).toHaveBeenNthCalledWith(2, 46.55, -115.02, 2);
    });

    it('should show an alert and abort if the locations array is empty', async () => {
        // Run with an empty array
        await fetchRouteData([], {});

        // Did it fire the browser alert?
        expect(global.alert).toHaveBeenCalledWith("Please enter both a start and end location.");
        
        // Ensure it aborted and DID NOT try to hit the API
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should catch and log errors gracefully if the API fails', async () => {
        // Simulate a complete server crash / network error
        const mockError = new Error("Server Offline");
        fetch.mockRejectedValueOnce(mockError);

        const mockLocations = ['Rexburg, ID'];

        // Run the function. It shouldn't crash the test, because you have a try/catch!
        await fetchRouteData(mockLocations, {});

        // It should have caught the error and logged it
        expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
        expect(global.alert).toHaveBeenCalledWith('Server Offline');
        
        // It should NOT have tried to render anything
        expect(renderRoute).not.toHaveBeenCalled();
    });

    it('should catch and log errors if payload is malformed', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                weather: []
            })
        });

        await fetchRouteData(['Rexburg, ID'], {});

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        expect(global.alert).toHaveBeenCalledWith('Could not generate a valid route for those points. Please try different locations.');
        expect(renderRoute).not.toHaveBeenCalled();
    });

    it('should alert with backend error message when route endpoint returns non-OK', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'No drivable route found between selected points.' })
        });

        await fetchRouteData(['Ocean Point A', 'Ocean Point B'], {});

        expect(global.alert).toHaveBeenCalledWith('No drivable route found between selected points.');
        expect(renderRoute).not.toHaveBeenCalled();
        expect(renderWeatherUI).not.toHaveBeenCalled();
    });
});