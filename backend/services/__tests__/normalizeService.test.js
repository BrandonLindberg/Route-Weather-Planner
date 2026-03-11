import { describe, it, expect, vi, beforeEach } from 'vitest';
import normalizeLocations from '../normalizeService.js';

// 1. Import the dependency so we can mock it
import geocodeName from '../geocodeService.js';

// 2. Mock the geocode service
vi.mock('../geocodeService.js', () => ({
    default: vi.fn()
}));

describe('Normalize Service Tests', () => {

    beforeEach(() => {
        // Clear out mock counts before each test
        vi.clearAllMocks();
    });

    it('should pass through raw coordinates without calling the geocoder', async () => {
        const input = [
            { type: "coords", lat: 43.82, lng: -111.79 }, // Rexburg
            { type: "coords", lat: 47.67, lng: -116.78 }  // Coeur d'Alene
        ];

        // Run the function
        const result = await normalizeLocations(input);

        // Assertions
        expect(result).toEqual([
            { lat: 43.82, lng: -111.79 },
            { lat: 47.67, lng: -116.78 }
        ]);
        
        // CRUCIAL: Ensure the traffic cop didn't accidentally call the geocoder!
        expect(geocodeName).not.toHaveBeenCalled(); 
    });

    it('should call the geocoder for named locations', async () => {
        // Setup our mock to return fake coordinates in order
        geocodeName
            .mockResolvedValueOnce({ lat: 43.82, lng: -111.79 })
            .mockResolvedValueOnce({ lat: 47.67, lng: -116.78 });

        const input = [
            { type: "name", value: "Rexburg, ID" },
            { type: "name", value: "Coeur d'Alene, ID" }
        ];

        const result = await normalizeLocations(input);

        expect(result).toEqual([
            { lat: 43.82, lng: -111.79 },
            { lat: 47.67, lng: -116.78 }
        ]);
        
        // Did it call the geocoder exactly twice?
        expect(geocodeName).toHaveBeenCalledTimes(2);
        // Did it pass the right strings?
        expect(geocodeName).toHaveBeenNthCalledWith(1, "Rexburg, ID");
        expect(geocodeName).toHaveBeenNthCalledWith(2, "Coeur d'Alene, ID");
    });

    it('should handle a mix of coordinates and names perfectly', async () => {
        // Mock only the one name it will need to translate
        geocodeName.mockResolvedValueOnce({ lat: 47.67, lng: -116.78 });

        const input = [
            { type: "coords", lat: 43.82, lng: -111.79 }, // User clicked the map
            { type: "name", value: "Coeur d'Alene, ID" }  // User typed a city
        ];

        const result = await normalizeLocations(input);

        expect(result).toEqual([
            { lat: 43.82, lng: -111.79 },
            { lat: 47.67, lng: -116.78 }
        ]);
        
        // It should only call the geocoder for the second item
        expect(geocodeName).toHaveBeenCalledTimes(1);
        expect(geocodeName).toHaveBeenCalledWith("Coeur d'Alene, ID");
    });
});