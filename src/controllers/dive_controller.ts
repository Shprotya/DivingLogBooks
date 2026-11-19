import { Request, Response } from 'express';
import { DiveService, DiveInput } from '../services/dive_service';
import { isValidId, asString } from '../utils/request_helpers';

const diveService = new DiveService();

// Rules Zod can't check because they need the database:
// the site must exist, and the dive can't be deeper than the site.
// Returns an error message, or null if everything is fine.
const checkSiteRules = async (data: DiveInput): Promise<string | null> => {
    const site = await diveService.findSite(data.site);
    if (!site) {
        return `Site with id ${data.site} does not exist`;
    }
    if (data.maxDepth > site.maxDepth) {
        return `Dive depth (${data.maxDepth} m) is deeper than the site's maximum depth (${site.maxDepth} m)`;
    }
    return null;
};

export class DiveController {
    /**
     * @openapi
     * /dives:
     *   get:
     *     summary: Get all dives
     *     tags: [Dives]
     *     parameters:
     *       - in: query
     *         name: site
     *         description: Only dives at this site id
     *         schema:
     *           type: string
     *       - in: query
     *         name: minDepth
     *         schema:
     *           type: number
     *       - in: query
     *         name: maxDepth
     *         schema:
     *           type: number
     *       - in: query
     *         name: from
     *         description: Earliest date, e.g. 2026-01-01
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: to
     *         description: Latest date, e.g. 2026-06-30
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: sighting
     *         description: Dives where a sighting name contains this text, ignoring case
     *         schema:
     *           type: string
     *           example: seal
     *       - in: query
     *         name: minRating
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 5
     *       - in: query
     *         name: sort
     *         description: Field to sort by (date, maxDepth, duration, rating). Prefix with - for descending. Default is -date.
     *         schema:
     *           type: string
     *           example: -maxDepth
     *     responses:
     *       200:
     *         description: List of dives, each with its site's name and country
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Dive'
     *       400:
     *         description: Invalid site id in the query
     *       500:
     *         description: Server error
     */
    getAllDives = async (req: Request, res: Response) => {
        const site = asString(req.query.site);
        if (site !== undefined && !isValidId(site)) {
            res.status(400).json({ message: 'Invalid site id' });
            return;
        }
        try {
            const dives = await diveService.getAllDives({
                site,
                minDepth: asString(req.query.minDepth),
                maxDepth: asString(req.query.maxDepth),
                from: asString(req.query.from),
                to: asString(req.query.to),
                sighting: asString(req.query.sighting),
                minRating: asString(req.query.minRating),
                sort: asString(req.query.sort),
            });
            res.status(200).json(dives);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching dives' });
        }
    };

    /**
     * @openapi
     * /dives/{id}:
     *   get:
     *     summary: Get a dive by id, with full site details
     *     tags: [Dives]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: The dive. The site field contains the full site object.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Dive'
     *       400:
     *         description: Invalid id format
     *       404:
     *         description: Dive not found
     */
    getDiveById = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid dive id' });
            return;
        }
        try {
            const dive = await diveService.getDiveById(id);
            if (!dive) {
                res.status(404).json({ message: `Dive with id ${id} not found` });
                return;
            }
            res.status(200).json(dive);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching dive' });
        }
    };

    /**
     * @openapi
     * /sites/{id}/dives:
     *   get:
     *     summary: Get all dives logged at one site, newest first
     *     tags: [Sites, Dives]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dives at this site
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Dive'
     *       400:
     *         description: Invalid id format
     *       404:
     *         description: Site not found
     */
    getDivesBySite = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid site id' });
            return;
        }
        try {
            const site = await diveService.findSite(id);
            if (!site) {
                res.status(404).json({ message: `Site with id ${id} not found` });
                return;
            }
            const dives = await diveService.getDivesBySite(id);
            res.status(200).json(dives);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching dives for site' });
        }
    };

    /**
     * @openapi
     * /dives:
     *   post:
     *     summary: Log a new dive
     *     tags: [Dives]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateDiveInput'
     *     responses:
     *       201:
     *         description: Dive created
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Dive'
     *       400:
     *         description: Validation failed, the site does not exist, or the dive is deeper than the site
     */
    createDive = async (req: Request, res: Response) => {
        try {
            const siteError = await checkSiteRules(req.body);
            if (siteError) {
                res.status(400).json({ message: siteError });
                return;
            }
            const dive = await diveService.createDive(req.body);
            res.status(201).json(dive);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error creating dive' });
        }
    };

    /**
     * @openapi
     * /dives/{id}:
     *   put:
     *     summary: Replace a dive
     *     tags: [Dives]
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
     *             $ref: '#/components/schemas/CreateDiveInput'
     *     responses:
     *       200:
     *         description: Dive updated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Dive'
     *       400:
     *         description: Invalid id, validation failed, the site does not exist, or the dive is deeper than the site
     *       404:
     *         description: Dive not found
     */
    updateDive = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid dive id' });
            return;
        }
        try {
            const siteError = await checkSiteRules(req.body);
            if (siteError) {
                res.status(400).json({ message: siteError });
                return;
            }
            const dive = await diveService.updateDive(id, req.body);
            if (!dive) {
                res.status(404).json({ message: `Dive with id ${id} not found` });
                return;
            }
            res.status(200).json(dive);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating dive' });
        }
    };

    /**
     * @openapi
     * /dives/{id}:
     *   delete:
     *     summary: Delete a dive
     *     tags: [Dives]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       204:
     *         description: Dive deleted
     *       400:
     *         description: Invalid id format
     *       404:
     *         description: Dive not found
     */
    deleteDive = async (req: Request<{ id: string }>, res: Response) => {
        const { id } = req.params;
        if (!isValidId(id)) {
            res.status(400).json({ message: 'Invalid dive id' });
            return;
        }
        try {
            const dive = await diveService.deleteDive(id);
            if (!dive) {
                res.status(404).json({ message: `Dive with id ${id} not found` });
                return;
            }
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting dive' });
        }
    };
}