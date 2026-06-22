import { createApp } from '../src/app';
import { IncidentService } from '../src/modules/incidents/incident.service';
import { RiskEngineService } from '../src/services/risk-engine/risk.service';
import { query } from '../src/config/database';
import axios from 'axios';
import http from 'http';

async function runTests() {
  console.log('=== STARTING INCIDENT MANAGEMENT TESTS ===');
  
  process.env.NODE_ENV = 'test';
  
  const incidentService = new IncidentService();
  const riskService = new RiskEngineService();
  
  let testUserId = '11111111-1111-1111-1111-111111111111';
  let testAlertId = '22222222-2222-2222-2222-222222222222';
  
  try {
    // 0. Database Setup: ensure we have a test user to satisfy foreign keys
    console.log('Inserting test user into DB...');
    await query(`
      INSERT INTO users (
        id, email, username, full_name, password_hash, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      testUserId,
      'analyst@socvision.ai',
      'analyst1',
      'Primary Analyst',
      'mock_hash',
      'UTC'
    ]);
    
    // Express server setup
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    console.log(`Test server listening on port ${port}`);
    const api = axios.create({ baseURL: `http://localhost:${port}/api/v1` });

    // 1. Test POST /api/v1/incidents (Create Incident)
    console.log('Testing create incident endpoint...');
    const createRes = await api.post('/incidents', {
      title: 'Suspicious Database Access Activity',
      description: 'Multiple failed connection attempts detected from an external IP address.',
      severity: 'high',
      status: 'OPEN',
      priority: 2,
      assignedAnalyst: testUserId,
      createdBy: testUserId,
      tags: ['database', 'brute_force'],
      metadata: {
        department: 'Finance'
      }
    });

    console.log('Create Incident Response status:', createRes.status);
    console.log('Create Incident Response data:', createRes.data);
    
    if (createRes.status !== 201) {
      throw new Error(`Expected 201 status, got ${createRes.status}`);
    }
    const createdIncident = createRes.data.data;
    if (!createdIncident.id) {
      throw new Error('Incident ID missing from response');
    }
    if (createdIncident.title !== 'Suspicious Database Access Activity') {
      throw new Error('Incident title mismatch');
    }
    if (createdIncident.status !== 'OPEN') {
      throw new Error(`Expected status OPEN, got ${createdIncident.status}`);
    }
    console.log('✅ Incident creation endpoint verified.');

    // 2. Test GET /api/v1/incidents (List Incidents)
    console.log('Testing list incidents endpoint...');
    const listRes = await api.get('/incidents');
    console.log('List Incidents status:', listRes.status);
    console.log('Total incidents count:', listRes.data.meta.total);
    if (listRes.status !== 200) {
      throw new Error(`Expected 200 status, got ${listRes.status}`);
    }
    if (listRes.data.data.length === 0) {
      throw new Error('List of incidents is empty');
    }
    console.log('✅ Incident list endpoint verified.');

    // 3. Test GET /api/v1/incidents/:id (Retrieve Details)
    console.log('Testing get incident details endpoint...');
    const getRes = await api.get(`/incidents/${createdIncident.id}`);
    console.log('Retrieve Incident status:', getRes.status);
    if (getRes.status !== 200) {
      throw new Error(`Expected 200 status, got ${getRes.status}`);
    }
    const details = getRes.data.data;
    if (details.incident.id !== createdIncident.id) {
      throw new Error('Incident ID mismatch in retrieved details');
    }
    if (!Array.isArray(details.comments)) {
      throw new Error('Comments array missing in retrieved details');
    }
    if (!Array.isArray(details.alertIds)) {
      throw new Error('Alert IDs array missing in retrieved details');
    }
    console.log('✅ Incident details endpoint verified.');

    // 4. Test POST /api/v1/incidents/:id/assign (Assign Analyst)
    console.log('Testing assign analyst endpoint...');
    const assignRes = await api.post(`/incidents/${createdIncident.id}/assign`, {
      assignedAnalyst: null // unassign first
    });
    console.log('Assign analyst response:', assignRes.data);
    if (assignRes.status !== 200) {
      throw new Error(`Expected 200 status, got ${assignRes.status}`);
    }
    if (assignRes.data.data.assignedAnalyst !== null) {
      throw new Error('Analyst was not unassigned successfully');
    }
    console.log('✅ Analyst assignment endpoint verified.');

    // 5. Test POST /api/v1/incidents/:id/comment (Add Comment)
    console.log('Testing add comment endpoint...');
    const commentRes = await api.post(`/incidents/${createdIncident.id}/comment`, {
      body: 'Investigating database logs for the source IP.',
      authorId: testUserId,
      isInternal: true
    });
    console.log('Add comment response:', commentRes.data);
    if (commentRes.status !== 201) {
      throw new Error(`Expected 201 status, got ${commentRes.status}`);
    }
    if (commentRes.data.data.body !== 'Investigating database logs for the source IP.') {
      throw new Error('Comment body mismatch');
    }
    console.log('✅ Add comment endpoint verified.');

    // 6. Test PUT /api/v1/incidents/:id (Update Details & Close Incident)
    console.log('Testing update incident to RESOLVED...');
    const updateResolvedRes = await api.put(`/incidents/${createdIncident.id}`, {
      status: 'RESOLVED'
    });
    if (updateResolvedRes.data.data.status !== 'RESOLVED') {
      throw new Error(`Expected RESOLVED status, got ${updateResolvedRes.data.data.status}`);
    }
    console.log('Testing update incident to CLOSED...');
    const updateClosedRes = await api.put(`/incidents/${createdIncident.id}`, {
      status: 'CLOSED'
    });
    if (updateClosedRes.data.data.status !== 'CLOSED') {
      throw new Error(`Expected CLOSED status, got ${updateClosedRes.data.data.status}`);
    }
    // Verify closedAt is set in DB
    const dbIncidentRes = await query('SELECT closed_at, recovered_at FROM incidents WHERE id = $1', [createdIncident.id]);
    const dbIncident = dbIncidentRes.rows[0];
    console.log('DB timestamps after close:', dbIncident);
    if (!dbIncident.closed_at) {
      throw new Error('closed_at was not populated in DB');
    }
    if (!dbIncident.recovered_at) {
      throw new Error('recovered_at was not populated in DB');
    }
    console.log('✅ Update and Close incident verified.');

    // 7. Test Auto Incident Creation in Risk Engine (risk_score >= 80 AND status = 'new')
    console.log('--- TESTING RISK ENGINE AUTO INCIDENT CREATION ---');
    // Clear any test alert
    await query('DELETE FROM incident_alerts WHERE alert_id = $1', [testAlertId]);
    await query('DELETE FROM alerts WHERE id = $1', [testAlertId]);
    
    // Insert a new mock alert with status = 'new' and source = 'splunk'
    console.log('Inserting new test alert...');
    await query(`
      INSERT INTO alerts (
        id, title, severity, status, source, source_rule_id, raw_event, enrichment
      ) VALUES ($1, $2, $3::severity_level, $4::alert_status, $5, $6, $7, $8)
    `, [
      testAlertId,
      'Brute Force Logon Failure Detected',
      'medium',
      'new',
      'splunk',
      '4625', // logon failure: base score 60
      JSON.stringify({
        host: 'win-prod-dc01', // DC inferred: +20
        TargetUserName: 'administrator' // admin user: +15
        // total expected risk score: 60 + 20 + 15 = 95
      }),
      JSON.stringify({})
    ]);

    console.log('Running RiskEngineService.processAlertRisk() on new alert...');
    const processedAlert = await riskService.processAlertRisk(testAlertId);
    console.log('Processed alert score:', processedAlert.riskScore, 'level:', processedAlert.riskLevel);
    
    if (processedAlert.riskScore !== 95) {
      throw new Error(`Expected risk score 95, but got ${processedAlert.riskScore}`);
    }

    // Verify if incident was automatically created
    const linkedIncRes = await query(`
      SELECT i.* 
      FROM incidents i
      JOIN incident_alerts ia ON i.id = ia.incident_id
      WHERE ia.alert_id = $1
    `, [testAlertId]);
    
    console.log('Auto-created Incident records count:', linkedIncRes.rows.length);
    if (linkedIncRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 auto-created incident, but found ${linkedIncRes.rows.length}`);
    }
    
    const autoIncident = linkedIncRes.rows[0];
    console.log('Auto-created Incident Details:', {
      id: autoIncident.id,
      title: autoIncident.title,
      severity: autoIncident.severity,
      status: autoIncident.status,
      metadata: autoIncident.metadata
    });

    if (!autoIncident.title.includes('Brute Force Logon Failure Detected')) {
      throw new Error(`Expected incident title to match alert title, but got: ${autoIncident.title}`);
    }
    if (autoIncident.status !== 'open') {
      throw new Error(`Expected incident status 'open', but got: ${autoIncident.status}`);
    }
    // Verify source metadata is stored inside metadata JSONB column
    if (autoIncident.metadata.source_alert_id !== testAlertId) {
      throw new Error(`Expected metadata.source_alert_id to be ${testAlertId}, but got ${autoIncident.metadata.source_alert_id}`);
    }
    if (autoIncident.metadata.source_type !== 'splunk') {
      throw new Error(`Expected metadata.source_type to be 'splunk', but got ${autoIncident.metadata.source_type}`);
    }
    console.log('✅ Auto-incident creation and source metadata verification succeeded.');

    // 8. Prevent duplicate incidents
    console.log('Re-running processAlertRisk() to check duplicate prevention...');
    // Clear risk scores to force recalculation logic
    await query('DELETE FROM risk_scores WHERE entity_id = $1', [testAlertId]);
    await riskService.processAlertRisk(testAlertId);
    
    const linkedIncRes2 = await query(`
      SELECT i.* 
      FROM incidents i
      JOIN incident_alerts ia ON i.id = ia.incident_id
      WHERE ia.alert_id = $1
    `, [testAlertId]);
    
    console.log('Auto-created Incident records count after re-run:', linkedIncRes2.rows.length);
    if (linkedIncRes2.rows.length !== 1) {
      throw new Error(`Duplicate incident created! Expected 1, found ${linkedIncRes2.rows.length}`);
    }
    console.log('✅ Duplicate incident prevention verified successfully.');

    // Cleanup
    console.log('Cleaning up test data...');
    await query('DELETE FROM incident_comments WHERE incident_id = $1', [createdIncident.id]);
    await query('DELETE FROM incident_alerts WHERE incident_id = $1 OR alert_id = $2', [createdIncident.id, testAlertId]);
    await query('DELETE FROM incidents WHERE id = $1 OR id = $2', [createdIncident.id, autoIncident.id]);
    await query('DELETE FROM alerts WHERE id = $1', [testAlertId]);

    console.log('Closing server...');
    server.close();
    
    console.log('=== ALL INCIDENT MODULE TESTS PASSED SUCCESSFULLY! ===');
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
