import request from 'supertest';
import { app } from '../../src/app';
import { API_PREFIX } from '../../src/config/env';

describe('CORS', () => {
    it('allows requests from the Angular dev server', async () => {
        const res = await request(app).get(`${API_PREFIX}/sites`).set('Origin', 'http://localhost:4200');

        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    });

    it('does not allow other websites', async () => {
        const res = await request(app).get(`${API_PREFIX}/sites`).set('Origin', 'http://example.com');

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});