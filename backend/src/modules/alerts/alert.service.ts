import { AlertRepository } from './alert.repository';
import { Alert, CreateAlertDto, UpdateAlertDto, AlertFilter } from './alert.model';
import { PaginationQuery, PaginatedResult, AppError } from '../../types';
import { logger } from '../../config/logger';

export class AlertService {
  private repository: AlertRepository;

  constructor() {
    this.repository = new AlertRepository();
  }

  async getAlerts(filters: AlertFilter, pagination: PaginationQuery): Promise<PaginatedResult<Alert>> {
    return this.repository.find(filters, pagination);
  }

  async getAlertById(id: string): Promise<Alert> {
    const alert = await this.repository.findById(id);
    if (!alert) {
      throw AppError.notFound(`Alert with ID ${id}`);
    }
    return alert;
  }

  async createAlert(dto: CreateAlertDto): Promise<Alert> {
    if (dto.externalId) {
      const existing = await this.repository.findByExternalId(dto.externalId);
      if (existing) {
        logger.debug({ externalId: dto.externalId }, 'service: alert already exists, skipping creation');
        return existing;
      }
    }

    logger.info({ source: dto.source, title: dto.title }, 'service: creating new alert');
    
    let alert = await this.repository.create(dto);
    
    // Automatically calculate and persist risk score
    try {
      const { RiskEngineService } = await import('../../services/risk-engine/risk.service');
      const riskEngine = new RiskEngineService();
      alert = await riskEngine.processAlertRisk(alert.id);
    } catch (riskErr: any) {
      logger.error({ err: riskErr.message, alertId: alert.id }, 'service: failed to process alert risk score');
    }
    
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.warn({ alertId: alert.id, severity: alert.severity }, 'service: high-severity alert created, triggering correlation');
    }
    
    return alert;
  }

  async updateAlert(id: string, dto: UpdateAlertDto): Promise<Alert> {
    logger.info({ alertId: id }, 'service: updating alert');
    
    await this.getAlertById(id);
    
    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw AppError.notFound(`Alert with ID ${id}`);
    }
    
    return updated;
  }

  async deleteAlert(id: string): Promise<void> {
    logger.info({ alertId: id }, 'service: deleting alert');
    
    await this.getAlertById(id);
    
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw AppError.notFound(`Alert with ID ${id}`);
    }
  }

  async getSeverityStats(): Promise<Record<string, number>> {
    return this.repository.getSeverityStats();
  }

  async getStatusStats(): Promise<Record<string, number>> {
    return this.repository.getStatusStats();
  }
}
