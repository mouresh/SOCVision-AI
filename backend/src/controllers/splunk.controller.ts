import { Request, Response, NextFunction } from 'express';
import { SplunkService } from '../services/splunk/splunk.service';
import { ApiResponse } from '../types';

export class SplunkController {
  private service: SplunkService;

  constructor() {
    this.service = new SplunkService();
  }

  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const limit = query.limit || 20;
      const offset = query.offset || 0;
      const earliestTime = query.earliestTime || '-24h';
      const latestTime = query.latestTime || 'now';
      const searchType = query.type; // 'brute_force' | 'privilege_escalation' | 'powershell' | 'recent'
      const ingest = query.ingest === 'true';

      let result;

      // Determine search type
      if (searchType === 'brute_force') {
        result = {
          results: await this.service.getBruteForceEvents(limit),
          count: limit,
          offset
        };
      } else if (searchType === 'privilege_escalation') {
        result = {
          results: await this.service.getPrivilegeEscalationEvents(limit),
          count: limit,
          offset
        };
      } else if (searchType === 'powershell') {
        result = {
          results: await this.service.getPowerShellEvents(limit),
          count: limit,
          offset
        };
      } else if (searchType === 'recent') {
        result = {
          results: await this.service.getRecentEvents(limit),
          count: limit,
          offset
        };
      } else {
        // Raw Splunk query
        const splunkQuery = query.query || 'search index=*';
        result = await this.service.searchEvents(splunkQuery, { limit, offset, earliestTime, latestTime });
      }

      // Proactively ingest into alerts module if requested
      if (ingest && result.results.length > 0) {
        await this.service.ingestEventsAsAlerts(result.results);
      }

      const response: ApiResponse<typeof result.results> = {
        success: true,
        data: result.results,
        meta: {
          limit,
          offset,
          count: result.results.length
        } as any,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
