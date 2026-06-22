import { query } from '../../config/database';
import { Alert, mapDbToAlert } from '../../modules/alerts/alert.model';
import { AlertRepository } from '../../modules/alerts/alert.repository';
import { EVENT_BASE_SCORES, USER_MODIFIERS, ASSET_MODIFIERS, RISK_LEVELS } from './risk.constants';
import { RiskCalculationResult, RiskLevel } from './risk.types';
import { logger } from '../../config/logger';

export class RiskEngineService {
  private alertRepository: AlertRepository;

  constructor() {
    this.alertRepository = new AlertRepository();
  }

  /**
   * Calculates the risk score and maps modifiers for a given alert
   */
  async calculateRiskScore(alert: Alert): Promise<RiskCalculationResult> {
    // 1. Base Score based on Event ID (EventCode / sourceRuleId)
    const eventId = alert.sourceRuleId || 'unknown';
    let baseScore = EVENT_BASE_SCORES[eventId] || 30; // default base score of 30 if unknown

    // 2. User Modifier
    let userModifier = 0;
    let matchedUser = '';
    const raw = alert.rawEvent || {};
    const username = (raw.TargetUserName || raw.user || raw.username || raw.SubjectUserName || '').toString();
    
    if (username) {
      // Check for Admin / Administrator / SYSTEM (case-insensitive)
      const uLower = username.toLowerCase();
      if (uLower === 'administrator' || uLower === 'admin') {
        userModifier = USER_MODIFIERS['Administrator'] || 15;
        matchedUser = username;
      } else if (uLower === 'system') {
        userModifier = USER_MODIFIERS['SYSTEM'] || 20;
        matchedUser = username;
      }
    }

    // 3. Frequency Modifier (alerts from same source/host in the last 10 minutes)
    let frequencyModifier = 0;
    let frequencyCount = 0;
    const host = (raw.host || raw.ComputerName || '').toString().trim();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
      const conditions: string[] = ['source = $1', 'fired_at >= $2'];
      const params: any[] = [alert.source, tenMinutesAgo];
      
      const orConds: string[] = [];
      if (alert.assetId) {
        params.push(alert.assetId);
        orConds.push(`asset_id = $${params.length}`);
      }
      if (host) {
        params.push(host);
        orConds.push(`raw_event->>'host' = $${params.length}`);
        orConds.push(`raw_event->>'ComputerName' = $${params.length}`);
      }

      if (orConds.length > 0) {
        conditions.push(`(${orConds.join(' OR ')})`);
        const freqSql = `
          SELECT COUNT(*) FROM alerts
          WHERE ${conditions.join(' AND ')}
        `;
        const freqRes = await query(freqSql, params);
        frequencyCount = parseInt(freqRes.rows[0]?.count || '0', 10);

        if (frequencyCount >= 20) {
          frequencyModifier = 30;
        } else if (frequencyCount >= 10) {
          frequencyModifier = 20;
        } else if (frequencyCount >= 5) {
          frequencyModifier = 10;
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message, alertId: alert.id }, 'risk-engine: failed to calculate frequency count');
    }

    // 4. Asset Modifier
    let assetModifier = 0;
    let matchedAssetType = '';

    if (alert.assetId) {
      try {
        const assetRes = await query('SELECT asset_type, criticality FROM assets WHERE id = $1', [alert.assetId]);
        if (assetRes.rows.length > 0) {
          const asset = assetRes.rows[0]!;
          const assetType = (asset.asset_type || '').toString().toLowerCase();
          
          if (assetType === 'server') {
            assetModifier = ASSET_MODIFIERS['server'] || 10;
            matchedAssetType = 'server';
          } else if (assetType === 'domain_controller' || assetType.includes('dc')) {
            assetModifier = ASSET_MODIFIERS['domain_controller'] || 20;
            matchedAssetType = 'domain_controller';
          }
        }
      } catch (err: any) {
        logger.error({ err: err.message, assetId: alert.assetId }, 'risk-engine: failed to check asset details');
      }
    }

    // Fallback hostname parsing if asset not found or not linked
    if (assetModifier === 0 && host) {
      const hLower = host.toLowerCase();
      if (hLower.includes('dc') || hLower.includes('domaincontroller')) {
        assetModifier = ASSET_MODIFIERS['domain_controller'] || 20;
        matchedAssetType = 'domain_controller (inferred)';
      } else if (hLower.includes('srv') || hLower.includes('server')) {
        assetModifier = ASSET_MODIFIERS['server'] || 10;
        matchedAssetType = 'server (inferred)';
      }
    }

    // Total Score Calculation
    let score = baseScore + userModifier + frequencyModifier + assetModifier;
    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine Risk Level
    let level: RiskLevel = RISK_LEVELS.LOW;
    if (score >= 81) {
      level = RISK_LEVELS.CRITICAL;
    } else if (score >= 51) {
      level = RISK_LEVELS.HIGH;
    } else if (score >= 21) {
      level = RISK_LEVELS.MEDIUM;
    }

