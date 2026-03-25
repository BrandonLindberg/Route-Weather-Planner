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

    it('should choose the forecast entry closest to the ETA timestamp', async () => {
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                city: { name: 'Boise', timezone: -21600 },
                list: [
                    { dt: 1710000000, main: { temp: 60 }, weather: [{ description: 'cloudy', icon: '03d' }] },
                    { dt: 1710003600, main: { temp: 68 }, weather: [{ description: 'sunny', icon: '01d' }] },
                    { dt: 1710007200, main: { temp: 72 }, weather: [{ description: 'clear', icon: '01n' }] }
                ]
            })
        });

        const result = await getWeather([{ lat: 43.61, lng: -116.2 }], [1710003000]);

        expect(result).toHaveLength(1);
        expect(result[0].main.temp).toBe(68);
        expect(result[0].weather[0].description).toBe('sunny');
    });

    it('should return null item when forecast payload has no list', async () => {
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ city: { name: 'Nowhere' } })
        });

        const result = await getWeather([{ lat: 0, lng: 0 }], [1710000000]);

        expect(result).toEqual([null]);
    });
});