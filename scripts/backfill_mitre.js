const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'socvision',
    user: 'postgres',
    password: 'postgres'
  });

  await client.connect();
  console.log('Connected to PostgreSQL database.');

  const queryText = `
    INSERT INTO alert_mitre_mapping (alert_id, technique_id, confidence, auto_mapped)
    SELECT 
      a.id as alert_id,
      mt.id as technique_id,
      85 as confidence,
      true as auto_mapped
    FROM alerts a
    JOIN mitre_techniques mt ON mt.technique_id = (
      CASE a.source_rule_id
        WHEN '4625' THEN 'T1110'
        WHEN '4740' THEN 'T1110'
        WHEN '4672' THEN 'T1078'
        WHEN '4720' THEN 'T1136'
        WHEN '4728' THEN 'T1098'
        WHEN '4688' THEN 'T1059'
        WHEN '7045' THEN 'T1543'
        WHEN '4624' THEN 'T1078'
      END
    )
    ON CONFLICT (alert_id, technique_id) DO NOTHING;
  `;

  const res = await client.query(queryText);
  console.log(`Backfill complete: mapped ${res.rowCount} alerts to MITRE techniques.`);

  await client.end();
})().catch(e => {
  console.error('Backfill error:', e);
  process.exit(1);
});
