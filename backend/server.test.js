import { describe, it, expect } from 'vitest';
import request from 'supertest';

// Import our newly exported Express app!
import app from './server.js';

describe('Server Configuration Tests', () => {

    it('should apply custom security headers to all responses', async () => {
        // We can make a GET request to a totally fake route just to check the global headers
        const response = await request(app).get('/random-non-existent-route');

        // Express lowercases header names in the response object, so we check for lowercase
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['content-security-policy']).toBe("default-src 'self'; style-src 'self' 'unsafe-inline';");
    });

    it('should have CORS enabled', async () => {
        // A standard CORS preflight request
        const response = await request(app)
            .options('/api/route')
            .set('Origin', 'http://localhost:3000')
            .set('Access-Control-Request-Method', 'POST');

        // If CORS is set up via app.use(cors()), it should respond properly to OPTIONS
        expect(response.status).toBe(204); 
        expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should have the /api router successfully mounted', async () => {
        // Let's hit the actual API route we made. 
        // We will send empty data, so we expect your router's catch block to fire (500 error),
        // but the crucial part is that it DOES NOT return a 404 Not Found!
        const response = await request(app)
            .post('/api/route')
            .send({}); 

        // 404 would mean the router isn't mounted. 500 means it hit the router and failed gracefully.
        expect(response.status).not.toBe(404);
        expect(response.status).toBe(500);
    });
});