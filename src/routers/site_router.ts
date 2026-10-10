import { Router } from 'express';
import { SiteController } from '../controllers/site_controller';
import { validate } from '../middleware/validate_middleware';
import { createSiteSchemaZod, updateSiteSchemaZod } from '../models/site_model';

const router = Router();
const siteController = new SiteController();

router.get('/', siteController.getAllSites);
router.get('/:id', siteController.getSiteById);
router.post('/', validate(createSiteSchemaZod), siteController.createSite);
router.put('/:id', validate(updateSiteSchemaZod), siteController.updateSite);
router.delete('/:id', siteController.deleteSite);

export default router;