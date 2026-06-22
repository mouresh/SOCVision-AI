import { Router, Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report/report.service';
import { MitreService } from '../services/mitre/mitre.service';
import path from 'path';
import fs from 'fs';

const router = Router();
const reportService = new ReportService();
const mitreService = new MitreService();

// POST /api/v1/reports/generate
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.body?.period || 'daily') as 'daily' | 'weekly' | 'monthly';
    const data = await reportService.generate(period);
    res.json({ success: true, data, timestamp: new Date().toISOString(), requestId: (req as any).requestId || 'unknown' });
  } catch (error) { next(error); }
});

// GET /api/v1/reports/list
router.get('/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const files = reportService.listReports().map(f => ({
      name: path.basename(f), path: f,
      size: fs.statSync(f).size, createdAt: fs.statSync(f).birthtime
    }));
    res.json({ success: true, data: files, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

// GET /api/v1/reports/download/:filename
router.get('/download/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const safeFileName = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), 'reports', safeFileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
      return;
    }
    res.download(filePath);
  } catch (error) { next(error); }
});

// GET /api/v1/reports/mitre-stats
router.get('/mitre-stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await mitreService.getStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

// POST /api/v1/reports/seed-mitre
router.post('/seed-mitre', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const seeded = await mitreService.seedAllTechniques();
    const stats = await mitreService.getStats();
    res.json({ success: true, data: { seeded, stats }, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
