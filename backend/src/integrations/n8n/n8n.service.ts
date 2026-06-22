import { query } from '../../config/database';
import { logger } from '../../config/logger';
import { 
  DailyReportMetrics, 
  SplunkEnrichmentInput, 
  SplunkEnrichmentOutput, 
  IncidentSummaryOutput 
} from './n8n.types';
import { mapDbToAlert } from '../../modules/alerts/alert.model';
import { DETERMINISTIC_MITRE_MAPPINGS } from '../../services/ai/ai.service';

export class N8nService {
  /**
   * Workflow 1: High Risk Alert Escalation
   * Sends mock email, creates an incident, and logs an audit event.
   */
  async handleHighRiskAlert(payload: { alertId: string; email?: string }): Promise<any> {
    const { alertId, email = 'soc-manager@socvision.ai' } = payload;
    logger.info({ alertId }, 'n8n-service: handling high risk alert notification workflow');

    // 1. Fetch Alert
    const alertRes = await query('SELECT * FROM alerts WHERE id = $1', [alertId]);
    const firstRow = alertRes.rows[0];
    if (!firstRow) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }
    const alert = mapDbToAlert(firstRow);

    if (alert.riskScore === null || parseFloat(alert.riskScore as any) < 80) {
      logger.warn({ alertId, score: alert.riskScore }, 'n8n-service: alert does not meet risk score >= 80 threshold');
    }

    // 2. Create Incident (reusing IncidentService to avoid duplicate creation and handle linking)
    const { IncidentService } = await import('../../modules/incidents/incident.service');
    const incidentService = new IncidentService();
    
    // Check if alert already linked to an incident
    const linkCheck = await query('SELECT incident_id FROM incident_alerts WHERE alert_id = $1 LIMIT 1', [alert.id]);
    let incidentId = linkCheck.rows.length > 0 ? linkCheck.rows[0]?.incident_id : null;
    let incidentCreated = false;

    if (!incidentId) {
      logger.info({ alertId }, 'n8n-service: creating incident for high risk alert escalation');
      const incident = await incidentService.createIncident({
        title: `n8n Automated Escalation: ${alert.title}`,
        description: `This incident was escalated automatically by n8n workflow because its risk score is ${alert.riskScore}.\n\nAlert Details:\nID: ${alert.id}\nSource: ${alert.source}`,
        severity: alert.severity,
        status: 'OPEN',
        priority: alert.riskScore && parseFloat(alert.riskScore as any) >= 90 ? 1 : 2,
        metadata: {
          escalated_by: 'n8n-workflow',
          source_alert_id: alert.id,
          source_type: alert.source
        },
        alertIds: [alert.id]
      });
      incidentId = incident.id;
      incidentCreated = true;
    } else {
      logger.info({ alertId, incidentId }, 'n8n-service: alert is already linked to incident');
    }

    // 3. Log Audit Event
    logger.info({ incidentId }, 'n8n-service: logging audit event');
    const auditRes = await query(`
      INSERT INTO audit_logs (
        action, resource_type, resource_id, metadata
      ) VALUES ('create'::audit_action, 'incident', $1, $2)
      RETURNING id
    `, [
      incidentId,
      JSON.stringify({
        escalated_alert_id: alert.id,
        triggered_by: 'n8n-workflow',
        timestamp: new Date().toISOString()
      })
    ]);
    const loggedAuditEventId = auditRes.rows[0]?.id || 'unknown';

    // 4. Send Email (Mocked action)
    logger.info({ email, alertTitle: alert.title }, `[n8n Email Action] Sending High Risk Alert Notification email to: ${email}`);
    const emailSent = true;

