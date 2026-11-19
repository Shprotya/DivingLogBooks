import request from 'supertest';
import { app } from '../../src/app';
import { API_PREFIX, CLIENT_ORIGINS } from '../../src/config/env';

const allowedOrigin = CLIENT_ORIGINS[0];

describe('CORS', () => {
    it('allows requests from the Angular dev server', async () => {
        const res = await request(app).get(`${API_PREFIX}/sites`).set('Origin', allowedOrigin);

        expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    });

    it('does not allow other websites', async () => {
        const res = await request(app).get(`${API_PREFIX}/sites`).set('Origin', 'http://example.com');

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});