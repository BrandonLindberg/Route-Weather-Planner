// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleRainRadar, toggleAnimatedPrecipitation } from '../handlers/rainRadarHandler.js';

// 1. Mock Leaflet entirely
const mockAddTo = vi.fn();
vi.mock('leaflet', () => {
    return {
        default: {
            tileLayer: vi.fn(() => ({
                addTo: mockAddTo
            }))
        }
    };
});
import L from 'leaflet'; // Import our fake Leaflet to run expectations on it

// 2. Mock Global Fetch
global.fetch = vi.fn();

describe('Rain Radar Handler Tests', () => {
    // A fake map object to pass into your functions
    let mockMap;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset our fake map before every test
        mockMap = {
            hasLayer: vi.fn().mockReturnValue(false),
            removeLayer: vi.fn()
        };

        // Reset the global window variable your code uses
        window.rainViewerFrames = undefined;
    });

    afterEach(() => {
        // Reset system time if we mocked it
        vi.useRealTimers();
    });

    it('should fetch data and add the standard radar layer to the map', async () => {
        // Fake API response
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                radar: { past: [{ path: '/fake-timestamp-1' }, { path: '/fake-timestamp-2' }] }
            })
        });

        await toggleRainRadar(mockMap);

        // Did it fetch?
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('https://api.rainviewer.com/public/weather-maps.json');

        // Did it grab the LATEST (last) timestamp from the array to create the layer?
        expect(L.tileLayer).toHaveBeenCalledWith(
            'https://tilecache.rainviewer.com/fake-timestamp-2/256/{z}/{x}/{y}/2/1_1.png',
            expect.any(Object) // We don't need to match the exact TILE_OPTS object
        );

        // Did it add that layer to the map?
        expect(mockAddTo).toHaveBeenCalledWith(mockMap);
    });

    it('should remove the layer if it already exists (Toggle Off)', async () => {
        // Force the map to say "Yes, I already have a rain layer"
        mockMap.hasLayer.mockReturnValue(true);

        // We need to run it once first to set the local `rainLayer` variable
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ radar: { past: [{ path: '/time' }] } })
        });
        await toggleRainRadar(mockMap); // Toggles ON

        // Now run it again to toggle it OFF
        await toggleRainRadar(mockMap); 

        // It should have called removeLayer
        expect(mockMap.removeLayer).toHaveBeenCalledTimes(1);
    });

    it('should use cached data and NOT fetch again within 10 minutes', async () => {
        // We will control the system clock to test your cache!
        vi.useFakeTimers(); 

        fetch.mockResolvedValue({
            json: () => Promise.resolve({ radar: { past: [{ path: '/time' }] } })
        });

        // Call 1: Should fetch
        await toggleRainRadar(mockMap);
        expect(fetch).toHaveBeenCalledTimes(1);

        // Advance time by 5 minutes
        vi.advanceTimersByTime(5 * 60 * 1000);

        // We need to toggle it off first so we can toggle it back on
        mockMap.hasLayer.mockReturnValue(true);
        await toggleRainRadar(mockMap); 
        
        // Call 2: Toggle it back on. It should NOT fetch again!
        mockMap.hasLayer.mockReturnValue(false);
        await toggleRainRadar(mockMap);

        expect(fetch).toHaveBeenCalledTimes(1); // Still exactly 1! Your cache works!
    });

    it('should fetch data, create layer, and set window.rainViewerFrames for animated forecast', async () => {
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                radar: { 
                    past: [{ path: '/past-1' }],
                    nowcast: [{ path: '/future-1' }]
                }
            })
        });

        await toggleAnimatedPrecipitation(mockMap);

        // Did it create the layer using the last forecast frame?
        expect(L.tileLayer).toHaveBeenCalledWith(
            'https://tilecache.rainviewer.com/future-1/256/{z}/{x}/{y}/2/1_1.png',
            expect.any(Object)
        );

        // Did it attach the combined frames to the global window object?
        expect(window.rainViewerFrames).toEqual([
            { path: '/past-1' },
            { path: '/future-1' }
        ]);
    });
});