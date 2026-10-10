import request from 'supertest';
import { Types } from 'mongoose';
import { app } from '../../src/app';
import { SiteModel } from '../../src/models/site_model';
import { DiveModel } from '../../src/models/dive_model';

// Same prefix as in app.ts and site.test.ts
const BASE = '/logbook';

// A correctly formatted id that doesn't belong to anything
const missingId = '665000000000000000000000';

// Created fresh before every test
let siteId: string;

// A valid dive at the test site (max depth 25 m)
const validDive = () => ({
    date: '2026-05-03T10:30:00Z',
    site: siteId,
    maxDepth: 18,
    duration: 45,
    waterTemp: 12,
    visibility: 8,
    rating: 4,
    notes: 'Test dive',
    sightings: [{ name: 'Grey Seal', count: 3 }, { name: 'OCTOPUS' }],
});

// The database connection is opened and closed in tests/setup.ts

beforeEach(async () => {
    // Every test starts with no dives and exactly one site
    await DiveModel.deleteMany({});
    await SiteModel.deleteMany({});

    const site = await SiteModel.create({
        name: 'Test Shore',
        country: 'Ireland',
        maxDepth: 25,
        siteType: 'shore',
        difficulty: 'beginner',
    });
    siteId = site._id.toString();
});

afterAll(async () => {
    await DiveModel.deleteMany({});
    await SiteModel.deleteMany({});
});

describe('POST /dives', () => {
    it('creates a dive with valid data (201)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send(validDive());

        expect(res.status).toBe(201);
        expect(res.body._id).toBeDefined();
        expect(res.body.site).toBe(siteId);
        expect(res.body.maxDepth).toBe(18);
    });

    it('stores sighting names in lowercase and defaults count to 1', async () => {
        const res = await request(app).post(`${BASE}/dives`).send(validDive());

        expect(res.body.sightings).toEqual([
            { name: 'grey seal', count: 3 },
            { name: 'octopus', count: 1 },
        ]);
    });

    it('accepts a dive with only the required fields (201)', async () => {
        const res = await request(app)
            .post(`${BASE}/dives`)
            .send({ date: '2026-05-03', site: siteId, maxDepth: 10, duration: 30 });

        expect(res.status).toBe(201);
        expect(res.body.sightings).toEqual([]);
        expect(res.body.rating).toBeUndefined();
    });

    it('accepts a dive exactly as deep as the site (201)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ ...validDive(), maxDepth: 25 });

        expect(res.status).toBe(201);
    });

    it('rejects a dive with missing fields (400)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ notes: 'No required fields' });

        expect(res.status).toBe(400);
    });

    it('rejects a date in the future (400)', async () => {
        const res = await request(app)
            .post(`${BASE}/dives`)
            .send({ ...validDive(), date: '2099-01-01T10:00:00Z' });

        expect(res.status).toBe(400);
    });

    it('rejects text that is not a date (400)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ ...validDive(), date: 'yesterday' });

        expect(res.status).toBe(400);
    });

    it('rejects a rating above 5 (400)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ ...validDive(), rating: 6 });

        expect(res.status).toBe(400);
    });

    it('rejects a sighting with an empty name (400)', async () => {
        const res = await request(app)
            .post(`${BASE}/dives`)
            .send({ ...validDive(), sightings: [{ name: '' }] });

        expect(res.status).toBe(400);
    });

    it('rejects a site id with the wrong format (400)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ ...validDive(), site: 'abc' });

        expect(res.status).toBe(400);
    });

    it('rejects a site that does not exist (400)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ ...validDive(), site: missingId });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('does not exist');
    });

    it('rejects a dive deeper than the site (400)', async () => {
        const res = await request(app).post(`${BASE}/dives`).send({ ...validDive(), maxDepth: 30 });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('deeper');
    });
});

describe('GET /dives', () => {
    let otherSiteId: string;

    beforeEach(async () => {
        const otherSite = await SiteModel.create({
            name: 'Test Wall',
            country: 'Malta',
            maxDepth: 40,
            siteType: 'wall',
            difficulty: 'advanced',
        });
        otherSiteId = otherSite._id.toString();

        await DiveModel.create([
            {
                date: new Date('2026-04-12'),
                site: siteId,
                maxDepth: 14,
                duration: 50,
                rating: 4,
                sightings: [{ name: 'grey seal', count: 2 }],
            },
            {
                date: new Date('2026-07-19'),
                site: siteId,
                maxDepth: 20,
                duration: 55,
                rating: 5,
                sightings: [{ name: 'grey seal', count: 5 }, { name: 'octopus', count: 1 }],
            },
            {
                date: new Date('2025-09-14'),
                site: otherSiteId,
                maxDepth: 24,
                duration: 38,
                rating: 3,
                sightings: [{ name: 'barracuda', count: 12 }],
            },
        ]);
    });

    it('returns all dives, newest first (200)', async () => {
        const res = await request(app).get(`${BASE}/dives`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
        const depths = res.body.map((dive: { maxDepth: number }) => dive.maxDepth);
        expect(depths).toEqual([20, 14, 24]);
    });

    it("includes each site's name and country", async () => {
        const res = await request(app).get(`${BASE}/dives`);

        expect(res.body[0].site.name).toBe('Test Shore');
        expect(res.body[0].site.country).toBe('Ireland');
    });

    it('filters by sighting, partial match and ignoring case', async () => {
        const res = await request(app).get(`${BASE}/dives?sighting=SEAL`);

        expect(res.body).toHaveLength(2);
    });

    it('filters by minimum depth', async () => {
        const res = await request(app).get(`${BASE}/dives?minDepth=15`);

        expect(res.body).toHaveLength(2);
    });

    it('filters by a depth range', async () => {
        const res = await request(app).get(`${BASE}/dives?minDepth=15&maxDepth=22`);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].maxDepth).toBe(20);
    });

    it('filters by a date range', async () => {
        const res = await request(app).get(`${BASE}/dives?from=2026-04-01&to=2026-05-01`);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].maxDepth).toBe(14);
    });

    it('filters by minimum rating', async () => {
        const res = await request(app).get(`${BASE}/dives?minRating=4`);

        expect(res.body).toHaveLength(2);
    });

    it('filters by site', async () => {
        const res = await request(app).get(`${BASE}/dives?site=${otherSiteId}`);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].site.name).toBe('Test Wall');
    });

    it('combines filters', async () => {
        const res = await request(app).get(`${BASE}/dives?sighting=seal&minRating=5`);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].maxDepth).toBe(20);
    });

    it('sorts by depth, deepest first', async () => {
        const res = await request(app).get(`${BASE}/dives?sort=-maxDepth`);

        const depths = res.body.map((dive: { maxDepth: number }) => dive.maxDepth);
        expect(depths).toEqual([24, 20, 14]);
    });

    it('ignores an unknown sort field and keeps newest first', async () => {
        const res = await request(app).get(`${BASE}/dives?sort=password`);

        const depths = res.body.map((dive: { maxDepth: number }) => dive.maxDepth);
        expect(depths).toEqual([20, 14, 24]);
    });

    it('ignores a depth filter that is not a number', async () => {
        const res = await request(app).get(`${BASE}/dives?minDepth=deep`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
    });

    it('returns 400 for an invalid site id in the filter', async () => {
        const res = await request(app).get(`${BASE}/dives?site=abc`);

        expect(res.status).toBe(400);
    });
});

