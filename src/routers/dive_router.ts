import { Router } from 'express';
import { DiveController } from '../controllers/dive_controller';
import { validate } from '../middleware/validate_middleware';
import { createDiveSchemaZod, updateDiveSchemaZod } from '../models/dive_model';
import { requireExisting } from '../middleware/exists_middleware';
import { DiveModel } from '../models/dive_model';

const router = Router();
const diveController = new DiveController();

router.get('/', diveController.getAllDives);
router.get('/:id', diveController.getDiveById);
router.post('/', validate(createDiveSchemaZod), diveController.createDive);
router.put('/:id', requireExisting(DiveModel, 'Dive'), validate(updateDiveSchemaZod), diveController.updateDive);
router.delete('/:id', diveController.deleteDive);

export default router;