import { z } from 'zod';
import { Router } from 'express';
import { SplunkController } from '../controllers/splunk.controller';
import { validate } from '../middleware/validate';

const router = Router();
const controller = new SplunkController();

const querySplunkSchema = z.object({
  query: z.object({
    query: z.string().optional(),
    type: z.enum(['brute_force', 'privilege_escalation', 'powershell', 'recent']).optional(),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
    earliestTime: z.string().optional(),
    latestTime: z.string().optional(),
    ingest: z.enum(['true', 'false']).optional(),
  }),
});

router.get('/events', validate(querySplunkSchema), controller.getEvents);
router.get('/alerts', controller.getAlerts);
router.get('/incidents', controller.getIncidents);
router.get('/risk', controller.getRisk);
router.get('/dashboard', controller.getDashboard);
router.get('/threat-hunting', controller.getThreatHunting);

export default router;
