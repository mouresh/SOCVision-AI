export type N8nAction = 'high_risk_alert' | 'daily_report' | 'incident_summary' | 'splunk_enrichment';

export interface N8nWebhookRequest {
  action: N8nAction;
  payload: any;
}

export interface DailyReportMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  openIncidents: number;
  mitreDistribution: Array<{
    techniqueId: string;
    techniqueName: string;
    count: number;
  }>;
  generatedAt: string;
}

export interface SplunkEnrichmentInput {
  EventCode?: string;
  EventID?: string;
  host?: string;
  ComputerName?: string;
  TargetUserName?: string;
  user?: string;
  [key: string]: any;
}

export interface SplunkEnrichmentOutput {
  riskScore: number;
  riskLevel: string;
  mitre: Array<{
    attackType: string;
    techniqueId: string;
    techniqueName: string;
  }>;
  recommendations: string[];
}

export interface IncidentSummaryOutput {
  incidentId: string;
  incidentNumber: number;
  title: string;
  status: string;
  severity: string;
  linkedAlertsCount: number;
  commentsCount: number;
  aiSummary: string;
}
