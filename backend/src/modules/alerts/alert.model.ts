export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'false_positive' | 'suppressed';

export interface Alert {
  id: string;
  externalId: string | null;
  title: string;
  description: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  sourceRuleId: string | null;
  sourceRuleName: string | null;
  assetId: string | null;
  agentId: string | null;
  assignedTo: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  falsePositiveNote: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  rawEvent: Record<string, any>;
  enrichment: Record<string, any>;
  tags: string[];
  firedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertDto {
  title: string;
  description?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  source: string;
  externalId?: string;
  sourceRuleId?: string;
  sourceRuleName?: string;
  assetId?: string;
  agentId?: string;
  assignedTo?: string;
  riskScore?: number;
  riskLevel?: string;
  rawEvent?: Record<string, any>;
  enrichment?: Record<string, any>;
  tags?: string[];
  firedAt?: Date | string;
}

export interface UpdateAlertDto {
  title?: string;
  description?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  assignedTo?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date | string | null;
  resolvedBy?: string;
  resolvedAt?: Date | string | null;
  falsePositiveNote?: string;
  riskScore?: number;
  riskLevel?: string;
  tags?: string[];
}

export interface AlertFilter {
  source?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  assetId?: string;
  agentId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export function mapDbToAlert(row: any): Alert {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    source: row.source,
    sourceRuleId: row.source_rule_id,
    sourceRuleName: row.source_rule_name,
    assetId: row.asset_id,
    agentId: row.agent_id,
    assignedTo: row.assigned_to,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : null,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    falsePositiveNote: row.false_positive_note,
    riskScore: row.risk_score !== null ? parseFloat(row.risk_score) : null,
    riskLevel: row.risk_level || null,
    rawEvent: row.raw_event || {},
    enrichment: row.enrichment || {},
    tags: row.tags || [],
    firedAt: new Date(row.fired_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
