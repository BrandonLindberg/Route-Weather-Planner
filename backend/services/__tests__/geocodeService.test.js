import { describe, it, expect, vi, afterEach } from 'vitest';
import geocodeName from '../geocodeService.js';

// 1. Intercept the global browser/Node fetch function
global.fetch = vi.fn();

describe('Geocode Service Tests', () => {

    afterEach(() => {
        // Clear the mock history after each test so they stay isolated
        vi.clearAllMocks();
    });

    it('should successfully fetch and parse coordinates for a valid city', async () => {
        // 2. Setup the fake API response
        // Note: Nominatim returns an array, and lat/lon are strings in their JSON!
        const mockNominatimData = [
            { lat: "43.8231", lon: "-111.7924", display_name: "Rexburg, Madison County, Idaho, USA" }
        ];
        
        // Tell fetch to return our fake data
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockNominatimData)
        });

        // 3. Run the function
        const result = await geocodeName('Rexburg, ID');

        // 4. Assertions
        expect(fetch).toHaveBeenCalledTimes(1);
        
        // Did it encode the URL correctly? (Replacing spaces with %20, commas with %2C)
        expect(fetch).toHaveBeenCalledWith(
            'https://nominatim.openstreetmap.org/search?format=json&q=Rexburg%2C%20ID',
            {
                headers: {
                    'User-Agent': 'SkyRoute/1.0 (Route Weather Planner)',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                signal: expect.any(AbortSignal)
            }
        );
        
        // Did it parse the strings into floats properly?
        expect(result.lat).toBe(43.8231);
        expect(result.lng).toBe(-111.7924);
    });

    it('should throw an error if the network request fails', async () => {
        // Simulate a network crash
        fetch.mockRejectedValue(new Error('Network failure'));

        // We expect the function to throw this error upwards to whoever called it
        await expect(geocodeName('Atlantis')).rejects.toThrow('Network failure');
    });

    it('should throw a clear error when geocoding returns no results', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([])
        });

        await expect(geocodeName('A Place That Does Not Exist')).rejects.toThrow(
            'No geocoding results found for: A Place That Does Not Exist'
        );
    });
});