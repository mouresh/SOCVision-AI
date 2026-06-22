import { IncidentRepository } from './incident.repository';
import { 
  Incident, 
  IncidentComment, 
  CreateIncidentDto, 
  UpdateIncidentDto, 
  AddCommentDto 
} from './incident.model';
import { PaginationQuery, PaginatedResult, AppError } from '../../types';
import { logger } from '../../config/logger';

export class IncidentService {
  private repository: IncidentRepository;

  constructor() {
    this.repository = new IncidentRepository();
  }

  async createIncident(dto: CreateIncidentDto): Promise<Incident> {
    logger.info({ title: dto.title }, 'service: creating new incident');
    
    const incident = await this.repository.create(dto);

    if (dto.alertIds && dto.alertIds.length > 0) {
      logger.info({ incidentId: incident.id, alertCount: dto.alertIds.length }, 'service: linking alerts to new incident');
      for (const alertId of dto.alertIds) {
        await this.repository.linkAlert(incident.id, alertId, dto.createdBy);
      }
    }

    return incident;
  }

  async getIncidentById(id: string): Promise<Incident> {
    const incident = await this.repository.findById(id);
    if (!incident) {
      throw AppError.notFound(`Incident with ID ${id}`);
    }
    return incident;
  }

  async getIncidentDetails(id: string): Promise<{ incident: Incident; comments: IncidentComment[]; alertIds: string[] }> {
    const incident = await this.getIncidentById(id);
    const comments = await this.repository.getComments(id);
    const alertIds = await this.repository.getLinkedAlertIds(id);
    
    return {
      incident,
      comments,
      alertIds
    };
  }

  async listIncidents(
    filters: { status?: string; severity?: string; assignedAnalyst?: string; search?: string },
    pagination: PaginationQuery
  ): Promise<PaginatedResult<Incident>> {
    return this.repository.find(filters, pagination);
  }

  async updateIncident(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    logger.info({ incidentId: id, status: dto.status }, 'service: updating incident');
    
    const existing = await this.getIncidentById(id);

    const updatePayload: UpdateIncidentDto & { closedAt?: Date | null; recoveredAt?: Date | null } = { ...dto };
    
    if (dto.status !== undefined) {
      if (dto.status === 'CLOSED') {
        updatePayload.closedAt = new Date();
      } else if (dto.status === 'RESOLVED') {
        updatePayload.recoveredAt = new Date();
      } else {
        // If transitioning back, clear closed/recovered timestamps
        if (existing.status === 'CLOSED') {
          updatePayload.closedAt = null;
        }
        if (existing.status === 'RESOLVED') {
          updatePayload.recoveredAt = null;
        }
      }
    }

    const updated = await this.repository.update(id, updatePayload);
    if (!updated) {
      throw AppError.notFound(`Incident with ID ${id}`);
    }

    return updated;
  }

  async assignAnalyst(id: string, analystId: string | null): Promise<Incident> {
    logger.info({ incidentId: id, analystId }, 'service: assigning analyst to incident');
    return this.updateIncident(id, { assignedAnalyst: analystId });
  }

  async addComment(incidentId: string, dto: AddCommentDto): Promise<IncidentComment> {
    logger.info({ incidentId, authorId: dto.authorId }, 'service: adding comment to incident');
    
    // Verify incident exists first
    await this.getIncidentById(incidentId);
    
    return this.repository.addComment(incidentId, dto);
  }

  async linkAlertsToIncident(incidentId: string, alertIds: string[], userId?: string | null): Promise<void> {
    logger.info({ incidentId, alertCount: alertIds.length }, 'service: linking alerts to incident');
    
    // Verify incident exists
    await this.getIncidentById(incidentId);

    for (const alertId of alertIds) {
      await this.repository.linkAlert(incidentId, alertId, userId);
    }
  }
}
