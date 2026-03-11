import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// 1. Import your actual router
import router from './router.js';

// 2. Mock the services so we don't hit real APIs (OSRM, OpenWeather)
vi.mock('../services/normalizeService.js', () => ({
    default: vi.fn().mockResolvedValue([
        { lat: 43.82, lng: -111.79 }, // Fake Rexburg
        { lat: 47.67, lng: -116.78 }  // Fake Coeur d'Alene
    ])
}));

vi.mock('../services/routeService.js', () => ({
    default: vi.fn().mockResolvedValue({ 
        legs: [{ duration: 29520 }] // ~8.2 hours in seconds
    })
}));

vi.mock('../services/weatherService.js', () => ({
    default: vi.fn().mockResolvedValue([
        { name: "Rexburg", main: { temp: 70 }, weather: [{ description: "clear sky" }] },
        { name: "Coeur d'Alene", main: { temp: 65 }, weather: [{ description: "partly cloudy" }] }
    ])
}));

// 3. Set up a mini Express app just for this test
const app = express();
app.use(express.json()); // We need this so Express can read req.body!
app.use('/api', router); // Mount the router

// 4. The actual tests
describe('Router Integration Tests', () => {
    
    it('POST /api/route should successfully return coordinates, route, and weather', async () => {
        // Shoot a fake request at our mini-app
        const response = await request(app)
            .post('/api/route')
            .send({ locations: ['Rexburg, ID', 'Coeur d\'Alene, ID'] });

        // Assertions: Did the router do its job?
        expect(response.status).toBe(200);
        
        // Did it return the 3 main pieces of data?
        expect(response.body).toHaveProperty('coordinates');
        expect(response.body).toHaveProperty('route');
        expect(response.body).toHaveProperty('weather');
        
        // Did the weather data pass through correctly?
        expect(response.body.weather[0].name).toBe("Rexburg");
    });

    it('POST /api/route should fail gracefully if missing data (Optional Edge Case)', async () => {
        // You can easily test how your router handles errors!
        // In this case, passing no data should trigger your catch block.
        const response = await request(app)
            .post('/api/route')
            .send({}); 

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
    });

});