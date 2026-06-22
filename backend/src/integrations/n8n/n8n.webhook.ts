import { Router, Request, Response, NextFunction } from 'express';
import { N8nService } from './n8n.service';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import { ApiResponse } from '../../types';

const router = Router();
const service = new N8nService();

const webhookSchema = z.object({
  body: z.object({
    action: z.enum(['high_risk_alert', 'daily_report', 'incident_summary', 'splunk_enrichment'], {
      required_error: 'Action is required'
    }),
    payload: z.any().optional()
  })
});

router.post('/webhook', validate(webhookSchema), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, payload } = req.body;
    let result: any;

    switch (action) {
      case 'high_risk_alert':
        if (!payload || !payload.alertId) {
          res.status(400).json({
            success: false,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId || 'unknown',
            error: { code: 'BAD_REQUEST', message: 'alertId is required in payload' }
          });
          return;
        }
        result = await service.handleHighRiskAlert(payload);
        break;
      case 'daily_report':
        result = await service.handleDailyReport();
        break;
      case 'incident_summary':
        if (!payload || !payload.incidentId) {
          res.status(400).json({
            success: false,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId || 'unknown',
            error: { code: 'BAD_REQUEST', message: 'incidentId is required in payload' }
          });
          return;
        }
        result = await service.handleIncidentSummary(payload);
        break;
      case 'splunk_enrichment':
        if (!payload || !payload.splunkEvent) {
          res.status(400).json({
            success: false,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId || 'unknown',
            error: { code: 'BAD_REQUEST', message: 'splunkEvent is required in payload' }
          });
          return;
        }
        result = await service.handleSplunkEnrichment(payload);
        break;
      default:
        res.status(400).json({
          success: false,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || 'unknown',
          error: { code: 'BAD_REQUEST', message: 'Invalid action' }
        });
        return;
    }

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId || 'unknown'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
