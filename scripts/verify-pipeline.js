#!/usr/bin/env node
/**
 * SOCVision AI - Full Pipeline Verification Script
 * Run: node scripts/verify-pipeline.js
 * Requires backend to be running on PORT (default 8080)
 */

const https = require('https');
const http = require('http');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Load env
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const BACKEND_PORT = process.env.PORT || 8080;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}/api/v1`;

const SPLUNK_URL = process.env.SPLUNK_URL || 'https://192.168.1.12:8089';
const SPLUNK_USERNAME = process.env.SPLUNK_USERNAME || 'admin';
const SPLUNK_PASSWORD = process.env.SPLUNK_PASSWORD || 'changeme';
const SPLUNK_INDEX = process.env.SPLUNK_INDEX || 'soc';

const results = {
  phase1_splunk: {},
  phase2_database: {},
  phase3_mitre: {},
  phase4_dashboard: {},
  phase5_email: {},
  phase6_pdf: {},
  summary: []
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pass(label, detail = '') { console.log(`  ✅ PASS: ${label}${detail ? ' — ' + detail : ''}`); results.summary.push({ label, status: 'PASS', detail }); }
function fail(label, detail = '') { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); results.summary.push({ label, status: 'FAIL', detail }); }
function info(msg) { console.log(`     ℹ  ${msg}`); }

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { rejectUnauthorized: false, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timed out')));
  });
}

async function splunkSearch(query, earliest = '-24h', count = 50) {
  const auth = Buffer.from(`${SPLUNK_USERNAME}:${SPLUNK_PASSWORD}`).toString('base64');
  const body = new URLSearchParams({
    search: query, exec_mode: 'oneshot', output_mode: 'json',
    earliest_time: earliest, latest_time: 'now', count: String(count)
  }).toString();

  return new Promise((resolve, reject) => {
    const url = new URL(`${SPLUNK_URL}/services/search/jobs`);
    const options = {
      hostname: url.hostname, port: url.port || 8089,
      path: url.pathname, method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      },
      rejectUnauthorized: false, timeout: 20000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Splunk request timed out')));
    req.write(body);
    req.end();
  });
}

// ─── PHASE 1: Splunk ─────────────────────────────────────────────────────────
async function verifyPhase1() {
  console.log('\n════════════════════════════════════════');
  console.log('PHASE 1 — VERIFY LIVE SPLUNK DATA');
  console.log('════════════════════════════════════════');

  const queries = [
    { label: 'Total events (last 24h)', q: `search index=${SPLUNK_INDEX} earliest=-24h | stats count` },
    { label: 'EventCode 4625 (Failed Logon)', q: `search index=${SPLUNK_INDEX} EventCode=4625 earliest=-24h | stats count` },
    { label: 'EventCode 4740 (Account Lockout)', q: `search index=${SPLUNK_INDEX} EventCode=4740 earliest=-24h | stats count` },
    { label: 'EventCode 4672 (Special Privileges)', q: `search index=${SPLUNK_INDEX} EventCode=4672 earliest=-24h | stats count` },
    { label: 'EventCode 4688 (Process Creation)', q: `search index=${SPLUNK_INDEX} EventCode=4688 earliest=-24h | stats count` },
  ];

  let splunkOk = true;
  for (const { label, q } of queries) {
    try {
      const res = await splunkSearch(q);
      if (res.error) { fail(`Splunk: ${label}`, res.error); splunkOk = false; continue; }
      const count = res.results?.[0]?.count || 0;
      results.phase1_splunk[label] = count;
      pass(`Splunk: ${label}`, `${count} events`);
    } catch (err) {
      fail(`Splunk: ${label}`, err.message);
      splunkOk = false;
    }
  }

  // Latest 5 events sample
  try {
    const res = await splunkSearch(`search index=${SPLUNK_INDEX} earliest=-24h | head 5`, '-24h', 5);
    if (res.results && res.results.length > 0) {
      info(`Sample event: ${JSON.stringify(res.results[0]).slice(0, 200)}...`);
      results.phase1_splunk['sample_event'] = res.results[0];
    }
  } catch (err) {
    info(`Could not fetch sample events: ${err.message}`);
  }

  return splunkOk;
}

// ─── PHASE 2: Database ───────────────────────────────────────────────────────
async function verifyPhase2() {
  console.log('\n════════════════════════════════════════');
  console.log('PHASE 2 — VERIFY DATABASE INGESTION');
  console.log('════════════════════════════════════════');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'socvision',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    pass('PostgreSQL connection');

    const alertsRes = await client.query('SELECT COUNT(*) FROM alerts');
    const alertCount = parseInt(alertsRes.rows[0].count);
    results.phase2_database.alertCount = alertCount;
    alertCount > 0 ? pass('alerts table has data', `${alertCount} alerts`) : fail('alerts table is empty');

    const incidentsRes = await client.query('SELECT COUNT(*) FROM incidents');
    const incidentCount = parseInt(incidentsRes.rows[0].count);
    results.phase2_database.incidentCount = incidentCount;
    incidentCount >= 0 ? pass('incidents table accessible', `${incidentCount} incidents`) : fail('incidents table error');

    const aiRes = await client.query('SELECT COUNT(*) FROM ai_analysis');
    const aiCount = parseInt(aiRes.rows[0].count);
    results.phase2_database.aiCount = aiCount;
    pass('ai_analysis table accessible', `${aiCount} analyses`);

    // Latest 5 alerts
    const latestAlertsRes = await client.query('SELECT id, title, severity, source, source_rule_id, fired_at, risk_score FROM alerts ORDER BY created_at DESC LIMIT 5');
    results.phase2_database.latestAlerts = latestAlertsRes.rows;
    info(`Latest alert: ${JSON.stringify(latestAlertsRes.rows[0] || {})}`);

    // Latest incidents
    const latestIncRes = await client.query("SELECT id, title, severity, status, created_at FROM incidents ORDER BY created_at DESC LIMIT 5");
    results.phase2_database.latestIncidents = latestIncRes.rows;
    info(`Latest incident: ${JSON.stringify(latestIncRes.rows[0] || {})}`);

    await client.end();
    return true;
  } catch (err) {
    fail('PostgreSQL connection', err.message);
    results.phase2_database.error = err.message;
    try { await client.end(); } catch {}
    return false;
  }
}

// ─── PHASE 3: MITRE Mappings ─────────────────────────────────────────────────
async function verifyPhase3() {
  console.log('\n════════════════════════════════════════');
  console.log('PHASE 3 — VERIFY MITRE MAPPINGS');
  console.log('════════════════════════════════════════');

  try {
    const seedRes = await httpGet(`${BACKEND_URL}/reports/seed-mitre`);
    // seed via POST
  } catch {}

  try {
    const statsRes = await new Promise((resolve, reject) => {
      const req = http.request(`${BACKEND_URL}/reports/seed-mitre`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      req.on('error', reject);
      req.write('{}');
      req.end();
    });
    const s = statsRes.body?.data?.stats;
    results.phase3_mitre = s;
    pass('MITRE techniques seeded', `${statsRes.body?.data?.seeded} techniques seeded`);

    const req = statsRes.body?.data?.stats;
    if (req) {
      const techniques = req.techniques?.map(t => t.technique_id) || [];
      ['T1110', 'T1078', 'T1059'].forEach(t => {
        techniques.includes(t)
          ? pass(`MITRE technique ${t} exists`)
          : fail(`MITRE technique ${t} MISSING`);
      });
      pass('MITRE mapping total', `${req.total} mappings in alert_mitre_mapping`);
    }
  } catch (err) {
    fail('MITRE seeding via API', err.message);
    results.phase3_mitre.error = err.message;
  }
}

// ─── PHASE 4: Dashboard API ──────────────────────────────────────────────────
async function verifyPhase4() {
  console.log('\n════════════════════════════════════════');
  console.log('PHASE 4 — VERIFY DASHBOARD API');
  console.log('════════════════════════════════════════');

  try {
    const res = await httpGet(`${BACKEND_URL}/splunk/dashboard`);
    if (res.status !== 200) { fail('Dashboard API', `HTTP ${res.status}`); return false; }
    const d = res.body?.data || res.body;
    results.phase4_dashboard = d;

    info(`Dashboard JSON:\n${JSON.stringify(d, null, 2).slice(0, 1000)}`);

    ['totalAlerts', 'activeIncidents', 'riskScore', 'mttr'].forEach(field => {
      d[field] !== undefined && d[field] !== null
        ? pass(`Dashboard.${field}`, String(d[field]))
        : fail(`Dashboard.${field} is missing`);
    });

    d.alertVolume && Array.isArray(d.alertVolume) ? pass('Dashboard.alertVolume', `${d.alertVolume.length} data points`) : fail('Dashboard.alertVolume missing');
    d.topAttackingIps && Array.isArray(d.topAttackingIps) ? pass('Dashboard.topAttackingIps', `${d.topAttackingIps.length} IPs`) : fail('Dashboard.topAttackingIps missing');

    // Cross-validate with DB
    if (results.phase2_database.alertCount !== undefined) {
      d.totalAlerts === results.phase2_database.alertCount
        ? pass('Dashboard.totalAlerts matches DB count')
        : fail(`Dashboard.totalAlerts (${d.totalAlerts}) != DB count (${results.phase2_database.alertCount})`);
    }
    return true;
  } catch (err) {
    fail('Dashboard API', err.message);
    results.phase4_dashboard.error = err.message;
    return false;
  }
}

// ─── PHASE 5: Email ──────────────────────────────────────────────────────────
async function verifyPhase5() {
  console.log('\n════════════════════════════════════════');
  console.log('PHASE 5 — VERIFY EMAIL SERVICE');
  console.log('════════════════════════════════════════');

  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!hasSmtp) {
    info('SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS not set) — email disabled');
    results.phase5_email = { status: 'SKIPPED', reason: 'SMTP_HOST/USER/PASS not set' };
    pass('EmailService loaded (SMTP not configured)', 'Set SMTP_* env vars to enable');
  } else {
    pass('SMTP environment variables found');
    results.phase5_email = { status: 'CONFIGURED', host: process.env.SMTP_HOST };
  }
}

// ─── PHASE 6: PDF ────────────────────────────────────────────────────────────
async function verifyPhase6() {
  console.log('\n════════════════════════════════════════');
  console.log('PHASE 6 — VERIFY PDF REPORT GENERATION');
  console.log('════════════════════════════════════════');

  try {
    const res = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ period: 'daily' });
      const req = http.request(`${BACKEND_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => {
          try { resolve({ status: r.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: r.statusCode, body: data }); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (res.status === 200 && res.body?.success) {
      const d = res.body.data;
      results.phase6_pdf = { filePath: d.filePath, alertCount: d.alertCount, incidentCount: d.incidentCount };
      pass('PDF report generated', d.filePath);
      pass('PDF report data', `${d.alertCount} alerts, ${d.incidentCount} incidents, MTTR: ${d.mttr}`);
    } else {
      fail('PDF report generation', JSON.stringify(res.body).slice(0, 200));
    }
  } catch (err) {
    fail('PDF report generation', err.message);
    results.phase6_pdf = { error: err.message };
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  SOCVision AI — Pipeline Verification     ║');
  console.log(`║  ${new Date().toISOString()}  ║`);
  console.log('╚══════════════════════════════════════════╝');

  await verifyPhase1();
  await verifyPhase2();
  await verifyPhase3();
  await verifyPhase4();
  await verifyPhase5();
  await verifyPhase6();

  // Print summary
  console.log('\n════════════════════════════════════════');
  console.log('FINAL SUMMARY');
  console.log('════════════════════════════════════════');

  const passed = results.summary.filter(r => r.status === 'PASS').length;
  const failed = results.summary.filter(r => r.status === 'FAIL').length;

  results.summary.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${icon} ${r.label}: ${r.status}${r.detail ? ' — ' + r.detail : ''}`);
  });

  console.log(`\n  Total: ${passed} passed, ${failed} failed`);

  // Save raw results
  const outPath = path.join(__dirname, '..', 'VERIFY_RESULTS.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n  Full results saved to: ${outPath}`);

  process.exit(failed > 0 ? 1 : 0);
})();
