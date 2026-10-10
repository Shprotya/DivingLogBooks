import { Schema, model, Types } from 'mongoose';
import { z } from 'zod';

/**
 * @openapi
 * components:
 *   schemas:
 *     Sighting:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 60
 *           description: Name of the animal seen, stored in lowercase
 *           example: octopus
 *         count:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           default: 1
 *           example: 2
 *     CreateDiveInput:
 *       type: object
 *       required:
 *         - date
 *         - site
 *         - maxDepth
 *         - duration
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *           description: Cannot be in the future
 *           example: 2026-05-03T10:30:00Z
 *         site:
 *           type: string
 *           description: Id of the dive site
 *           example: 6650f1c2a1b2c3d4e5f60718
 *         maxDepth:
 *           type: number
 *           minimum: 1
 *           maximum: 130
 *           description: Deepest point of the dive in metres. Cannot exceed the site's max depth.
 *           example: 18
 *         duration:
 *           type: integer
 *           minimum: 1
 *           maximum: 300
 *           description: Length of the dive in minutes
 *           example: 45
 *         waterTemp:
 *           type: number
 *           minimum: -2
 *           maximum: 35
 *           description: Water temperature in °C
 *           example: 12
 *         visibility:
 *           type: number
 *           minimum: 0
 *           maximum: 60
 *           description: Visibility in metres
 *           example: 8
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         notes:
 *           type: string
 *           maxLength: 1000
 *           example: Calm water, seals followed us back to shore
 *         sightings:
 *           type: array
 *           maxItems: 50
 *           items:
 *             $ref: '#/components/schemas/Sighting'
 *     Dive:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateDiveInput'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: 6650f1c2a1b2c3d4e5f60799
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */

// One animal seen on a dive. Names are lowercased so "Octopus" and "octopus" are stored the same way.
const sightingSchemaZod = z.object({
    name: z.string().trim().toLowerCase().min(1).max(60),
    count: z.number().int().min(1).max(10000).default(1),
});

// Zod schema: validates the request body before it reaches the controller
export const createDiveSchemaZod = z.object({
    // JSON sends dates as text, so coerce turns "2026-05-03" into a real Date
    date: z.coerce
        .date()
        .refine((date) => date <= new Date(), { message: 'Dive date cannot be in the future' }),
    site: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid site id'),
    maxDepth: z.number().min(1).max(130),
    duration: z.number().int().min(1).max(300),
    waterTemp: z.number().min(-2).max(35).optional(),
    visibility: z.number().min(0).max(60).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: z.string().trim().max(1000).optional(),
    sightings: z.array(sightingSchemaZod).max(50).default([]),
});

// PUT replaces the whole dive, so it needs the same fields as POST
export const updateDiveSchemaZod = createDiveSchemaZod;

export interface ISighting {
    name: string;
    count: number;
}

export interface IDive {
    date: Date;
    site: Types.ObjectId;
    maxDepth: number;
    duration: number;
    waterTemp?: number;
    visibility?: number;
    rating?: number;
    notes?: string;
    sightings: ISighting[];
}

// Sightings are stored inside each dive document, not in their own collection
const sightingSchema = new Schema<ISighting>(
    {
        name: { type: String, required: true, trim: true, lowercase: true },
        count: { type: Number, min: 1, max: 10000, default: 1 },
    },
    { _id: false }
);

// Mongoose schema: how a dive is stored in MongoDB
const diveSchema = new Schema<IDive>(
    {
        date: { type: Date, required: true },
        // Reference to a document in the DiveSite collection
        site: { type: Schema.Types.ObjectId, ref: 'DiveSite', required: true },
        maxDepth: { type: Number, required: true, min: 1, max: 130 },
        duration: { type: Number, required: true, min: 1, max: 300 },
        waterTemp: { type: Number, min: -2, max: 35 },
        visibility: { type: Number, min: 0, max: 60 },
        rating: { type: Number, min: 1, max: 5 },
        notes: { type: String, trim: true, maxlength: 1000 },
        sightings: { type: [sightingSchema], default: [] },
    },
    { timestamps: true }
);

// Speeds up "all dives at this site" and sorting by date
diveSchema.index({ site: 1 });
diveSchema.index({ date: -1 });

export const DiveModel = model<IDive>('Dive', diveSchema);