describe('GET /dives/:id', () => {
    it('returns a dive with full site details (200)', async () => {
        const dive = await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });
        const res = await request(app).get(`${BASE}/dives/${dive._id}`);

        expect(res.status).toBe(200);
        expect(res.body.site.name).toBe('Test Shore');
        expect(res.body.site.maxDepth).toBe(25);
    });

    it('returns 404 for a dive that does not exist', async () => {
        const res = await request(app).get(`${BASE}/dives/${missingId}`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id format', async () => {
        const res = await request(app).get(`${BASE}/dives/abc`);

        expect(res.status).toBe(400);
    });
});

describe('GET /sites/:id/dives', () => {
    it('returns only the dives at that site (200)', async () => {
        const otherSite = await SiteModel.create({
            name: 'Other Site',
            country: 'Egypt',
            maxDepth: 30,
            siteType: 'reef',
            difficulty: 'beginner',
        });
        await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });
        await DiveModel.create({ ...validDive(), site: otherSite._id });

        const res = await request(app).get(`${BASE}/sites/${siteId}/dives`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].site).toBe(siteId);
    });

    it('returns 404 for a site that does not exist', async () => {
        const res = await request(app).get(`${BASE}/sites/${missingId}/dives`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid site id', async () => {
        const res = await request(app).get(`${BASE}/sites/abc/dives`);

        expect(res.status).toBe(400);
    });
});

describe('PUT /dives/:id', () => {
    it('updates a dive that exists (200)', async () => {
        const dive = await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });
        const res = await request(app)
            .put(`${BASE}/dives/${dive._id}`)
            .send({ ...validDive(), maxDepth: 22, rating: 5 });

        expect(res.status).toBe(200);
        expect(res.body.maxDepth).toBe(22);
        expect(res.body.rating).toBe(5);
    });

    it('returns 404 when the dive does not exist', async () => {
        const res = await request(app).put(`${BASE}/dives/${missingId}`).send(validDive());

        expect(res.status).toBe(404);
    });

    it('returns 400 when the data is invalid', async () => {
        const dive = await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });
        const res = await request(app)
            .put(`${BASE}/dives/${dive._id}`)
            .send({ ...validDive(), duration: 500 });

        expect(res.status).toBe(400);
    });

    it('returns 400 when the dive is deeper than the site', async () => {
        const dive = await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });
        const res = await request(app)
            .put(`${BASE}/dives/${dive._id}`)
            .send({ ...validDive(), maxDepth: 30 });

        expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid id format', async () => {
        const res = await request(app).put(`${BASE}/dives/abc`).send(validDive());

        expect(res.status).toBe(400);
    });
});

describe('DELETE /dives/:id', () => {
    it('deletes a dive that exists (204), and it is then gone', async () => {
        const dive = await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });

        const res = await request(app).delete(`${BASE}/dives/${dive._id}`);
        expect(res.status).toBe(204);

        const check = await request(app).get(`${BASE}/dives/${dive._id}`);
        expect(check.status).toBe(404);
    });

    it('returns 404 when the dive does not exist', async () => {
        const res = await request(app).delete(`${BASE}/dives/${missingId}`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid id format', async () => {
        const res = await request(app).delete(`${BASE}/dives/abc`);

        expect(res.status).toBe(400);
    });
});

describe('Deleting a site that has dives', () => {
    it('is blocked while dives are logged at the site (409)', async () => {
        await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });

        const res = await request(app).delete(`${BASE}/sites/${siteId}`);

        expect(res.status).toBe(409);
    });

    it('works once the dives are deleted (204)', async () => {
        const dive = await DiveModel.create({ ...validDive(), site: new Types.ObjectId(siteId) });

        await request(app).delete(`${BASE}/dives/${dive._id}`);
        const res = await request(app).delete(`${BASE}/sites/${siteId}`);

        expect(res.status).toBe(204);
    });
});