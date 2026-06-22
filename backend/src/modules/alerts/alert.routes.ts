import { Router } from 'express';
import { AlertController } from './alert.controller';
import { validate } from '../../middleware/validate';
import { createAlertSchema, updateAlertSchema, getAlertSchema, queryAlertsSchema } from './alert.validation';

const router = Router();
const controller = new AlertController();

// Statistics / Aggregations (placed before /:id parameterised route)
router.get('/stats', controller.getStats);

// List alerts
router.get('/', validate(queryAlertsSchema), controller.getAlerts);

// Get single alert
router.get('/:id', validate(getAlertSchema), controller.getAlertById);

// Create alert (Unused - Commented out for security/readiness cleanup)
// router.post('/', validate(createAlertSchema), controller.createAlert);

// Update alert (Unused - Commented out for security/readiness cleanup)
// router.put('/:id', validate(updateAlertSchema), controller.updateAlert);

// Delete alert (Unused - Commented out for security/readiness cleanup)
// router.delete('/:id', validate(getAlertSchema), controller.deleteAlert);

export default router;
