export type IncidentSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export interface Incident {
  id: string;
  incidentNumber: number;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priority: number;
  assignedAnalyst: string | null; // DB: lead_analyst
  createdBy: string | null;
  assignedTeam: string | null;
  slaDueAt: Date | null;
  containedAt: Date | null;
  eradicatedAt: Date | null;
  recoveredAt: Date | null;
  closedAt: Date | null;
  rootCause: string | null;
  executiveSummary: string | null;
  lessonsLearned: string | null;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  isInternal: boolean;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIncidentDto {
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  priority?: number;
  assignedAnalyst?: string; // lead_analyst
  createdBy?: string;
  assignedTeam?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  alertIds?: string[]; // Optional alerts to link immediately
}

export interface UpdateIncidentDto {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  priority?: number;
  assignedAnalyst?: string | null;
  assignedTeam?: string | null;
  rootCause?: string | null;
  executiveSummary?: string | null;
  lessonsLearned?: string | null;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AddCommentDto {
  body: string;
  authorId: string;
  isInternal?: boolean;
  parentId?: string;
}

export function mapStatusToDb(status: IncidentStatus): string {
  const mapping: Record<IncidentStatus, string> = {
    'OPEN': 'open',
    'INVESTIGATING': 'investigating',
    'RESOLVED': 'recovered',
    'CLOSED': 'closed'
  };
  return mapping[status] || 'open';
}

export function mapStatusFromDb(dbStatus: string): IncidentStatus {
  const mapping: Record<string, IncidentStatus> = {
    'open': 'OPEN',
    'investigating': 'INVESTIGATING',
    'contained': 'INVESTIGATING',
    'eradicated': 'INVESTIGATING',
    'recovered': 'RESOLVED',
    'closed': 'CLOSED',
    'cancelled': 'CLOSED'
  };
  return mapping[dbStatus] || 'OPEN';
}

export function mapDbToIncident(row: any): Incident {
  return {
    id: row.id,
    incidentNumber: row.incident_number,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: mapStatusFromDb(row.status),
    priority: row.priority,
    assignedAnalyst: row.lead_analyst,
    createdBy: row.created_by,
    assignedTeam: row.assigned_team,
    slaDueAt: row.sla_due_at ? new Date(row.sla_due_at) : null,
    containedAt: row.contained_at ? new Date(row.contained_at) : null,
    eradicatedAt: row.eradicated_at ? new Date(row.eradicated_at) : null,
    recoveredAt: row.recovered_at ? new Date(row.recovered_at) : null,
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
    rootCause: row.root_cause,
    executiveSummary: row.executive_summary,
    lessonsLearned: row.lessons_learned,
    tags: row.tags || [],
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapDbToComment(row: any): IncidentComment {
  return {
    id: row.id,
    incidentId: row.incident_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    body: row.body,
    isInternal: row.is_internal,
    isEdited: row.is_edited,
    editedAt: row.edited_at ? new Date(row.edited_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}
