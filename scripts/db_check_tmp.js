const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost',port:5432,database:'socvision',user:'postgres',password:'postgres' });
  await c.connect();
  const [a,i,ai] = await Promise.all([
    c.query('SELECT COUNT(*) as cnt FROM alerts'),
    c.query('SELECT COUNT(*) as cnt FROM incidents'),
    c.query('SELECT COUNT(*) as cnt FROM ai_analysis')
  ]);
  console.log('ALERTS=' + a.rows[0].cnt);
  console.log('INCIDENTS=' + i.rows[0].cnt);
  console.log('AI_ANALYSIS=' + ai.rows[0].cnt);
  const la = await c.query("SELECT id, title, severity, source_rule_id, risk_score, fired_at FROM alerts ORDER BY created_at DESC LIMIT 5");
  la.rows.forEach(r => console.log('ALERT: ' + JSON.stringify(r)));
  const li = await c.query("SELECT id, title, severity, status FROM incidents ORDER BY created_at DESC LIMIT 3");
  li.rows.forEach(r => console.log('INCIDENT: ' + JSON.stringify(r)));
  await c.end();
})().catch(e => console.error('DB_ERROR: ' + e.message));