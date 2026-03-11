import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import getRoute from '../services/routeService.js';

// 1. Intercept the global fetch function
global.fetch = vi.fn();

describe('Route Service Tests', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        // Intercept console.error so it doesn't print messy red text in our test runner,
        // but we can still track if it was called correctly!
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Clean up our mocks after every test
        vi.clearAllMocks();
    });

    it('should successfully format coordinates, fetch OSRM data, and return the route', async () => {
        // 2. Setup the fake OSRM response
        const mockOsrmResponse = {
            routes: [
                {
                    distance: 500000,
                    duration: 29520, // Our ~8.2 hours
                    geometry: { type: "LineString", coordinates: [] }
                }
            ]
        };

        // Tell fetch to pretend the request succeeded (ok: true)
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockOsrmResponse)
        });

        // 3. The input coordinates (Rexburg to Coeur d'Alene)
        const inputCoords = [
            { lat: 43.82, lng: -111.79 },
            { lat: 47.67, lng: -116.78 }
        ];

        // Run the function
        const result = await getRoute(inputCoords);

        // 4. Assertions
        expect(fetch).toHaveBeenCalledTimes(1);

        // CRUCIAL: Did it format as Longitude,Latitude like OSRM expects?
        expect(fetch).toHaveBeenCalledWith(
            'https://router.project-osrm.org/route/v1/driving/-111.79,43.82;-116.78,47.67?overview=full&geometries=geojson'
        );

        // Did it return exactly the first route object?
        expect(result.duration).toBe(29520);
    });

    it('should throw an error and log it if the OSRM API fails (e.g., an impossible route)', async () => {
        // Simulate an API failure (like trying to drive from Rexburg to Hawaii)
        fetch.mockResolvedValue({
            ok: false,
            text: () => Promise.resolve('No route found between coordinates')
        });

        const inputCoords = [
            { lat: 43.82, lng: -111.79 },
            { lat: 21.30, lng: -157.85 } // Honolulu
        ];

        // We expect the function to throw our custom error message
        await expect(getRoute(inputCoords)).rejects.toThrow('Routing failed: No route found between coordinates');

        // We expect your console.error to have fired with the exact text
        expect(consoleErrorSpy).toHaveBeenCalledWith('OSRM error:', 'No route found between coordinates');
    });
});