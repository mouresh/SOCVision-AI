import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../../config/database';
import { logger } from '../../config/logger';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportData {
  period: ReportPeriod;
  generatedAt: string;
  alertCount: number;
  incidentCount: number;
  criticalAlerts: number;
  highAlerts: number;
  resolvedIncidents: number;
  avgRiskScore: number;
  mttr: string;
  topHosts: Array<{ host: string; count: number }>;
  mitreBreakdown: Array<{ technique: string; count: number }>;
  riskTrend: Array<{ date: string; score: number }>;
  alertsByEventCode: Array<{ eventCode: string; description: string; count: number }>;
  filePath: string;
}

export class ReportService {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(this.reportsDir)) fs.mkdirSync(this.reportsDir, { recursive: true });
  }

  private getDateRange(period: ReportPeriod): { since: string } {
    const ms = period === 'daily' ? 86400000 : period === 'weekly' ? 604800000 : 2592000000;
    return { since: new Date(Date.now() - ms).toISOString() };
  }

  async collectData(period: ReportPeriod): Promise<Omit<ReportData, 'filePath'>> {
    const { since } = this.getDateRange(period);

    const [alertR, incR, critR, highR, resolvedR, riskR, mttrR, hostsR, ecR, trendR, mitreR] = await Promise.all([
      query('SELECT COUNT(*) FROM alerts WHERE created_at >= $1', [since]),
      query('SELECT COUNT(*) FROM incidents WHERE created_at >= $1', [since]),
      query("SELECT COUNT(*) FROM alerts WHERE severity='critical' AND created_at >= $1", [since]),
      query("SELECT COUNT(*) FROM alerts WHERE severity='high' AND created_at >= $1", [since]),
      query("SELECT COUNT(*) FROM incidents WHERE status='closed' AND created_at >= $1", [since]),
      query('SELECT AVG(risk_score) as avg FROM alerts WHERE risk_score IS NOT NULL AND created_at >= $1', [since]),
      query(`SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at,contained_at,updated_at)-created_at))) as avg_s FROM incidents WHERE status IN ('contained','closed') AND created_at >= $1`, [since]),
      query(`SELECT raw_event->>'host' as host, COUNT(*) as cnt FROM alerts WHERE created_at >= $1 AND raw_event->>'host' IS NOT NULL GROUP BY host ORDER BY cnt DESC LIMIT 10`, [since]),
      query(`SELECT source_rule_id as ec, source_rule_name as event_desc, COUNT(*) as cnt FROM alerts WHERE created_at >= $1 AND source_rule_id IS NOT NULL GROUP BY source_rule_id, source_rule_name ORDER BY cnt DESC LIMIT 10`, [since]),
      query(`SELECT DATE_TRUNC('day', created_at) as day, AVG(risk_score) as avg_score FROM alerts WHERE risk_score IS NOT NULL AND created_at >= $1 GROUP BY day ORDER BY day`, [since]),
      query(`SELECT mt.technique_id, COUNT(*) as cnt FROM alert_mitre_mapping amm JOIN mitre_techniques mt ON mt.id = amm.technique_id JOIN alerts a ON a.id = amm.alert_id WHERE a.created_at >= $1 GROUP BY mt.technique_id ORDER BY cnt DESC LIMIT 10`, [since]),
    ]);

    const fmt = (s: number) => { if (!s || s <= 0) return 'N/A'; const m = Math.round(s/60); return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`; };

    return {
      period,
      generatedAt: new Date().toISOString(),
      alertCount: parseInt(alertR.rows[0]?.count || '0', 10),
      incidentCount: parseInt(incR.rows[0]?.count || '0', 10),
      criticalAlerts: parseInt(critR.rows[0]?.count || '0', 10),
      highAlerts: parseInt(highR.rows[0]?.count || '0', 10),
      resolvedIncidents: parseInt(resolvedR.rows[0]?.count || '0', 10),
      avgRiskScore: Math.round(parseFloat(riskR.rows[0]?.avg || '0')),
      mttr: fmt(parseFloat(mttrR.rows[0]?.avg_s || '0')),
      topHosts: hostsR.rows.map((r: any) => ({ host: r.host, count: parseInt(r.cnt, 10) })),
      mitreBreakdown: mitreR.rows.map((r: any) => ({ technique: r.technique_id, count: parseInt(r.cnt, 10) })),
      riskTrend: trendR.rows.map((r: any) => ({ date: new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), score: Math.round(parseFloat(r.avg_score || '0')) })),
      alertsByEventCode: ecR.rows.map((r: any) => ({ eventCode: r.ec, description: r.event_desc || 'Unknown', count: parseInt(r.cnt, 10) }))
    };
  }

  async generate(period: ReportPeriod): Promise<ReportData> {
    logger.info({ period }, 'report-service: generating PDF');
    const data = await this.collectData(period);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filePath = path.join(this.reportsDir, `socvision-${period}-${ts}.pdf`);
    await this.buildPDF(data, filePath);
    logger.info({ filePath }, 'report-service: PDF ready');
    return { ...data, filePath };
  }

  private buildPDF(data: Omit<ReportData, 'filePath'>, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.rect(0, 0, doc.page.width, 80).fill('#0d1117');
      doc.fillColor('#e6edf3').fontSize(20).font('Helvetica-Bold').text('SOCVision AI — Security Report', 50, 25);
      doc.fillColor('#8b949e').fontSize(10).text(`Generated: ${new Date(data.generatedAt).toLocaleString()} | Period: ${data.period.toUpperCase()}`, 50, 52);
      doc.fillColor('#e6edf3').moveDown(2.5).font('Helvetica').fontSize(10);

      const row = (label: string, value: string) => {
        doc.fillColor('#8b949e').text(label + ': ', 60, undefined, { continued: true });
        doc.fillColor('#e6edf3').text(value);
      };

      doc.fillColor('#1f6feb').fontSize(13).font('Helvetica-Bold').text('Executive Summary', 50).moveDown(0.3);
      doc.rect(50, doc.y, doc.page.width - 100, 1).fill('#30363d').moveDown(0.4).font('Helvetica').fontSize(10);
      row('Total Alerts', String(data.alertCount)); row('Total Incidents', String(data.incidentCount));
      row('Critical Alerts', String(data.criticalAlerts)); row('High Alerts', String(data.highAlerts));
      row('Avg Risk Score', String(data.avgRiskScore)); row('MTTR', data.mttr);

      doc.moveDown(1).fillColor('#1f6feb').fontSize(13).font('Helvetica-Bold').text('Top Affected Hosts', 50).moveDown(0.3);
      doc.rect(50, doc.y, doc.page.width - 100, 1).fill('#30363d').moveDown(0.4).font('Helvetica').fontSize(10);
      data.topHosts.slice(0, 8).forEach((h, i) => {
        doc.fillColor('#e6edf3').text(`${i+1}. ${h.host}`, 60, undefined, { continued: true });
        doc.fillColor('#ff9f0a').text(` — ${h.count} events`);
      });

      doc.moveDown(1).fillColor('#1f6feb').fontSize(13).font('Helvetica-Bold').text('Alerts by Event Code', 50).moveDown(0.3);
      doc.rect(50, doc.y, doc.page.width - 100, 1).fill('#30363d').moveDown(0.4).font('Helvetica').fontSize(10);
      data.alertsByEventCode.slice(0, 8).forEach(ec => {
        doc.fillColor('#8b949e').text(`${ec.eventCode}: `, 60, undefined, { continued: true });
        doc.fillColor('#e6edf3').text(`${ec.description} `, { continued: true });
        doc.fillColor('#0a84ff').text(`(${ec.count})`);
      });

      doc.moveDown(1).fillColor('#1f6feb').fontSize(13).font('Helvetica-Bold').text('MITRE ATT&CK Techniques', 50).moveDown(0.3);
      doc.rect(50, doc.y, doc.page.width - 100, 1).fill('#30363d').moveDown(0.4).font('Helvetica').fontSize(10);
      if (data.mitreBreakdown.length === 0) {
        doc.fillColor('#8b949e').text('No mappings in this period.', 60);
      } else {
        data.mitreBreakdown.forEach(m => {
          doc.fillColor('#e6edf3').text(`• ${m.technique}`, 60, undefined, { continued: true });
          doc.fillColor('#8b949e').text(` — ${m.count} alerts`);
        });
      }

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  listReports(): string[] {
    if (!fs.existsSync(this.reportsDir)) return [];
    return fs.readdirSync(this.reportsDir).filter(f => f.endsWith('.pdf'))
      .map(f => path.join(this.reportsDir, f)).sort().reverse();
  }
}


