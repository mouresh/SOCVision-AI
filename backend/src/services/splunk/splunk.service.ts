import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { SplunkEvent, SplunkSearchOptions, SplunkPaginatedResult } from './splunk.types';
import { EVENT_ID_DESCRIPTIONS, SPLUNK_QUERIES } from './splunk.constants';
import { AlertService } from '../../modules/alerts/alert.service';
import { CreateAlertDto } from '../../modules/alerts/alert.model';

export class SplunkService {
  private client: AxiosInstance;
  private alertService: AlertService;

  constructor() {
    this.alertService = new AlertService();
    
    const baseURL = env.SPLUNK_URL || `https://${env.SPLUNK_HOST}:${env.SPLUNK_PORT}`;
    const authHeader = env.SPLUNK_TOKEN 
      ? `Bearer ${env.SPLUNK_TOKEN}`
      : `Basic ${Buffer.from(`${env.SPLUNK_USERNAME}:${env.SPLUNK_PASSWORD}`).toString('base64')}`;

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000
    });
  }

  private async retryRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      logger.warn({ retriesLeft: retries, error: error instanceof Error ? error.message : String(error) }, 'splunk: request failed, retrying...');
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(fn, retries - 1, delay * 2);
    }
  }

  async searchEvents(queryText: string, options?: SplunkSearchOptions): Promise<SplunkPaginatedResult<SplunkEvent>> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const earliest = options?.earliestTime || '-24h';
    const latest = options?.latestTime || 'now';

    const params = new URLSearchParams();
    params.append('search', queryText);
    params.append('exec_mode', 'oneshot');
    params.append('output_mode', 'json');
    params.append('earliest_time', earliest);
    params.append('latest_time', latest);
    params.append('count', limit.toString());
    params.append('offset', offset.toString());

    logger.info({ query: queryText, limit, offset }, 'splunk: executing search');

    try {
      const response = await this.retryRequest(async () => {
        return this.client.post('/services/search/jobs', params.toString());
      });

      const results = response.data.results || [];
      const mappedEvents: SplunkEvent[] = results.map((row: any) => this.mapRowToSplunkEvent(row));

      return { results: mappedEvents, count: mappedEvents.length, offset };
    } catch (error: any) {
      logger.error({ error: error.message, status: error.response?.status }, 'splunk: search execution failed');
      
      if (env.SPLUNK_SIMULATION_MODE) {
        logger.warn('splunk: connection failed, falling back to simulated events');
        const simulated = this.generateSimulatedEvents(queryText, limit, offset);
        return { results: simulated, count: simulated.length, offset };
      }
      
      throw error;
    }
  }

  async getRecentEvents(limit?: number): Promise<SplunkEvent[]> {
    const res = await this.searchEvents(SPLUNK_QUERIES.RECENT_EVENTS, { limit });
    return res.results;
  }

  async getBruteForceEvents(limit?: number): Promise<SplunkEvent[]> {
    const res = await this.searchEvents(SPLUNK_QUERIES.BRUTE_FORCE, { limit });
    return res.results;
  }

  async getPrivilegeEscalationEvents(limit?: number): Promise<SplunkEvent[]> {
    const res = await this.searchEvents(SPLUNK_QUERIES.PRIVILEGE_ESCALATION, { limit });
    return res.results;
  }

  async getPowerShellEvents(limit?: number): Promise<SplunkEvent[]> {
    const res = await this.searchEvents(SPLUNK_QUERIES.POWERSHELL, { limit });
    return res.results;
  }

  /**
   * Ingests Splunk security events into PostgreSQL alerts.
   * Correct severity mapping per SOC requirements:
   *   4625 -> high, 4740 -> critical, 4672 -> medium, 4688 -> medium
   * Also triggers MITRE mapping and email alerts.
   */
  async ingestEventsAsAlerts(events: SplunkEvent[]): Promise<{ processed: number; created: number; skipped: number }> {
    logger.info({ count: events.length }, 'splunk: ingesting events as alerts');
    let created = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        const severity = this.mapEventCodeToSeverity(event.eventCode);
        const externalId = event.fields._cd || `splunk-${event.time}-${event.host}-${event.eventCode}`;
        
        const alertDto: CreateAlertDto = {
          title: `Splunk: ${event.eventCodeDescription}`,
          description: `Event Code ${event.eventCode} detected on host ${event.host}. Source: ${event.source}`,
          severity,
          status: 'new',
          source: 'splunk',
          externalId,
          sourceRuleId: event.eventCode,
          sourceRuleName: event.eventCodeDescription,
          rawEvent: { ...event.fields, host: event.host, srcIp: event.srcIp },
          tags: ['splunk', `event-${event.eventCode}`, event.sourcetype],
          firedAt: event.time
        };

        const alert = await this.alertService.createAlert(alertDto);
        
        // Check if newly created (not returned from cache = duplicate)
        const alertCreatedAt = new Date(alert.createdAt).getTime();
        const isNew = (Date.now() - alertCreatedAt) < 5000;
        
        if (isNew) {
          created++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        if (err.code === '23505') { skipped++; continue; }
        logger.error({ err: err.message, eventCode: event.eventCode }, 'splunk: failed to ingest event as alert');
      }
    }

    logger.info({ processed: events.length, created, skipped }, 'splunk: ingestion complete');
    return { processed: events.length, created, skipped };
  }

  private mapRowToSplunkEvent(row: any): SplunkEvent {
    const eventCode = row.EventCode || row.EventID || 'unknown';
    const desc = EVENT_ID_DESCRIPTIONS[eventCode] || 'Unknown Windows Security Event';
    
    return {
      time: row._time || new Date().toISOString(),
      raw: row._raw || '',
      host: row.host || 'unknown',
      source: row.source || 'splunk',
      sourcetype: row.sourcetype || 'splunk_event',
      eventCode,
      eventCodeDescription: desc,
      user: row.user || row.TargetUserName || 'unknown',
      srcIp: row.src_ip || row.IpAddress || undefined,
      destIp: row.dest_ip || undefined,
      processName: row.process_name || row.NewProcessName || undefined,
      commandLine: row.command_line || row.CommandLine || undefined,
      fields: row
    };
  }

  /**
   * Severity mapping per SOC requirements:
   * 4625 Failed Logon -> high
   * 4740 Account Lockout -> critical
   * 4672 Special Privileges -> medium
   * 4688 Process Creation -> medium
   * 4720 User Created -> high
   * 4728 Group Member Added -> critical
   * 7045 Service Installed -> critical
   * 4624 Success Logon -> info
   */
  private mapEventCodeToSeverity(code: string): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    switch (code) {
      case '4624': return 'info';
      case '4625': return 'high';
      case '4672': return 'medium';
      case '4688': return 'medium';
      case '4740': return 'critical';
      case '4720': return 'high';
      case '4728': return 'critical';
      case '7045': return 'critical';
      default:     return 'medium';
    }
  }

  private generateSimulatedEvents(queryText: string, limit: number, offset: number): SplunkEvent[] {
    const mockDb: SplunkEvent[] = [
      {
        time: new Date(Date.now() - 5 * 60000).toISOString(),
        raw: "Security: An account failed to log on. TargetUserName: administrator.",
        host: "win-prod-dc01", source: "WinEventLog:Security", sourcetype: "WinEventLog:Security",
        eventCode: "4625", eventCodeDescription: EVENT_ID_DESCRIPTIONS["4625"] || "An account failed to log on",
        user: "administrator", srcIp: "10.0.12.85",
        fields: { EventCode: "4625", TargetUserName: "administrator", IpAddress: "10.0.12.85", host: "win-prod-dc01", _cd: `sim-4625-${Date.now()}` }
      },
      {
        time: new Date(Date.now() - 15 * 60000).toISOString(),
        raw: "Security: A user account was locked out.",
        host: "win-prod-dc01", source: "WinEventLog:Security", sourcetype: "WinEventLog:Security",
        eventCode: "4740", eventCodeDescription: EVENT_ID_DESCRIPTIONS["4740"] || "A user account was locked out",
        user: "jdoe", srcIp: "10.0.5.55",
        fields: { EventCode: "4740", TargetUserName: "jdoe", host: "win-prod-dc01", _cd: `sim-4740-${Date.now()}` }
      },
      {
        time: new Date(Date.now() - 30 * 60000).toISOString(),
        raw: "Security: Special privileges assigned to new logon.",
        host: "win-prod-srv02", source: "WinEventLog:Security", sourcetype: "WinEventLog:Security",
        eventCode: "4672", eventCodeDescription: EVENT_ID_DESCRIPTIONS["4672"] || "Special privileges assigned",
        user: "SYSTEM",
        fields: { EventCode: "4672", host: "win-prod-srv02", _cd: `sim-4672-${Date.now()}` }
      },
      {
        time: new Date(Date.now() - 45 * 60000).toISOString(),
        raw: "Security: A new process has been created. NewProcessName: powershell.exe",
        host: "win-workstation-05", source: "WinEventLog:Security", sourcetype: "WinEventLog:Security",
        eventCode: "4688", eventCodeDescription: EVENT_ID_DESCRIPTIONS["4688"] || "A new process has been created",
        user: "local_admin", processName: "powershell.exe",
        fields: { EventCode: "4688", NewProcessName: "powershell.exe", host: "win-workstation-05", _cd: `sim-4688-${Date.now()}` }
      },
      {
        time: new Date(Date.now() - 60 * 60000).toISOString(),
        raw: "Security: An account was successfully logged on.",
        host: "win-prod-dc01", source: "WinEventLog:Security", sourcetype: "WinEventLog:Security",
        eventCode: "4624", eventCodeDescription: EVENT_ID_DESCRIPTIONS["4624"] || "An account was successfully logged on",
        user: "system_admin", srcIp: "10.0.1.200",
        fields: { EventCode: "4624", TargetUserName: "system_admin", IpAddress: "10.0.1.200", host: "win-prod-dc01", _cd: `sim-4624-${Date.now()}` }
      }
    ];

    let filtered = mockDb;
    if (queryText.includes("4625")) filtered = mockDb.filter(e => e.eventCode === "4625");
    else if (queryText.includes("4740")) filtered = mockDb.filter(e => e.eventCode === "4740");
    else if (queryText.includes("4688")) filtered = mockDb.filter(e => e.eventCode === "4688");
    else if (queryText.includes("4672")) filtered = mockDb.filter(e => e.eventCode === "4672");

    return filtered.slice(offset, offset + limit);
  }

  async getAlertVolume(earliest = '-24h'): Promise<any[]> {
    const q = `search index=${env.SPLUNK_INDEX || 'soc'} | bucket _time span=1h | stats count by _time | sort _time`;
    const res = await this.searchEvents(q, { earliestTime: earliest, limit: 1000 });
    return res.results.map((row: any) => ({
      hour: row.fields?._time || row.time,
      count: parseInt(row.fields?.count || '0', 10)
    }));
  }

  async getTopAttackingIps(limit = 10): Promise<any[]> {
    const q = `search index=${env.SPLUNK_INDEX || 'soc'} (IpAddress=* OR src_ip=*) | eval ip=coalesce(IpAddress,src_ip) | where ip != "-" AND ip != "" | stats count by ip | sort -count`;
    const res = await this.searchEvents(q, { limit });
    return res.results.map((row: any) => ({
      ip: row.fields?.ip || row.fields?.IpAddress || row.fields?.src_ip || row.srcIp || 'unknown',
      count: parseInt(row.fields?.count || '0', 10)
    }));
  }

  async pruneOldAlerts(days = 30): Promise<number> {
    logger.info({ days }, 'splunk: pruning old alerts from database');
    const deleteSql = `DELETE FROM alerts WHERE fired_at < now() - interval '${days} days'`;
    const { query } = await import('../../config/database');
    const res = await query(deleteSql);
    return res.rowCount || 0;
  }
}