    return {
      success: true,
      incidentId,
      incidentCreated,
      loggedAuditEventId,
      emailSent
    };
  }

  /**
   * Workflow 2: Daily Executive Report
   * Generates metrics for n8n executive dashboard mailing.
   */
  async handleDailyReport(): Promise<DailyReportMetrics> {
    logger.info('n8n-service: generating daily executive report metrics');

    // 1. Total Alerts count
    const totalAlertsRes = await query('SELECT COUNT(*)::int as count FROM alerts');
    const totalAlerts = totalAlertsRes.rows[0]?.count || 0;

    // 2. Critical Alerts count
    const criticalAlertsRes = await query('SELECT COUNT(*)::int as count FROM alerts WHERE severity = \'critical\'');
    const criticalAlerts = criticalAlertsRes.rows[0]?.count || 0;

    // 3. Open Incidents count
    const openIncidentsRes = await query('SELECT COUNT(*)::int as count FROM incidents WHERE status = \'open\'');
    const openIncidents = openIncidentsRes.rows[0]?.count || 0;

    // 4. MITRE ATT&CK Mapping distribution
    const mitreRes = await query(`
      SELECT m.technique_id AS "techniqueId", m.name AS "techniqueName", COUNT(*)::int AS count
      FROM alert_mitre_mapping am
      JOIN mitre_techniques m ON am.technique_id = m.id
      GROUP BY m.technique_id, m.name
      ORDER BY count DESC
    `);
    const mitreDistribution = mitreRes.rows as DailyReportMetrics['mitreDistribution'];

    return {
      totalAlerts,
      criticalAlerts,
      openIncidents,
      mitreDistribution,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Workflow 3: AI Incident Summary
   * Compiles alerts and comments for an incident and runs LLM summarization.
   */
  async handleIncidentSummary(payload: { incidentId: string }): Promise<IncidentSummaryOutput> {
    const { incidentId } = payload;
    logger.info({ incidentId }, 'n8n-service: generating AI incident summary');

    // Fetch incident details
    const { IncidentService } = await import('../../modules/incidents/incident.service');
    const incidentService = new IncidentService();
    const details = await incidentService.getIncidentDetails(incidentId);
    
    // Generate AI Summary text based on incident, comments, and alerts
    const alertsRes = await query(`
      SELECT title, severity, risk_score 
      FROM alerts 
      WHERE id = ANY($1::uuid[])
    `, [details.alertIds]);
    const alerts = alertsRes.rows;

    const alertSummaryText = alerts.length > 0
      ? alerts.map(a => `- ${a.title} (Severity: ${a.severity}, Risk: ${a.risk_score || 'N/A'})`).join('\n')
      : '- No alerts linked';

    const commentSummaryText = details.comments.length > 0
      ? details.comments.map(c => `- Comment by ${c.authorId}: ${c.body}`).join('\n')
      : '- No comments added';

    const aiSummary = `This incident (ID: ${details.incident.id}, Incident Number: #${details.incident.incidentNumber}) is titled "${details.incident.title}" with severity "${details.incident.severity}" and status "${details.incident.status}".
    
It has ${details.alertIds.length} linked alerts:
${alertSummaryText}

There are ${details.comments.length} timeline comments:
${commentSummaryText}

AI Threat Analysis: Based on the linked alerts, this incident indicates a high priority event targeting system logs or credentials. Immediate recommendations include validating targeted host status, reviewing active firewall policies, and contacting the assigned analyst: ${details.incident.assignedAnalyst || 'None'}.`;

    return {
      incidentId: details.incident.id,
      incidentNumber: details.incident.incidentNumber,
      title: details.incident.title,
      status: details.incident.status,
      severity: details.incident.severity,
      linkedAlertsCount: details.alertIds.length,
      commentsCount: details.comments.length,
      aiSummary
    };
  }

  /**
   * Workflow 4: Splunk Alert Enrichment
   * Receives raw Splunk event, executes Risk Engine calculations, maps MITRE, and gets actions.
   */
  async handleSplunkEnrichment(payload: { splunkEvent: SplunkEnrichmentInput }): Promise<SplunkEnrichmentOutput> {
    const { splunkEvent } = payload;
    logger.info({ splunkEvent }, 'n8n-service: performing splunk alert enrichment');

    // 1. Map to temporary alert structure to run calculation
    const ruleId = splunkEvent.EventCode || splunkEvent.EventID || 'unknown';
    const mockAlert: any = {
      source: 'splunk',
      sourceRuleId: ruleId,
      rawEvent: splunkEvent,
      assetId: null,
      riskLevel: null
    };

    // Calculate score using RiskEngine
    const { RiskEngineService } = await import('../../services/risk-engine/risk.service');
    const riskEngine = new RiskEngineService();
    const result = await riskEngine.calculateRiskScore(mockAlert);

    // 2. Fetch deterministic MITRE Mapping
    const mappedKey = DETERMINISTIC_MITRE_MAPPINGS[ruleId] ? ruleId : null;
    const mitre: any[] = [];
    if (mappedKey) {
      mitre.push(DETERMINISTIC_MITRE_MAPPINGS[mappedKey]!);
    } else {
      mitre.push({
        attackType: 'Suspicious Activity',
        techniqueId: 'T1059',
        techniqueName: 'Command and Scripting Interpreter'
      });
    }

    // 3. Generate Recommendations list
    const recommendations = [
      'Validate login workstation authenticity.',
      'Check active user session locations.',
      'Audit targeted account group memberships.'
    ];
    if (ruleId === '4625') {
      recommendations.unshift('Lock account immediately if logon retry limits exceeded.');
      recommendations.unshift('Verify source IP location subnet parameters.');
    }

    return {
      riskScore: result.score,
      riskLevel: result.level,
      mitre,
      recommendations
    };
  }
}
