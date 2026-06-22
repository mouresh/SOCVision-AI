import { Router } from 'express';
import { IncidentController } from './incident.controller';
import { validate } from '../../middleware/validate';
import { 
  createIncidentSchema, 
  updateIncidentSchema, 
  assignAnalystSchema, 
  addCommentSchema, 
  getIncidentByIdSchema,
  listIncidentsSchema
} from './incident.validation';

const router = Router();
const controller = new IncidentController();

router.get('/', validate(listIncidentsSchema), controller.getIncidents);
router.get('/:id', validate(getIncidentByIdSchema), controller.getIncidentById);
router.post('/', validate(createIncidentSchema), controller.createIncident);
router.put('/:id', validate(updateIncidentSchema), controller.updateIncident);
router.post('/:id/assign', validate(assignAnalystSchema), controller.assignAnalyst);
router.post('/:id/comment', validate(addCommentSchema), controller.addComment);

export default router;
