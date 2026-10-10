import { SortOrder } from 'mongoose';
import { z } from 'zod';
import { DiveModel, createDiveSchemaZod } from '../models/dive_model';
import { SiteModel } from '../models/site_model';
import { escapeRegex } from '../utils/request_helpers';

// The shape of a dive after Zod has validated it (site is still a string id here)
export type DiveInput = z.infer<typeof createDiveSchemaZod>;

// Query parameters the client can send to GET /dives
export interface DiveQuery {
    site?: string;
    minDepth?: string;
    maxDepth?: string;
    from?: string;
    to?: string;
    sighting?: string;
    minRating?: string;
    sort?: string;
}

// Only these fields can be used for sorting
const SORTABLE_FIELDS = ['date', 'maxDepth', 'duration', 'rating'];

// Turns "20" into 20, and ignores anything that isn't a number
const toNumber = (value?: string) => {
    if (value === undefined || value === '') return undefined;
    const number = Number(value);
    return Number.isNaN(number) ? undefined : number;
};

// Turns "2026-05-03" into a Date, and ignores anything that isn't a date
const toDate = (value?: string) => {
    if (value === undefined || value === '') return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

export class DiveService {
    async getAllDives(query: DiveQuery) {
        const filter: Record<string, unknown> = {};

        // ?site=<id> - dives at one site (the controller has already checked the id format)
        if (query.site) filter.site = query.site;

        // ?minDepth=20&maxDepth=30 - depth range in metres
        const depth: Record<string, number> = {};
        const minDepth = toNumber(query.minDepth);
        const maxDepth = toNumber(query.maxDepth);
        if (minDepth !== undefined) depth.$gte = minDepth;
        if (maxDepth !== undefined) depth.$lte = maxDepth;
        if (Object.keys(depth).length > 0) filter.maxDepth = depth;

        // ?from=2026-01-01&to=2026-06-30 - date range
        const dateRange: Record<string, Date> = {};
        const from = toDate(query.from);
        const to = toDate(query.to);
        if (from) dateRange.$gte = from;
        if (to) dateRange.$lte = to;
        if (Object.keys(dateRange).length > 0) filter.date = dateRange;

        // ?sighting=seal - any sighting whose name contains the text, ignoring case
        // ("seal" also finds "grey seal")
        if (query.sighting) {
            filter['sightings.name'] = new RegExp(escapeRegex(query.sighting), 'i');
        }

        // ?minRating=4 - only dives rated 4 or 5
        const minRating = toNumber(query.minRating);
        if (minRating !== undefined) filter.rating = { $gte: minRating };

        // ?sort=maxDepth sorts ascending, ?sort=-maxDepth sorts descending. Newest first by default.
        let sort: Record<string, SortOrder> = { date: -1 };
        if (query.sort) {
            const field = query.sort.replace(/^-/, '');
            if (SORTABLE_FIELDS.includes(field)) {
                sort = { [field]: query.sort.startsWith('-') ? -1 : 1 };
            }
        }

        // populate replaces the site id with the site's name and country
        return DiveModel.find(filter).sort(sort).populate('site', 'name country');
    }

    // Full site details for a single dive
    async getDiveById(id: string) {
        return DiveModel.findById(id).populate('site');
    }

    async getDivesBySite(siteId: string) {
        return DiveModel.find({ site: siteId }).sort({ date: -1 });
    }

    // Used to check a dive's site exists and how deep it goes
    async findSite(siteId: string) {
        return SiteModel.findById(siteId);
    }

    async createDive(data: DiveInput) {
        return DiveModel.create(data);
    }

    // Returns the updated dive, or null if no dive has this id
    async updateDive(id: string, data: DiveInput) {
        return DiveModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }

    // Returns the deleted dive, or null if no dive has this id
    async deleteDive(id: string) {
        return DiveModel.findByIdAndDelete(id);
    }
}