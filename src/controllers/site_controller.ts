import { Request, Response } from 'express';
import { SiteService } from '../services/site_service';

const siteService = new SiteService();

// A MongoDB ObjectId is exactly 24 hex characters
const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Query values can be arrays or objects in Express, so only accept plain strings
const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

// MongoDB error code 11000 means a unique index was violated (duplicate name + country)
const isDuplicateKeyError = (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

export class SiteController {
    /**
     * @openapi
     * /sites:
     *   get:
     *     summary: Get all dive sites
     *     tags: [Sites]
     *     parameters:
     *       - in: query
     *         name: siteType
     *         schema:
     *           type: string
     *           enum: [reef, wreck, wall, shore, cave]
     *       - in: query
     *         name: difficulty
     *         schema:
     *           type: string
     *           enum: [beginner, intermediate, advanced]
     *       - in: query
     *         name: country
     *         description: Case-insensitive exact match
     *         schema:
     *           type: string
     *       - in: query
     *         name: sort
     *         description: Field to sort by (name, country, maxDepth). Prefix with - for descending.
     *         schema:
     *           type: string
     *           example: -maxDepth
     *     responses:
     *       200:
     *         description: List of dive sites
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Site'
     *       500:
     *         description: Server error
     */
    getAllSites = async (req: Request, res: Response) => {
        try {
            const sites = await siteService.getAllSites({
                siteType: asString(req.query.siteType),
                difficulty: asString(req.query.difficulty),
                country: asString(req.query.country),
                sort: asString(req.query.sort),
            });
            res.status(200).json(sites);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching sites' });
        }
    };

    /**
     * @openapi
     * /sites/{id}:
     *   get:
     *     summary: Get a dive site by id
     *     tags: [Sites]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: The dive site
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Site'
     *       400:
     *         description: Invalid id format
     *       404:
     *         description: Site not found
     */
    getSiteById = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid site id' });
            return;
        }
        try {
            const site = await siteService.getSiteById(id);
            if (!site) {
                res.status(404).json({ message: `Site with id ${id} not found` });
                return;
            }
            res.status(200).json(site);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching site' });
        }
    };

    /**
     * @openapi
     * /sites:
     *   post:
     *     summary: Create a dive site
     *     tags: [Sites]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateSiteInput'
     *     responses:
     *       201:
     *         description: Site created
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Site'
     *       400:
     *         description: Validation failed
     *       409:
     *         description: A site with this name already exists in this country
     */
    createSite = async (req: Request, res: Response) => {
        try {
            const site = await siteService.createSite(req.body);
            res.status(201).json(site);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                res.status(409).json({ message: 'A site with this name already exists in this country' });
                return;
            }
            console.error(error);
            res.status(500).json({ message: 'Error creating site' });
        }
    };

    /**
     * @openapi
     * /sites/{id}:
     *   put:
     *     summary: Replace a dive site
     *     tags: [Sites]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateSiteInput'
     *     responses:
     *       200:
     *         description: Site updated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Site'
     *       400:
     *         description: Invalid id format or validation failed
     *       404:
     *         description: Site not found
     *       409:
     *         description: A site with this name already exists in this country
     */
    updateSite = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid site id' });
            return;
        }
        try {
            const site = await siteService.updateSite(id, req.body);
            if (!site) {
                res.status(404).json({ message: `Site with id ${id} not found` });
                return;
            }
            res.status(200).json(site);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                res.status(409).json({ message: 'A site with this name already exists in this country' });
                return;
            }
            console.error(error);
            res.status(500).json({ message: 'Error updating site' });
        }
    };

    /**
     * @openapi
     * /sites/{id}:
     *   delete:
     *     summary: Delete a dive site
     *     tags: [Sites]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       204:
     *         description: Site deleted
     *       400:
     *         description: Invalid id format
     *       404:
     *         description: Site not found
     */
    deleteSite = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid site id' });
            return;
        }
        try {
            const site = await siteService.deleteSite(id);
            if (!site) {
                res.status(404).json({ message: `Site with id ${id} not found` });
                return;
            }
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting site' });
        }
    };
}