import { Schema, model } from 'mongoose';
import { z } from 'zod';

// Allowed values, shared by Zod (request validation) and Mongoose (database schema)
export const SITE_TYPES = ['reef', 'wreck', 'wall', 'shore', 'cave'] as const;
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

// TypeScript types built from the arrays above, e.g. 'reef' | 'wreck' | ...
export type SiteType = (typeof SITE_TYPES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateSiteInput:
 *       type: object
 *       required:
 *         - name
 *         - country
 *         - maxDepth
 *         - siteType
 *         - difficulty
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Dalkey Island
 *         country:
 *           type: string
 *           minLength: 2
 *           maxLength: 60
 *           example: Ireland
 *         maxDepth:
 *           type: number
 *           minimum: 1
 *           maximum: 130
 *           description: Maximum depth of the site in metres
 *           example: 25
 *         siteType:
 *           type: string
 *           enum: [reef, wreck, wall, shore, cave]
 *           example: shore
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: beginner
 *     Site:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateSiteInput'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: 6650f1c2a1b2c3d4e5f60718
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */

// Zod schema: validates the request body before it reaches the controller
export const createSiteSchemaZod = z.object({
    name: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(60),
    maxDepth: z.number().min(1).max(130),
    siteType: z.enum(SITE_TYPES),
    difficulty: z.enum(DIFFICULTIES),
});

// PUT replaces the whole site, so it needs the same fields as POST
export const updateSiteSchemaZod = createSiteSchemaZod;

export interface ISite {
    name: string;
    country: string;
    maxDepth: number;
    siteType: SiteType;
    difficulty: Difficulty;
}

// Mongoose schema: how a site is stored in MongoDB
const siteSchema = new Schema<ISite>(
    {
        name: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
        maxDepth: { type: Number, required: true, min: 1, max: 130 },
        siteType: { type: String, required: true, enum: [...SITE_TYPES] },
        difficulty: { type: String, required: true, enum: [...DIFFICULTIES] },
    },
    { timestamps: true }
);

// The same site name can't appear twice in the same country
siteSchema.index({ name: 1, country: 1 }, { unique: true });

export const SiteModel = model<ISite>('DiveSite', siteSchema);