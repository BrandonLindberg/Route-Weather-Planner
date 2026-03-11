import { describe, it, expect, vi } from 'vitest';
import getWeather from '../weatherService.js';

// Intercept the global fetch function
global.fetch = vi.fn();

describe('Weather Service', () => {
    
    it('should successfully calculate ETA and return formatted weather', async () => {
        // Provide the fake API response
        const fakeOpenWeatherData = {
            city: { name: "Fake Boise", timezone: -21600 },
            list: [
                { dt: 1710000000, main: { temp: 75 }, weather: [{ description: "sunny", icon: "01d" }] }
            ]
        };
        
        // Tell fetch to return our fake data instead of hitting the internet
        fetch.mockResolvedValue({
            json: () => Promise.resolve(fakeOpenWeatherData)
        });

        // Run actual function
        const mockCoords = [{ lat: 43.61, lng: -116.20 }];
        const mockEtas = [1710000000];
        const result = await getWeather(mockCoords, mockEtas);

        // Assert that function formatted the data correctly
        expect(result[0].name).toBe("Fake Boise");
        expect(result[0].main.temp).toBe(75);
        expect(result[0].timezone_offset).toBe(-21600);
    });
});