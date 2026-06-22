import { Request, Response, NextFunction } from 'express';
import { AlertService } from './alert.service';
import { ApiResponse } from '../../types';

export class AlertController {
  private service: AlertService;

  constructor() {
    this.service = new AlertService();
  }

  getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      const filters = {
        source: query.source,
        severity: query.severity,
        status: query.status,
        assetId: query.assetId,
        agentId: query.agentId,
        assignedTo: query.assignedTo,
        startDate: query.startDate,
        endDate: query.endDate,
        search: query.search,
      };

      const result = await this.service.getAlerts(filters, { page, limit, offset });

      const response: ApiResponse<typeof result.items> = {
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAlertById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = await this.service.getAlertById(id!);

      const response: ApiResponse<typeof alert> = {
        success: true,
        data: alert,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alert = await this.service.createAlert(req.body);

      const response: ApiResponse<typeof alert> = {
        success: true,
        data: alert,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = await this.service.updateAlert(id!, req.body);

      const response: ApiResponse<typeof alert> = {
        success: true,
        data: alert,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.deleteAlert(id!);

      const response: ApiResponse<void> = {
        success: true,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [severity, status] = await Promise.all([
        this.service.getSeverityStats(),
        this.service.getStatusStats(),
      ]);

      const response: ApiResponse<{ severity: typeof severity; status: typeof status }> = {
        success: true,
        data: { severity, status },
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
