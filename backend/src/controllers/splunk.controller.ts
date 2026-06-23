import { Request, Response, NextFunction } from 'express';
import { SplunkService } from '../services/splunk/splunk.service';
import { ApiResponse } from '../types';
import { query } from '../config/database';
import { logger } from '../config/logger';

export class SplunkController {
  private service: SplunkService;

  constructor() {
    this.service = new SplunkService();
  }

  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryParams = req.query as any;
      const limit = queryParams.limit || 20;
      const offset = queryParams.offset || 0;
      const earliestTime = queryParams.earliestTime || '-24h';
      const latestTime = queryParams.latestTime || 'now';
      const searchType = queryParams.type; // 'brute_force' | 'privilege_escalation' | 'powershell' | 'recent'
      const ingest = queryParams.ingest === 'true';

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
        const splunkQuery = queryParams.query || 'search index=*';
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

  getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('splunk-controller: syncing recent Splunk events as alerts');
      const events = await this.service.getRecentEvents(50);
      await this.service.ingestEventsAsAlerts(events);
      
      const dbAlerts = await query('SELECT * FROM alerts ORDER BY fired_at DESC LIMIT 50');
      const response: ApiResponse<any> = {
        success: true,
        data: dbAlerts.rows,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getIncidents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dbIncidents = await query('SELECT * FROM incidents ORDER BY created_at DESC LIMIT 50');
      const response: ApiResponse<any> = {
        success: true,
        data: dbIncidents.rows,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getRisk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const avgRes = await query(`
        SELECT AVG(score) as avg_score
        FROM (
          SELECT DISTINCT ON (entity_type, entity_id) score
          FROM risk_scores
          ORDER BY entity_type, entity_id, computed_at DESC
        ) latest_scores
      `);
      const overallRiskScore = Math.round(parseFloat(avgRes.rows[0]?.avg_score || '73'));
      let riskLevel = 'LOW';
      if (overallRiskScore >= 81) riskLevel = 'CRITICAL';
      else if (overallRiskScore >= 51) riskLevel = 'HIGH';
      else if (overallRiskScore >= 21) riskLevel = 'MEDIUM';

      const mttrRes = await query(`
        SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, contained_at, updated_at) - created_at))) as avg_seconds
        FROM incidents
        WHERE status IN ('contained', 'closed')
      `);
      const avgSeconds = parseFloat(mttrRes.rows[0]?.avg_seconds || '2520');
      
      const formatMTTR = (seconds: number) => {
        if (!seconds || seconds <= 0) return '0m';
        const mins = Math.round(seconds / 60);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (remainingMins === 0) return `${hours}h`;
        return `${hours}h ${remainingMins}m`;
      };

      const response: ApiResponse<any> = {
        success: true,
        data: {
          overallRiskScore,
          riskLevel,
          mttr: formatMTTR(avgSeconds)
        },
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alertsCountRes = await query('SELECT COUNT(*) FROM alerts');
      const totalAlerts = parseInt(alertsCountRes.rows[0]?.count || '0', 10);

      const activeIncidentsRes = await query("SELECT COUNT(*) FROM incidents WHERE status != 'closed'");
      const activeIncidents = parseInt(activeIncidentsRes.rows[0]?.count || '0', 10);

      const avgRes = await query(`
        SELECT AVG(score) as avg_score
        FROM (
          SELECT DISTINCT ON (entity_type, entity_id) score
          FROM risk_scores
          ORDER BY entity_type, entity_id, computed_at DESC
        ) latest_scores
      `);
      const overallRiskScore = Math.round(parseFloat(avgRes.rows[0]?.avg_score || '73'));
      let riskLevel = 'LOW';
      if (overallRiskScore >= 81) riskLevel = 'CRITICAL';
      else if (overallRiskScore >= 51) riskLevel = 'HIGH';
      else if (overallRiskScore >= 21) riskLevel = 'MEDIUM';

      const mttrRes = await query(`
        SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, contained_at, updated_at) - created_at))) as avg_seconds
        FROM incidents
        WHERE status IN ('contained', 'closed')
      `);
      const avgSeconds = parseFloat(mttrRes.rows[0]?.avg_seconds || '2520');
      const formatMTTR = (seconds: number) => {
        if (!seconds || seconds <= 0) return '0m';
        const mins = Math.round(seconds / 60);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (remainingMins === 0) return `${hours}h`;
        return `${hours}h ${remainingMins}m`;
      };

      let alertVolume: any[] = [];
      try {
        alertVolume = await this.service.getAlertVolume('-24h');
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to get alert volume');
      }

      let topAttackingIps: any[] = [];
      try {
        topAttackingIps = await this.service.getTopAttackingIps(7);
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to get top attacking IPs');
      }

      let liveAlertStream: any[] = [];
      try {
        liveAlertStream = await this.service.getRecentEvents(10);
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to get live alert stream');
      }

      // Add database queries for widgets
      let mitreDistribution: any[] = [];
      try {
        const mitreRes = await query(`
          SELECT mt.technique_id, mt.name, COUNT(*)::int as count
          FROM alert_mitre_mapping amm
          JOIN mitre_techniques mt ON mt.id = amm.technique_id
          GROUP BY mt.technique_id, mt.name
          ORDER BY count DESC
          LIMIT 10
        `);
        mitreDistribution = mitreRes.rows.map(r => ({
          techniqueId: r.technique_id,
          name: r.name,
          count: r.count
        }));
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to query MITRE distribution');
      }

      let recentIncidents: any[] = [];
      try {
        const recentIncidentsRes = await query(`
          SELECT id, title, severity, status, created_at
          FROM incidents
          ORDER BY created_at DESC
          LIMIT 5
        `);
        recentIncidents = recentIncidentsRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          severity: r.severity,
          status: r.status,
          createdAt: r.created_at
        }));
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to query recent incidents');
      }

