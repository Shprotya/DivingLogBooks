import request from 'supertest';
import { app } from '../../src/app';
import { SiteModel, ISite } from '../../src/models/site_model';

// A valid site reused across tests
const validSite: ISite = {
    name: 'Test Reef',
    country: 'Ireland',
    maxDepth: 20,
    siteType: 'reef',
    difficulty: 'beginner',
};

// A correctly formatted id that doesn't belong to any site
const missingId = '665000000000000000000000';

// The database connection is opened and closed in tests/setup.ts

beforeAll(async () => {
    // Make sure the unique index exists before the duplicate test runs
    await SiteModel.init();
});

beforeEach(async () => {
    // Every test starts with an empty sites collection
    await SiteModel.deleteMany({});
});

afterAll(async () => {
    await SiteModel.deleteMany({});
});

describe('POST /logbook/sites', () => {
    it('creates a site with valid data (201)', async () => {
        const res = await request(app).post('/logbook/sites').send(validSite);

        expect(res.status).toBe(201);
        expect(res.body._id).toBeDefined();
        expect(res.body.name).toBe('Test Reef');
        expect(res.body.maxDepth).toBe(20);
    });

    it('trims spaces from the name', async () => {
        const res = await request(app)
            .post('/logbook/sites')
            .send({ ...validSite, name: '   Spacey Reef   ' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Spacey Reef');
    });

    it('rejects a site with missing fields (400)', async () => {
        const res = await request(app).post('/logbook/sites').send({ name: 'Incomplete' });

        expect(res.status).toBe(400);
    });

    it('rejects a depth over 130 m (400)', async () => {
        const res = await request(app).post('/logbook/sites').send({ ...validSite, maxDepth: 200 });

        expect(res.status).toBe(400);
    });

    it('rejects an invalid site type (400)', async () => {
        const res = await request(app).post('/logbook/sites').send({ ...validSite, siteType: 'beach' });

        expect(res.status).toBe(400);
    });

    it('rejects a duplicate name in the same country (409)', async () => {
        await request(app).post('/logbook/sites').send(validSite);
        const res = await request(app).post('/logbook/sites').send(validSite);

        expect(res.status).toBe(409);
    });

    it('allows the same name in a different country (201)', async () => {
        await request(app).post('/logbook/sites').send(validSite);
        const res = await request(app).post('/logbook/sites').send({ ...validSite, country: 'Malta' });

        expect(res.status).toBe(201);
    });
});

describe('GET /logbook/sites', () => {
    beforeEach(async () => {
        await SiteModel.create([
            { name: 'Shallow Reef', country: 'Ireland', maxDepth: 10, siteType: 'reef', difficulty: 'beginner' },
            { name: 'Deep Wall', country: 'Ireland', maxDepth: 45, siteType: 'wall', difficulty: 'advanced' },
            { name: 'Old Wreck', country: 'Malta', maxDepth: 30, siteType: 'wreck', difficulty: 'intermediate' },
        ]);
    });

    it('returns all sites (200)', async () => {
        const res = await request(app).get('/logbook/sites');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
    });

    it('filters by site type', async () => {
        const res = await request(app).get('/logbook/sites?siteType=wreck');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Old Wreck');
    });

    it('filters by country, ignoring case', async () => {
        const res = await request(app).get('/logbook/sites?country=IRELAND');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('combines filters', async () => {
        const res = await request(app).get('/logbook/sites?country=ireland&difficulty=advanced');

        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Deep Wall');
    });

    it('sorts by depth, deepest first', async () => {
        const res = await request(app).get('/logbook/sites?sort=-maxDepth');

        const depths = res.body.map((site: ISite) => site.maxDepth);
        expect(depths).toEqual([45, 30, 10]);
    });

    it('treats regex characters in country as plain text', async () => {
        const res = await request(app).get('/logbook/sites?country=.*');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });
});

describe('GET /logbook/sites/:id', () => {
    it('returns a site that exists (200)', async () => {
        const site = await SiteModel.create(validSite);
        const res = await request(app).get(`/logbook/sites/${site._id}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Test Reef');
    });

    it('returns 404 for a site that does not exist', async () => {
        const res = await request(app).get(`/logbook/sites/${missingId}`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id format', async () => {
        const res = await request(app).get('/logbook/sites/abc');

        expect(res.status).toBe(400);
    });
});

describe('PUT /logbook/sites/:id', () => {
    it('updates a site that exists (200)', async () => {
        const site = await SiteModel.create(validSite);
        const res = await request(app)
            .put(`/logbook/sites/${site._id}`)
            .send({ ...validSite, maxDepth: 25, difficulty: 'intermediate' });

        expect(res.status).toBe(200);
        expect(res.body.maxDepth).toBe(25);
        expect(res.body.difficulty).toBe('intermediate');
    });

    it('returns 404 when the site does not exist', async () => {
        const res = await request(app).put(`/logbook/sites/${missingId}`).send(validSite);

        expect(res.status).toBe(404);
    });

    it('returns 400 when the data is invalid', async () => {
        const site = await SiteModel.create(validSite);
        const res = await request(app)
            .put(`/logbook/sites/${site._id}`)
            .send({ ...validSite, maxDepth: -5 });

        expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid id format', async () => {
        const res = await request(app).put('/logbook/sites/abc').send(validSite);

        expect(res.status).toBe(400);
    });
});

describe('DELETE /logbook/sites/:id', () => {
    it('deletes a site that exists (204), and it is then gone', async () => {
        const site = await SiteModel.create(validSite);

        const res = await request(app).delete(`/logbook/sites/${site._id}`);
        expect(res.status).toBe(204);

        const check = await request(app).get(`/logbook/sites/${site._id}`);
        expect(check.status).toBe(404);
    });

    it('returns 404 when the site does not exist', async () => {
        const res = await request(app).delete(`/logbook/sites/${missingId}`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id format', async () => {
        const res = await request(app).delete('/logbook/sites/abc');

        expect(res.status).toBe(400);
    });
});