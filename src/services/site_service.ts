import { SortOrder } from 'mongoose';
import { SiteModel, ISite } from '../models/site_model';
import { DiveModel } from '../models/dive_model';
import { escapeRegex } from '../utils/request_helpers';

// Query parameters the client can send to GET /sites
export interface SiteQuery {
    siteType?: string;
    difficulty?: string;
    country?: string;
    sort?: string;
}

// Only these fields can be used for sorting
const SORTABLE_FIELDS = ['name', 'country', 'maxDepth'];

export class SiteService {
    async getAllSites(query: SiteQuery) {
        const filter: Record<string, unknown> = {};

        if (query.siteType) filter.siteType = query.siteType;
        if (query.difficulty) filter.difficulty = query.difficulty;
        // Case-insensitive exact match, so "ireland" finds "Ireland"
        if (query.country) filter.country = new RegExp(`^${escapeRegex(query.country)}$`, 'i');

        // ?sort=maxDepth sorts ascending, ?sort=-maxDepth sorts descending
        let sort: Record<string, SortOrder> = { name: 1 };
        if (query.sort) {
            const field = query.sort.replace(/^-/, '');
            if (SORTABLE_FIELDS.includes(field)) {
                sort = { [field]: query.sort.startsWith('-') ? -1 : 1 };
            }
        }

        return SiteModel.find(filter).sort(sort);
    }

    async getSiteById(id: string) {
        return SiteModel.findById(id);
    }

    async createSite(data: ISite) {
        return SiteModel.create(data);
    }

    // Returns the updated site, or null if no site has this id
    async updateSite(id: string, data: ISite) {
        return SiteModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }

    // Returns the deleted site, or null if no site has this id
    async deleteSite(id: string) {
        return SiteModel.findByIdAndDelete(id);
    }
}