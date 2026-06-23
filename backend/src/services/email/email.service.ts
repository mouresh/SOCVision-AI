import nodemailer from 'nodemailer';
import { logger } from '../../config/logger';

export interface AlertEmailPayload {
  id: string;
  title: string;
  severity: string;
  source: string;
  description?: string | null;
  sourceRuleId?: string | null;
  host?: string;
  srcIp?: string;
  firedAt?: Date | string;
  riskScore?: number | null;
  mitreTechnique?: string;
  aiSummary?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly to: string;
  private readonly enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM || user || 'socvision@noreply.local';
    this.to = process.env.SMTP_TO || user || '';
    this.enabled = !!(host && user && pass && this.to);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host, port, secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      logger.info({ host, port, to: this.to }, 'email-service: SMTP initialized');
    } else {
      logger.debug('email-service: SMTP not configured — emails disabled');
    }
  }

  private async send(subject: string, html: string): Promise<boolean> {
    if (!this.transporter || !this.enabled) {
      logger.info({ subject, to: this.to || 'simulation@local' }, 'email-service: [SIMULATED] email sent (SMTP not configured)');
      return true;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: this.to, subject, html });
      logger.info({ subject, to: this.to }, 'email-service: email sent');
      return true;
    } catch (err: any) {
      logger.error({ err: err.message, subject }, 'email-service: send failed');
      return false;
    }
  }

  private alertHtml(alert: AlertEmailPayload, heading: string): string {
    const colors: Record<string, string> = { critical: '#ff2d55', high: '#ff9f0a', medium: '#ffd60a', low: '#34c759', info: '#0a84ff' };
    const c = colors[alert.severity?.toLowerCase()] || '#888';
    return `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0d1117;color:#e6edf3;border-radius:8px;border:1px solid #30363d;overflow:hidden">
      <div style="background:${c};padding:16px 24px"><h2 style="margin:0;color:#fff">🚨 SOCVision AI — ${heading}</h2></div>
      <div style="padding:24px">
        <p style="margin:8px 0"><strong>Alert ID:</strong> <code>${alert.id}</code></p>
        <p style="margin:8px 0"><strong>Alert:</strong> ${alert.title}</p>
        <p style="margin:8px 0"><strong>Severity:</strong> <span style="color:${c};font-weight:bold">${alert.severity?.toUpperCase()}</span></p>
        <p style="margin:8px 0"><strong>EventCode:</strong> ${alert.sourceRuleId || 'N/A'}</p>
        <p style="margin:8px 0"><strong>Host:</strong> ${alert.host || 'N/A'}</p>
        <p style="margin:8px 0"><strong>Source IP:</strong> ${alert.srcIp || 'N/A'}</p>
        <p style="margin:8px 0"><strong>Risk Score:</strong> ${alert.riskScore ?? 'N/A'}/100</p>
        <p style="margin:8px 0"><strong>MITRE Technique:</strong> ${alert.mitreTechnique || 'N/A'}</p>
        <p style="margin:8px 0"><strong>Timestamp:</strong> ${alert.firedAt ? new Date(alert.firedAt as any).toISOString() : 'N/A'}</p>
        ${alert.aiSummary ? `<div style="margin-top:16px;padding:12px;background:#161b22;border-left:4px solid #005cc5;border-radius:4px">
          <strong style="color:#58a6ff">🤖 AI Analyst Summary:</strong>
          <p style="margin:8px 0 0 0;font-size:14px;line-height:1.5">${alert.aiSummary}</p>
        </div>` : ''}
        ${alert.description ? `<p style="color:#8b949e;margin-top:16px;font-size:13px">${alert.description}</p>` : ''}
        <p style="font-size:12px;color:#8b949e;border-top:1px solid #30363d;padding-top:12px;margin-top:16px">SOCVision AI | Automated Alert</p>
      </div>
    </div>`;
  }

  async sendCriticalAlert(alert: AlertEmailPayload): Promise<boolean> {
    return this.send(`🚨 [CRITICAL] ${alert.title}`, this.alertHtml(alert, 'Critical Security Alert'));
  }

  async sendAccountLockout(alert: AlertEmailPayload): Promise<boolean> {
    return this.send(`🔒 [HIGH] Account Lockout — ${alert.host || 'Unknown Host'}`, this.alertHtml(alert, 'Account Lockout (4740)'));
  }

  async sendBruteForceAlert(alert: AlertEmailPayload): Promise<boolean> {
    return this.send(`⚠️ [HIGH] Brute Force — ${alert.host || 'Unknown Host'}`, this.alertHtml(alert, 'Brute Force (4625)'));
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter || !this.enabled) {
      return { success: true, message: 'SMTP simulation mode ready' };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection verified' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
