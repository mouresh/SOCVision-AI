import { Request, Response, NextFunction } from 'express';
import { IncidentService } from './incident.service';
import { ApiResponse } from '../../types';

export class IncidentController {
  private service: IncidentService;

  constructor() {
    this.service = new IncidentService();
  }

  getIncidents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryParams = req.query as any;
      const page = parseInt(queryParams.page || '1', 10);
      const limit = parseInt(queryParams.limit || '20', 10);
      const offset = (page - 1) * limit;

      const filters = {
        status: queryParams.status,
        severity: queryParams.severity,
        assignedAnalyst: queryParams.assignedAnalyst,
        search: queryParams.search,
      };

      const result = await this.service.listIncidents(filters, { page, limit, offset });

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

  getIncidentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getIncidentDetails(id!);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incident = await this.service.createIncident(req.body);

      const response: ApiResponse<typeof incident> = {
        success: true,
        data: incident,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const incident = await this.service.updateIncident(id!, req.body);

      const response: ApiResponse<typeof incident> = {
        success: true,
        data: incident,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  assignAnalyst = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { assignedAnalyst } = req.body;
      const incident = await this.service.assignAnalyst(id!, assignedAnalyst);

      const response: ApiResponse<typeof incident> = {
        success: true,
        data: incident,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const comment = await this.service.addComment(id!, req.body);

      const response: ApiResponse<typeof comment> = {
        success: true,
        data: comment,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };
}
