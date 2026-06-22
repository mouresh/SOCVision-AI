import { createApp } from '../src/app';
import { query } from '../src/config/database';
import axios from 'axios';
import http from 'http';

async function runTests() {
  console.log('=== STARTING n8n INTEGRATION TESTS ===');
  
  process.env.NODE_ENV = 'test';
  
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testAlertId = '33333333-3333-3333-3333-333333333333';
  const testIncidentId = '44444444-4444-4444-4444-444444444444';
  const testMitreId = '55555555-5555-5555-5555-555555555555';
  
  try {
    // 0. Database Setup
    console.log('Setting up mock database state...');
    
    // Ensure test user exists
    await query(`
      INSERT INTO users (
        id, email, username, full_name, password_hash, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [testUserId, 'analyst@socvision.ai', 'analyst1', 'Primary Analyst', 'mock_hash', 'UTC']);
    
    // Clear any previous test records
    await query('DELETE FROM audit_logs WHERE resource_type = \'incident\' AND resource_id = $1', [testIncidentId]);
    await query('DELETE FROM incident_alerts WHERE alert_id = $1 OR incident_id = $2', [testAlertId, testIncidentId]);
    await query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    await query('DELETE FROM alert_mitre_mapping WHERE alert_id = $1', [testAlertId]);
    await query('DELETE FROM mitre_techniques WHERE id = $1', [testMitreId]);
    await query('DELETE FROM alerts WHERE id = $1', [testAlertId]);
    
    // Insert mock alert (Event ID 4625 brute force)
    console.log('Inserting mock alert...');
    await query(`
      INSERT INTO alerts (
        id, title, severity, status, source, source_rule_id, raw_event, enrichment, risk_score, risk_level
      ) VALUES ($1, $2, $3::severity_level, $4::alert_status, $5, $6, $7, $8, $9, $10)
    `, [
      testAlertId,
      'Multiple Failed Logon Attempts',
      'high',
      'new',
      'splunk',
      '4625',
      JSON.stringify({
        host: 'win-prod-dc01',
        EventCode: '4625',
        IpAddress: '10.0.12.85',
        TargetUserName: 'administrator'
      }),
      JSON.stringify({}),
      95.00,
      'CRITICAL'
    ]);
    
    // Insert mock MITRE technique
    console.log('Inserting mock MITRE technique...');
    await query(`
      INSERT INTO mitre_techniques (
        id, technique_id, name, tactic, description
      ) VALUES ($1, $2, $3, $4::mitre_tactic, $5)
    `, [
      testMitreId,
      'T1110',
      'Brute Force',
      'credential_access',
      'Adversaries may use brute force techniques to gain access to accounts.'
    ]);
    
    // Link alert to MITRE mapping
    console.log('Linking alert to MITRE mapping...');
    await query(`
      INSERT INTO alert_mitre_mapping (
        alert_id, technique_id, confidence, auto_mapped
      ) VALUES ($1, $2, $3, $4)
    `, [testAlertId, testMitreId, 90, true]);
    
    // Insert mock incident
    console.log('Inserting mock incident...');
    await query(`
      INSERT INTO incidents (
        id, title, severity, status, priority, lead_analyst, created_by
      ) VALUES ($1, $2, $3::severity_level, $4::incident_status, $5, $6, $7)
    `, [
      testIncidentId,
      'Auto-Generated Incident: Logon Failures',
      'critical',
      'open',
      1,
      testUserId,
      testUserId
    ]);
    
    // Link alert to incident initially
    console.log('Linking alert to incident...');
    await query('INSERT INTO incident_alerts (incident_id, alert_id) VALUES ($1, $2)', [testIncidentId, testAlertId]);
    
    // Express server setup
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    console.log(`Test server listening on port ${port}`);
    const api = axios.create({ baseURL: `http://localhost:${port}/api/v1` });

    // =========================================================================
    // Test 1: splunk_enrichment
    // =========================================================================
    console.log('\n--- Test 1: Splunk Enrichment ---');
    const splunkPayload = {
      action: 'splunk_enrichment',
      payload: {
        splunkEvent: {
          EventCode: '4625',
          TargetUserName: 'administrator',
          host: 'win-prod-dc01'
        }
      }
    };
    const splunkRes = await api.post('/n8n/webhook', splunkPayload);
    console.log('Splunk Enrichment Response status:', splunkRes.status);
    console.log('Splunk Enrichment Data:', JSON.stringify(splunkRes.data, null, 2));
    
    if (splunkRes.status !== 200) {
      throw new Error(`Expected status 200, got ${splunkRes.status}`);
    }
    const splunkData = splunkRes.data.data;
    if (splunkData.riskScore !== 95) {
      throw new Error(`Expected riskScore 95 (4625 base 60 + admin 15 + domain controller 20), got ${splunkData.riskScore}`);
    }
    if (splunkData.riskLevel !== 'CRITICAL') {
      throw new Error(`Expected riskLevel CRITICAL, got ${splunkData.riskLevel}`);
    }
    if (splunkData.mitre[0].techniqueId !== 'T1110') {
      throw new Error(`Expected MITRE Technique T1110, got ${splunkData.mitre[0].techniqueId}`);
    }
    console.log('✅ Test 1 Passed: Splunk Enrichment works correctly.');

    // =========================================================================
    // Test 2: incident_summary
    // =========================================================================
    console.log('\n--- Test 2: Incident Summary ---');
    const summaryPayload = {
      action: 'incident_summary',
      payload: {
        incidentId: testIncidentId
      }
    };
    const summaryRes = await api.post('/n8n/webhook', summaryPayload);
    console.log('Incident Summary Response status:', summaryRes.status);
    console.log('Incident Summary Data:', JSON.stringify(summaryRes.data, null, 2));
    
    if (summaryRes.status !== 200) {
      throw new Error(`Expected status 200, got ${summaryRes.status}`);
    }
    const summaryData = summaryRes.data.data;
    if (summaryData.incidentId !== testIncidentId) {
      throw new Error(`Expected incidentId ${testIncidentId}, got ${summaryData.incidentId}`);
    }
    if (summaryData.linkedAlertsCount !== 1) {
      throw new Error(`Expected linkedAlertsCount 1, got ${summaryData.linkedAlertsCount}`);
    }
    if (!summaryData.aiSummary.includes('AI Threat Analysis:')) {
      throw new Error(`Expected AI summary to contain threat analysis, got: ${summaryData.aiSummary}`);
    }
    console.log('✅ Test 2 Passed: Incident Summary works correctly.');

    // =========================================================================
    // Test 3: daily_report
    // =========================================================================
    console.log('\n--- Test 3: Daily Executive Report ---');
    const reportPayload = {
      action: 'daily_report'
    };
    const reportRes = await api.post('/n8n/webhook', reportPayload);
    console.log('Daily Report Response status:', reportRes.status);
    console.log('Daily Report Data:', JSON.stringify(reportRes.data, null, 2));
    
    if (reportRes.status !== 200) {
      throw new Error(`Expected status 200, got ${reportRes.status}`);
    }
    const reportData = reportRes.data.data;
    if (reportData.totalAlerts < 1) {
      throw new Error(`Expected totalAlerts to be at least 1, got ${reportData.totalAlerts}`);
    }
    if (reportData.mitreDistribution.length < 1) {
      throw new Error(`Expected mitreDistribution to have at least 1 item, got ${JSON.stringify(reportData.mitreDistribution)}`);
    }
    const testMitre = reportData.mitreDistribution.find((m: any) => m.techniqueId === 'T1110');
    if (!testMitre || testMitre.count < 1) {
      throw new Error(`Expected technique T1110 in distribution, got: ${JSON.stringify(reportData.mitreDistribution)}`);
    }
    console.log('✅ Test 3 Passed: Daily Executive Report works correctly.');

    // =========================================================================
    // Test 4: high_risk_alert
    // =========================================================================
    console.log('\n--- Test 4: High Risk Alert Escalation ---');
    
    // Clear link to let high_risk_alert escalate and create a new incident
    console.log('Removing alert-incident link to trigger new incident creation...');
    await query('DELETE FROM incident_alerts WHERE alert_id = $1', [testAlertId]);
    
    const escalationPayload = {
      action: 'high_risk_alert',
      payload: {
        alertId: testAlertId,
        email: 'test-manager@socvision.ai'
      }
    };
    const escalationRes = await api.post('/n8n/webhook', escalationPayload);
    console.log('High Risk Alert Escalation Response status:', escalationRes.status);
    console.log('High Risk Alert Escalation Data:', JSON.stringify(escalationRes.data, null, 2));
    
    if (escalationRes.status !== 200) {
      throw new Error(`Expected status 200, got ${escalationRes.status}`);
    }
    const escalationData = escalationRes.data.data;
    if (!escalationData.incidentId) {
      throw new Error('Expected created incidentId in response');
    }
    if (escalationData.incidentCreated !== true) {
      throw new Error('Expected incidentCreated to be true');
    }
    if (escalationData.emailSent !== true) {
      throw new Error('Expected emailSent to be true');
    }
    if (!escalationData.loggedAuditEventId) {
      throw new Error('Expected loggedAuditEventId in response');
    }
    
    // Let's verify that the audit log actually exists in DB
    console.log('Verifying audit log record in DB...');
    const auditDbRes = await query('SELECT * FROM audit_logs WHERE id = $1', [escalationData.loggedAuditEventId]);
    if (auditDbRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 audit log record, found ${auditDbRes.rows.length}`);
    }
    const auditRecord = auditDbRes.rows[0];
    if (auditRecord.action !== 'create') {
      throw new Error(`Expected audit action create, got ${auditRecord.action}`);
    }
    if (auditRecord.resource_type !== 'incident') {
      throw new Error(`Expected resource_type incident, got ${auditRecord.resource_type}`);
    }
    console.log('✅ Test 4 Passed: High Risk Alert Escalation works correctly.');

    // =========================================================================
    // Cleanup
    // =========================================================================
    console.log('\nCleaning up database test data...');
    // Delete the new created incident from escalation if any
    const createdIncidentId = escalationData.incidentId;
    if (createdIncidentId && createdIncidentId !== testIncidentId) {
      await query('DELETE FROM audit_logs WHERE resource_type = \'incident\' AND resource_id = $1', [createdIncidentId]);
      await query('DELETE FROM incident_alerts WHERE incident_id = $1', [createdIncidentId]);
      await query('DELETE FROM incidents WHERE id = $1', [createdIncidentId]);
    }
    await query('DELETE FROM audit_logs WHERE resource_type = \'incident\' AND resource_id = $1', [testIncidentId]);
    await query('DELETE FROM incident_alerts WHERE alert_id = $1 OR incident_id = $2', [testAlertId, testIncidentId]);
    await query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    await query('DELETE FROM alert_mitre_mapping WHERE alert_id = $1', [testAlertId]);
    await query('DELETE FROM mitre_techniques WHERE id = $1', [testMitreId]);
    await query('DELETE FROM alerts WHERE id = $1', [testAlertId]);
    
    console.log('Closing server...');
    server.close();
    
    console.log('=== ALL n8n INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runTests();
