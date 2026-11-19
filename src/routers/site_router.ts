import { Router } from 'express';
import { SiteController } from '../controllers/site_controller';
import { validate } from '../middleware/validate_middleware';
import { createSiteSchemaZod, updateSiteSchemaZod } from '../models/site_model';
import { DiveController } from '../controllers/dive_controller';
import { requireExisting } from '../middleware/exists_middleware';
import { SiteModel } from '../models/site_model';

const diveController = new DiveController();

const router = Router();
const siteController = new SiteController();

router.get('/', siteController.getAllSites);
router.get('/:id', siteController.getSiteById);
router.post('/', validate(createSiteSchemaZod), siteController.createSite);
router.put('/:id', requireExisting(SiteModel, 'Site'), validate(updateSiteSchemaZod), siteController.updateSite);
router.delete('/:id', siteController.deleteSite);
router.get('/:id/dives', diveController.getDivesBySite);

export default router;