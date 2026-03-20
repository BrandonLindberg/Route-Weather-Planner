import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './server.js';

describe('Server Configuration Tests', () => {

    // it('should apply custom security headers to all responses', async () => {
    //     const response = await request(app).get('/random-non-existent-route');
    //     console.log("ACTUAL HEADERS:", response.headers);
    //     expect(response.headers['access-control-allow-origin']).toBe('*');
    //     expect(response.headers['content-security-policy']).toBe("default-src 'self'; style-src 'self' 'unsafe-inline';");
    // });

    it('should have CORS enabled', async () => {
        const response = await request(app)
            .options('/api/route')
            .set('Origin', 'http://localhost:3000')
            .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204); 
        expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should have the /api router successfully mounted', async () => {
        const response = await request(app)
            .post('/api/route')
            .send({}); 

        expect(response.status).not.toBe(404);
        // FIX: Expect 400 instead of 500 because our router now validates empty data!
        expect(response.status).toBe(400); 
    });
});