import { query } from '../../config/database';
import { logger } from '../../config/logger';

const EVENT_CODE_TO_MITRE: Record<string, { techniqueId: string; name: string; tactic: string; platforms: string[] }> = {
  '4625': { techniqueId: 'T1110', name: 'Brute Force', tactic: 'credential_access', platforms: ['Windows'] },
  '4740': { techniqueId: 'T1110', name: 'Brute Force', tactic: 'credential_access', platforms: ['Windows'] },
  '4672': { techniqueId: 'T1078', name: 'Valid Accounts', tactic: 'defense_evasion', platforms: ['Windows', 'Linux', 'macOS'] },
  '4720': { techniqueId: 'T1136', name: 'Create Account', tactic: 'persistence', platforms: ['Windows'] },
  '4728': { techniqueId: 'T1098', name: 'Account Manipulation', tactic: 'persistence', platforms: ['Windows'] },
  '4688': { techniqueId: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'execution', platforms: ['Windows'] },
  '7045': { techniqueId: 'T1543', name: 'Create or Modify System Process', tactic: 'persistence', platforms: ['Windows'] },
  '4624': { techniqueId: 'T1078', name: 'Valid Accounts', tactic: 'initial_access', platforms: ['Windows'] },
};

export class MitreService {
  async ensureTechnique(techniqueId: string): Promise<string | null> {
    try {
      const existing = await query('SELECT id FROM mitre_techniques WHERE technique_id = $1', [techniqueId]);
      if (existing.rows.length > 0) return existing.rows[0].id;

      const info = Object.values(EVENT_CODE_TO_MITRE).find(m => m.techniqueId === techniqueId);
      if (!info) { logger.warn({ techniqueId }, 'mitre-service: unknown technique'); return null; }

      const insertRes = await query(
        `INSERT INTO mitre_techniques (technique_id, name, tactic, platforms, data_sources, is_subtechnique, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (technique_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [techniqueId, info.name, info.tactic, info.platforms, ['Windows Event Logs'], false, '15.1']
      );
      logger.info({ techniqueId }, 'mitre-service: technique seeded');
      return insertRes.rows[0]?.id || null;
    } catch (err: any) {
      logger.error({ err: err.message, techniqueId }, 'mitre-service: failed to ensure technique');
      return null;
    }
  }

  async seedAllTechniques(): Promise<number> {
    const uniqueTechniques = [...new Set(Object.values(EVENT_CODE_TO_MITRE).map(m => m.techniqueId))];
    let seeded = 0;
    for (const tid of uniqueTechniques) {
      const id = await this.ensureTechnique(tid);
      if (id) seeded++;
    }
    logger.info({ seeded }, 'mitre-service: seed complete');
    return seeded;
  }

  async assignTechnique(alertId: string, eventCode: string): Promise<void> {
    const mapping = EVENT_CODE_TO_MITRE[eventCode];
    if (!mapping) return;

    try {
      const techniqueUuid = await this.ensureTechnique(mapping.techniqueId);
      if (!techniqueUuid) return;

      await query(
        `INSERT INTO alert_mitre_mapping (alert_id, technique_id, confidence, auto_mapped)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (alert_id, technique_id) DO NOTHING`,
        [alertId, techniqueUuid, 85]
      );
      logger.debug({ alertId, techniqueId: mapping.techniqueId }, 'mitre-service: technique assigned');
    } catch (err: any) {
      logger.error({ err: err.message, alertId, eventCode }, 'mitre-service: assignment failed');
    }
  }

  async getStats(): Promise<{ total: number; techniques: Array<{ technique_id: string; count: number }> }> {
    const totalRes = await query('SELECT COUNT(*) FROM alert_mitre_mapping');
    const techniqueRes = await query(
      `SELECT mt.technique_id, COUNT(*) as cnt
       FROM alert_mitre_mapping amm
       JOIN mitre_techniques mt ON mt.id = amm.technique_id
       GROUP BY mt.technique_id ORDER BY cnt DESC`
    );
    return {
      total: parseInt(totalRes.rows[0]?.count || '0', 10),
      techniques: techniqueRes.rows.map((r: any) => ({ technique_id: r.technique_id, count: parseInt(r.cnt, 10) }))
    };
  }
}