    return {
      score,
      level,
      factors: {
        baseScore,
        userModifier,
        frequencyModifier,
        assetModifier,
        matchedEventId: eventId,
        matchedUser,
        frequencyCount,
        matchedAssetType
      }
    };
  }

  /**
   * Processes the risk score for an alert: calculates, persists to risk_scores, and updates alert
   */
  async processAlertRisk(alertId: string): Promise<Alert> {
    logger.info({ alertId }, 'risk-engine: processing risk score');

    // 1. Fetch Alert
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    // 2. Calculate
    const result = await this.calculateRiskScore(alert);

    // Fetch previous risk score for delta calculation
    let scorePrev: number | null = null;
    try {
      const prevSql = `
        SELECT score FROM risk_scores
        WHERE entity_type = 'alert' AND entity_id = $1
        ORDER BY computed_at DESC
        LIMIT 1
      `;
      const prevRes = await query(prevSql, [alert.id]);
      const firstRow = prevRes.rows[0];
      if (firstRow) {
        scorePrev = parseFloat(firstRow.score);
      }
    } catch (err: any) {
      logger.error({ err: err.message, alertId: alert.id }, 'risk-engine: failed to fetch previous risk score');
    }

    // 3. Persist to risk_scores table
    try {
      const persistSql = `
        INSERT INTO risk_scores (
          entity_type, entity_id, score, score_prev, factors, model_version, computed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      await query(persistSql, [
        'alert',
        alert.id,
        result.score,
        scorePrev,
        JSON.stringify(result.factors),
        '1.0',
        'system-risk-engine'
      ]);
    } catch (err: any) {
      logger.error({ err: err.message, alertId }, 'risk-engine: failed to save record to risk_scores table');
    }

    // 4. Update the Alerts table (risk_score, risk_level, severity, enrichment)
    const severityMap: Record<string, string> = {
      'LOW': 'low',
      'MEDIUM': 'medium',
      'HIGH': 'high',
      'CRITICAL': 'critical'
    };

    const severity = (severityMap[result.level] || 'medium') as any;
    
    // Ensure we do NOT duplicate risk factors in alerts.enrichment
    const enrichment = { ...alert.enrichment };
    delete enrichment.risk_factors;
    delete enrichment.risk_level;

    // Update alerts directly using raw query
    const updateSql = `
      UPDATE alerts
      SET risk_score = $1, risk_level = $2, severity = $3, enrichment = $4
      WHERE id = $5
      RETURNING *
    `;
    const updateRes = await query(updateSql, [
      result.score,
      result.level,
      severity,
      JSON.stringify(enrichment),
      alert.id
    ]);
    
    const finalAlert = mapDbToAlert(updateRes.rows[0]);

    // 5. Auto Incident Creation Rule
    // risk_score >= 80 AND alert.status = 'new' AND no existing incident linked
    if (result.score >= 80 && alert.status === 'new') {
      try {
        const linkCheck = await query('SELECT 1 FROM incident_alerts WHERE alert_id = $1 LIMIT 1', [alert.id]);
        if (linkCheck.rows.length === 0) {
          logger.info({ alertId: alert.id, score: result.score }, 'risk-engine: alert qualifies for auto-incident creation');
          
          const { IncidentService } = await import('../../modules/incidents/incident.service');
          const incidentService = new IncidentService();
          
          await incidentService.createIncident({
            title: `Auto-Generated Incident: ${alert.title}`,
            description: `This incident was automatically generated by the Risk Engine due to a high risk score (${result.score}) on alert: ${alert.title}.\n\nAlert Description: ${alert.description || 'N/A'}\nAlert Source: ${alert.source}`,
            severity: severity,
            status: 'OPEN',
            priority: result.score >= 90 ? 1 : 2,
            metadata: {
              source_alert_id: alert.id,
              source_type: alert.source,
              auto_generated: true,
              generation_reason: `Risk score ${result.score} >= 80`
            },
            alertIds: [alert.id]
          });
          logger.info({ alertId: alert.id }, 'risk-engine: successfully auto-created incident for alert');
        }
      } catch (incErr: any) {
        logger.error({ err: incErr.message, alertId: alert.id }, 'risk-engine: failed to auto-create incident');
      }
    }

    return finalAlert;
  }

  /**
   * Returns details of the calculated risk score and factors for an alert
   */
  async getAlertRiskScoreRecord(alertId: string): Promise<any> {
    const sql = `
      SELECT * FROM risk_scores
      WHERE entity_type = 'alert' AND entity_id = $1
      ORDER BY computed_at DESC
      LIMIT 1
    `;
    const res = await query(sql, [alertId]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }
}
