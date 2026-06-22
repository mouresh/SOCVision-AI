import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const controller = new AiController();

const analyzeSchema = z.object({
  params: z.object({
    alertId: z.string().uuid('Alert ID must be a valid UUID')
  }),
  query: z.object({
    force: z.string().optional()
  }).optional()
});

router.get('/analyze/:alertId', validate(analyzeSchema), controller.analyze);

export default router;
