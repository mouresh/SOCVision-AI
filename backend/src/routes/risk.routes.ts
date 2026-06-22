import { Router } from 'express';
import { RiskController } from '../controllers/risk.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const controller = new RiskController();

const getRiskSchema = z.object({
  params: z.object({
    alertId: z.string().uuid('Alert ID must be a valid UUID')
  })
});

router.get('/', controller.getRiskOverview);
router.get('/score/:alertId', validate(getRiskSchema), controller.getScore);

export default router;
