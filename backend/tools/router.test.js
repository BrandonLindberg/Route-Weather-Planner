import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

import router from './router.js';
import normalizeLocations from '../services/normalizeService.js';
import getRoute from '../services/routeService.js';
import getWeather from '../services/weatherService.js';
import sampleRoutePoints from '../services/sampleRoutePoints.js';
import { generateSafetyReview } from '../services/aiService.js';

// 1. Mock the services
vi.mock('../services/normalizeService.js', () => ({
    default: vi.fn().mockResolvedValue([
        { lat: 43.82, lng: -111.79 },
        { lat: 47.67, lng: -116.78 }
    ])
}));

vi.mock('../services/routeService.js', () => ({
    default: vi.fn().mockResolvedValue({ 
        distance: 500000,
        legs: [{ duration: 29520 }],
        geometry: { coordinates: [[-111.79, 43.82], [-116.78, 47.67]] } 
    })
}));

vi.mock('../services/sampleRoutePoints.js', () => ({
    default: vi.fn().mockReturnValue({
        coords: [{ lat: 43.82, lng: -111.79 }, { lat: 47.67, lng: -116.78 }],
        etas: [1710960000, 1710985092]
    })
}));

vi.mock('../services/weatherService.js', () => ({
    default: vi.fn().mockResolvedValue([
        { name: "Rexburg", main: { temp: 70 }, weather: [{ description: "clear sky" }] },
        { name: "Coeur d'Alene", main: { temp: 65 }, weather: [{ description: "partly cloudy" }] }
    ])
}));

vi.mock('../services/aiService.js', () => ({
    generateSafetyReview: vi.fn().mockResolvedValue('Safe trip overall with light rain near destination.')
}));

// 2. Set up mini Express app
const app = express();
app.use(express.json());
app.use('/api', router);

// 3. The Tests
describe('Router Integration Tests', () => {

    it('POST /api/route should reject missing locations with 400', async () => {
        const response = await request(app)
            .post('/api/route')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing or invalid locations array.' });
        expect(normalizeLocations).not.toHaveBeenCalled();
    });
    
    it('POST /api/route should successfully return coordinates, route, and weather', async () => {
        const response = await request(app)
            .post('/api/route')
            .send({ locations: ['Rexburg, ID', 'Coeur d\'Alene, ID'] });

        expect(response.status).toBe(200);
        
        expect(response.body).toHaveProperty('coordinates');
        expect(response.body).toHaveProperty('sampledCoordinates');
        expect(response.body).toHaveProperty('route');
        expect(response.body).toHaveProperty('weather');
        
        expect(response.body.weather[0].name).toBe("Rexburg");
        expect(sampleRoutePoints).toHaveBeenCalledTimes(1);
        expect(sampleRoutePoints).toHaveBeenCalledWith(
            [[-111.79, 43.82], [-116.78, 47.67]],
            expect.any(Array),
            9
        );
        expect(getWeather).toHaveBeenCalledWith(
            [{ lat: 43.82, lng: -111.79 }, { lat: 47.67, lng: -116.78 }],
            [1710960000, 1710985092]
        );
    });

    it('POST /api/route should return 500 if a downstream service fails', async () => {
        normalizeLocations.mockRejectedValueOnce(new Error('Geocoding unavailable'));

        const response = await request(app)
            .post('/api/route')
            .send({ locations: [{ type: 'name', value: 'Boise, ID' }] });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to generate route data.' });
    });

    it('POST /api/review should return 400 when start or end is missing', async () => {
        const response = await request(app)
            .post('/api/review')
            .send({ startCoords: '43.82, -111.79' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing start or end coordinates' });
        expect(generateSafetyReview).not.toHaveBeenCalled();
    });

    it('POST /api/review should return review text when service succeeds', async () => {
        const response = await request(app)
            .post('/api/review')
            .send({
                startCoords: '43.82, -111.79',
                endCoords: '47.67, -116.78',
                midCoords: ['45.0, -113.0']
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ review: 'Safe trip overall with light rain near destination.' });
        expect(generateSafetyReview).toHaveBeenCalledWith(
            '43.82, -111.79',
            '47.67, -116.78',
            ['45.0, -113.0']
        );
    });

    it('POST /api/review should return 500 when AI service throws', async () => {
        generateSafetyReview.mockRejectedValueOnce(new Error('Model timeout'));

        const response = await request(app)
            .post('/api/review')
            .send({
                startCoords: '43.82, -111.79',
                endCoords: '47.67, -116.78',
                midCoords: []
            });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to generate review.' });
    });
});