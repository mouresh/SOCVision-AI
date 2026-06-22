import { query } from '../../config/database';
import { 
  Incident, 
  IncidentComment, 
  CreateIncidentDto, 
  UpdateIncidentDto, 
  AddCommentDto, 
  mapDbToIncident, 
  mapDbToComment, 
  mapStatusToDb 
} from './incident.model';
import { PaginationQuery, PaginatedResult } from '../../types';

export class IncidentRepository {
  async findById(id: string): Promise<Incident | null> {
    const res = await query('SELECT * FROM incidents WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapDbToIncident(res.rows[0]);
  }

  async create(dto: CreateIncidentDto): Promise<Incident> {
    const sql = `
      INSERT INTO incidents (
        title, description, severity, status, priority, lead_analyst, created_by,
        assigned_team, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const dbStatus = dto.status ? mapStatusToDb(dto.status) : 'open';
    const values = [
      dto.title,
      dto.description || null,
      dto.severity || 'medium',
      dbStatus,
      dto.priority || 2,
      dto.assignedAnalyst || null,
      dto.createdBy || null,
      dto.assignedTeam || null,
      dto.tags || [],
      dto.metadata ? JSON.stringify(dto.metadata) : '{}'
    ];
    const res = await query(sql, values);
    return mapDbToIncident(res.rows[0]);
  }

  async update(id: string, dto: UpdateIncidentDto & { closedAt?: Date | null, containedAt?: Date | null, recoveredAt?: Date | null }): Promise<Incident | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.severity !== undefined) {
      fields.push(`severity = $${paramIndex++}`);
      values.push(dto.severity);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(mapStatusToDb(dto.status));
    }
    if (dto.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(dto.priority);
    }
    if (dto.assignedAnalyst !== undefined) {
      fields.push(`lead_analyst = $${paramIndex++}`);
      values.push(dto.assignedAnalyst);
    }
    if (dto.assignedTeam !== undefined) {
      fields.push(`assigned_team = $${paramIndex++}`);
      values.push(dto.assignedTeam);
    }
    if (dto.rootCause !== undefined) {
      fields.push(`root_cause = $${paramIndex++}`);
      values.push(dto.rootCause);
    }
    if (dto.executiveSummary !== undefined) {
      fields.push(`executive_summary = $${paramIndex++}`);
      values.push(dto.executiveSummary);
    }
    if (dto.lessonsLearned !== undefined) {
      fields.push(`lessons_learned = $${paramIndex++}`);
      values.push(dto.lessonsLearned);
    }
    if (dto.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(dto.tags);
    }
    if (dto.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(dto.metadata ? JSON.stringify(dto.metadata) : '{}');
    }
    if (dto.closedAt !== undefined) {
      fields.push(`closed_at = $${paramIndex++}`);
      values.push(dto.closedAt);
    }
    if (dto.containedAt !== undefined) {
      fields.push(`contained_at = $${paramIndex++}`);
      values.push(dto.containedAt);
    }
    if (dto.recoveredAt !== undefined) {
      fields.push(`recovered_at = $${paramIndex++}`);
      values.push(dto.recoveredAt);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE incidents
      SET ${fields.join(', ')}, updated_at = now()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    return mapDbToIncident(res.rows[0]);
  }

  async find(filters: { status?: string, severity?: string, assignedAnalyst?: string, search?: string }, pagination: PaginationQuery): Promise<PaginatedResult<Incident>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(mapStatusToDb(filters.status as any));
    }
    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      values.push(filters.severity);
    }
    if (filters.assignedAnalyst) {
      conditions.push(`lead_analyst = $${paramIndex++}`);
      values.push(filters.assignedAnalyst);
    }
    if (filters.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      paramIndex++;
      values.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countSql = `SELECT COUNT(*) FROM incidents ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Items
    const dataSql = `
      SELECT * FROM incidents
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    const pageValues = [...values, pagination.limit, pagination.offset];
    const dataRes = await query(dataSql, pageValues);
    const items = dataRes.rows.map(mapDbToIncident);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };
  }

  // Linked Alerts
  async linkAlert(incidentId: string, alertId: string, linkedBy?: string | null): Promise<void> {
    const sql = `
      INSERT INTO incident_alerts (incident_id, alert_id, linked_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (incident_id, alert_id) DO NOTHING
    `;
    await query(sql, [incidentId, alertId, linkedBy || null]);
  }

  async getLinkedAlertIds(incidentId: string): Promise<string[]> {
    const res = await query('SELECT alert_id FROM incident_alerts WHERE incident_id = $1', [incidentId]);
    return res.rows.map(row => row.alert_id);
  }

  async isAlertLinked(alertId: string): Promise<boolean> {
    const res = await query('SELECT 1 FROM incident_alerts WHERE alert_id = $1 LIMIT 1', [alertId]);
    return res.rows.length > 0;
  }

  // Comments
  async addComment(incidentId: string, dto: AddCommentDto): Promise<IncidentComment> {
    const sql = `
      INSERT INTO incident_comments (
        incident_id, author_id, parent_id, body, is_internal
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      incidentId,
      dto.authorId,
      dto.parentId || null,
      dto.body,
      dto.isInternal !== undefined ? dto.isInternal : true
    ];
    const res = await query(sql, values);
    return mapDbToComment(res.rows[0]);
  }

  async getComments(incidentId: string): Promise<IncidentComment[]> {
    const sql = `
      SELECT * FROM incident_comments
      WHERE incident_id = $1
      ORDER BY created_at ASC
    `;
    const res = await query(sql, [incidentId]);
    return res.rows.map(mapDbToComment);
  }
}
