import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai/ai.service';
import { ApiResponse } from '../types';

export class AiController {
  private service: AiService;

  constructor() {
    this.service = new AiService();
  }

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { alertId } = req.params;
      const force = req.query.force === 'true';

      const analysis = await this.service.analyzeAlert(alertId!, force);

      const response: ApiResponse<typeof analysis> = {
        success: true,
        data: analysis,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