      let topSourceIps: any[] = [];
      try {
        const topIpsRes = await query(`
          SELECT 
            COALESCE(raw_event->>'srcIp', raw_event->>'src_ip', raw_event->>'IpAddress') as ip,
            COUNT(*)::int as count
          FROM alerts
          WHERE COALESCE(raw_event->>'srcIp', raw_event->>'src_ip', raw_event->>'IpAddress') IS NOT NULL
            AND COALESCE(raw_event->>'srcIp', raw_event->>'src_ip', raw_event->>'IpAddress') != '-'
          GROUP BY ip
          ORDER BY count DESC
          LIMIT 10
        `);
        topSourceIps = topIpsRes.rows.map(r => ({
          ip: r.ip,
          count: r.count
        }));
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to query top source IPs');
      }

      let alertTrends: any[] = [];
      try {
        const trendsRes = await query(`
          SELECT DATE_TRUNC('hour', fired_at) as hour_bucket, COUNT(*)::int as count
          FROM alerts
          WHERE fired_at >= now() - interval '24 hours'
          GROUP BY hour_bucket
          ORDER BY hour_bucket
        `);
        alertTrends = trendsRes.rows.map(r => ({
          hour: new Date(r.hour_bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          count: r.count
        }));
      } catch (err: any) {
        logger.error({ err: err.message }, 'splunk-controller: dashboard failed to query alert trends');
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          totalAlerts,
          activeIncidents,
          riskScore: overallRiskScore,
          riskLevel,
          mttr: formatMTTR(avgSeconds),
          alertVolume,
          topAttackingIps,
          liveAlertStream,
          topSourceIps,
          mitreDistribution,
          recentIncidents,
          alertTrends
        },
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getThreatHunting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryText = (req.query.query || '').toString();
      const earliestTime = (req.query.earliestTime || '-24h').toString();
      const latestTime = (req.query.latestTime || 'now').toString();
      const limit = parseInt((req.query.limit || '50').toString(), 10);

      if (!queryText) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Query parameter is required'
          }
        });
        return;
      }

      const result = await this.service.searchEvents(queryText, { earliestTime, latestTime, limit });
      const response: ApiResponse<any> = {
        success: true,
        data: result.results,
        meta: {
          count: result.results.length,
          limit,
          offset: 0
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
