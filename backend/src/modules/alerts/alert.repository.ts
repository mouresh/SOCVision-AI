import { query } from '../../config/database';
import { Alert, CreateAlertDto, UpdateAlertDto, AlertFilter, mapDbToAlert } from './alert.model';
import { PaginationQuery, PaginatedResult } from '../../types';

export class AlertRepository {
  async findById(id: string): Promise<Alert | null> {
    const res = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapDbToAlert(res.rows[0]);
  }

  async create(dto: CreateAlertDto): Promise<Alert> {
    const sql = `
      INSERT INTO alerts (
        title, description, severity, status, source, external_id,
        source_rule_id, source_rule_name, asset_id, agent_id, assigned_to,
        risk_score, raw_event, enrichment, tags, fired_at, risk_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    const values = [
      dto.title,
      dto.description || null,
      dto.severity || 'medium',
      dto.status || 'new',
      dto.source,
      dto.externalId || null,
      dto.sourceRuleId || null,
      dto.sourceRuleName || null,
      dto.assetId || null,
      dto.agentId || null,
      dto.assignedTo || null,
      dto.riskScore !== undefined ? dto.riskScore : null,
      dto.rawEvent ? JSON.stringify(dto.rawEvent) : '{}',
      dto.enrichment ? JSON.stringify(dto.enrichment) : '{}',
      dto.tags || [],
      dto.firedAt || new Date(),
      dto.riskLevel || null
    ];
    const res = await query(sql, values);
    return mapDbToAlert(res.rows[0]);
  }

  async update(id: string, dto: UpdateAlertDto): Promise<Alert | null> {
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
      values.push(dto.status);
    }
    if (dto.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramIndex++}`);
      values.push(dto.assignedTo);
    }
    if (dto.acknowledgedBy !== undefined) {
      fields.push(`acknowledged_by = $${paramIndex++}`);
      values.push(dto.acknowledgedBy);
    }
    if (dto.acknowledgedAt !== undefined) {
      fields.push(`acknowledged_at = $${paramIndex++}`);
      values.push(dto.acknowledgedAt);
    }
    if (dto.resolvedBy !== undefined) {
      fields.push(`resolved_by = $${paramIndex++}`);
      values.push(dto.resolvedBy);
    }
    if (dto.resolvedAt !== undefined) {
      fields.push(`resolved_at = $${paramIndex++}`);
      values.push(dto.resolvedAt);
    }
    if (dto.falsePositiveNote !== undefined) {
      fields.push(`false_positive_note = $${paramIndex++}`);
      values.push(dto.falsePositiveNote);
    }
    if (dto.riskScore !== undefined) {
      fields.push(`risk_score = $${paramIndex++}`);
      values.push(dto.riskScore);
    }
    if (dto.riskLevel !== undefined) {
      fields.push(`risk_level = $${paramIndex++}`);
      values.push(dto.riskLevel);
    }
    if (dto.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(dto.tags);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE alerts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    return mapDbToAlert(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM alerts WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async find(filters: AlertFilter, pagination: PaginationQuery): Promise<PaginatedResult<Alert>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.source) {
      conditions.push(`source = $${paramIndex++}`);
      values.push(filters.source);
    }
    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      values.push(filters.severity);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.assetId) {
      conditions.push(`asset_id = $${paramIndex++}`);
      values.push(filters.assetId);
    }
    if (filters.agentId) {
      conditions.push(`agent_id = $${paramIndex++}`);
      values.push(filters.agentId);
    }
    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(filters.assignedTo);
    }
    if (filters.startDate) {
      conditions.push(`fired_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`fired_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }
    if (filters.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      paramIndex++;
      values.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) FROM alerts ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Data query
    const dataSql = `
      SELECT * FROM alerts
      ${whereClause}
      ORDER BY fired_at DESC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    const pageValues = [...values, pagination.limit, pagination.offset];
    const dataRes = await query(dataSql, pageValues);
    const items = dataRes.rows.map(mapDbToAlert);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };
  }

  async getSeverityStats(): Promise<Record<string, number>> {
    const sql = 'SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity';
    const res = await query(sql);
    const stats: Record<string, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    res.rows.forEach((row: any) => {
      stats[row.severity] = parseInt(row.count, 10);
    });
    return stats;
  }

  async getStatusStats(): Promise<Record<string, number>> {
    const sql = 'SELECT status, COUNT(*) as count FROM alerts GROUP BY status';
    const res = await query(sql);
    const stats: Record<string, number> = {
      new: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0,
      false_positive: 0,
      suppressed: 0
    };
    res.rows.forEach((row: any) => {
      stats[row.status] = parseInt(row.count, 10);
    });
    return stats;
  }
}
