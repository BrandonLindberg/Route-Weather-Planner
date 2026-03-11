import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSafetyReview } from '../aiService.js';

// 1. Mock the Weather Service
import getWeather from '../weatherService.js';
vi.mock('../weatherService.js', () => ({
    default: vi.fn()
}));

// 2. Mock the Gemini API Client
vi.mock('@google/generative-ai', () => {
    // Create a fake generateContent function that returns exactly what the real API would
    const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
            text: () => "Mocked AI Safety Review: Drive carefully through the predicted rain in Coeur d'Alene."
        }
    });

    // Return a fake GoogleGenerativeAI class
    return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent: mockGenerateContent
            })
        }))
    };
});

describe('AI Service Tests', () => {

    beforeEach(() => {
        // Clear out any old data between tests so they don't interfere with each other
        vi.clearAllMocks();
    });

    it('should successfully format weather and return an AI safety review', async () => {
        // Setup fake weather data that getWeather will return
        getWeather.mockResolvedValue([
            { eta_timestamp: 1710000000, main: { temp: 70 }, weather: [{ description: "clear sky" }] },
            { eta_timestamp: 1710028800, main: { temp: 55 }, weather: [{ description: "light rain" }] }
        ]);

        const startCoords = "43.82, -111.79"; // Rexburg
        const endCoords = "47.67, -116.78";   // Coeur d'Alene

        // Run the actual function
        const result = await generateSafetyReview(startCoords, endCoords, [], [1710000000, 1710028800]);

        // Assertions
        expect(getWeather).toHaveBeenCalledTimes(1);
        expect(result).toBe("Mocked AI Safety Review: Drive carefully through the predicted rain in Coeur d'Alene.");
    });

    it('should handle weather service failures gracefully and still request an AI review', async () => {
        // Force the weather service to throw an error to test your catch block
        getWeather.mockRejectedValue(new Error("Weather API Down"));

        const startCoords = "43.82, -111.79";
        const endCoords = "47.67, -116.78";

        // The function should still run and return the AI text, but using "Data unavailable" internally
        const result = await generateSafetyReview(startCoords, endCoords, [], []);

        expect(getWeather).toHaveBeenCalledTimes(1);
        expect(result).toContain("Mocked AI Safety Review");
    });
});