import { Router, Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email/email.service';

const router = Router();
const emailService = new EmailService();

router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testPayload = {
      id: 'test-alert-id-12345',
      title: 'Test Security Alert — SMTP Connection Verification',
      severity: 'critical',
      source: 'test-source',
      description: 'This is a test alert description sent to verify SMTP configuration.',
      sourceRuleId: '9999',
      host: 'TEST-HOST-01',
      srcIp: '192.168.1.100',
      firedAt: new Date(),
      riskScore: 99,
      mitreTechnique: 'T1110 - Brute Force',
      aiSummary: 'This is a simulated AI analysis summary confirming successful SMTP delivery.'
    };

    const connResult = await emailService.testConnection();
    if (!connResult.success) {
      res.status(500).json({ success: false, error: { message: `SMTP verification failed: ${connResult.message}` } });
      return;
    }

    const sent = await emailService.sendCriticalAlert(testPayload);
    if (sent) {
      res.json({ success: true, message: 'Test email delivered successfully.', target: process.env.SMTP_TO || process.env.SMTP_USER });
    } else {
      res.status(500).json({ success: false, error: { message: 'SMTP connected but failed to send the email.' } });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
