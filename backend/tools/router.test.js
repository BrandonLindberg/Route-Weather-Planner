import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

import router from './router.js';

// 1. Mock the services
vi.mock('../services/normalizeService.js', () => ({
    default: vi.fn().mockResolvedValue([
        { lat: 43.82, lng: -111.79 },
        { lat: 47.67, lng: -116.78 }
    ])
}));

vi.mock('../services/routeService.js', () => ({
    default: vi.fn().mockResolvedValue({ 
        legs: [{ duration: 29520 }],
        // FIX: Added geometry so router.js doesn't crash on route.geometry.coordinates
        geometry: { coordinates: [[-111.79, 43.82], [-116.78, 47.67]] } 
    })
}));

// FIX: Mock sampleRoutePoints so it doesn't try to compute math on fake data
vi.mock('../services/sampleRoutePoints.js', () => ({
    default: vi.fn().mockReturnValue({
        coords: [[-111.79, 43.82], [-116.78, 47.67]],
        etas: [1710960000, 1710985092]
    })
}));

vi.mock('../services/weatherService.js', () => ({
    default: vi.fn().mockResolvedValue([
        { name: "Rexburg", main: { temp: 70 }, weather: [{ description: "clear sky" }] },
        { name: "Coeur d'Alene", main: { temp: 65 }, weather: [{ description: "partly cloudy" }] }
    ])
}));

// 2. Set up mini Express app
const app = express();
app.use(express.json());
app.use('/api', router);

// 3. The Tests
describe('Router Integration Tests', () => {
    
    it('POST /api/route should successfully return coordinates, route, and weather', async () => {
        const response = await request(app)
            .post('/api/route')
            .send({ locations: ['Rexburg, ID', 'Coeur d\'Alene, ID'] });

        // FIX: Expect 200 OK for a successful request
        expect(response.status).toBe(200);
        
        expect(response.body).toHaveProperty('coordinates');
        expect(response.body).toHaveProperty('route');
        expect(response.body).toHaveProperty('weather');
        
        expect(response.body.weather[0].name).toBe("Rexburg");
    });

    it('POST /api/route should fail gracefully if missing data', async () => {
        const response = await request(app)
            .post('/api/route')
            .send({}); 

        // FIX: Expect 400 Bad Request for user errors
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });
});