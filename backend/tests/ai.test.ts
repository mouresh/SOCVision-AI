import { createApp } from '../src/app';
import { AiService } from '../src/services/ai/ai.service';
import { query } from '../src/config/database';
import axios from 'axios';
import http from 'http';

async function runTests() {
  console.log('=== STARTING AI ANALYST ENGINE TESTS ===');
  
  process.env.NODE_ENV = 'test';
  
  const aiService = new AiService();
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testAlertId = '33333333-3333-3333-3333-333333333333';
  const testIncidentId = '44444444-4444-4444-4444-444444444444';
  
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
    await query('DELETE FROM ai_analysis WHERE alert_id = $1', [testAlertId]);
    await query('DELETE FROM incident_alerts WHERE alert_id = $1 OR incident_id = $2', [testAlertId, testIncidentId]);
    await query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    await query('DELETE FROM risk_scores WHERE entity_type = \'alert\' AND entity_id = $1', [testAlertId]);
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
    
    // Insert mock risk score record
    console.log('Inserting mock risk score record...');
    await query(`
      INSERT INTO risk_scores (
        entity_type, entity_id, score, factors, model_version, computed_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'alert',
      testAlertId,
      95.00,
      JSON.stringify({
        baseScore: 60,
        userModifier: 15,
        assetModifier: 20
      }),
      '1.0',
      'system-risk-engine'
    ]);
    
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
    
    // Link alert to incident
    console.log('Linking alert to incident...');
    await query('INSERT INTO incident_alerts (incident_id, alert_id) VALUES ($1, $2)', [testIncidentId, testAlertId]);
    
    // Express server setup
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    console.log(`Test server listening on port ${port}`);
    const api = axios.create({ baseURL: `http://localhost:${port}/api/v1` });

    // 1. Hit the analyze endpoint
    console.log(`Requesting AI analysis for alert ID: ${testAlertId}...`);
    const response = await api.get(`/ai/analyze/${testAlertId}`);
    
    console.log('HTTP Response Status:', response.status);
    console.log('HTTP Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status !== 200) {
      throw new Error(`Expected 200 status, got ${response.status}`);
    }
    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }
    
    const analysis = response.data.data;
    if (!analysis.id) {
      throw new Error('Analysis ID is missing');
    }
    if (analysis.alert_id !== testAlertId) {
      throw new Error(`Expected alert_id ${testAlertId}, got ${analysis.alert_id}`);
    }
    if (analysis.incident_id !== testIncidentId) {
      throw new Error(`Expected incident_id ${testIncidentId}, got ${analysis.incident_id}`);
    }
    if (!analysis.executive_summary || !analysis.technical_analysis) {
      throw new Error('Summary or Technical breakdown is missing');
    }
    if (!analysis.mitre_explanation || !Array.isArray(analysis.mitre_mappings)) {
      throw new Error('MITRE mappings or explanation is missing');
    }
    
    // Verify deterministic mapping in response
    const technique = analysis.mitre_mappings[0];
    console.log('Mapped Technique in response:', technique);
    if (technique.techniqueId !== 'T1110' || technique.techniqueName !== 'Brute Force') {
      throw new Error(`Expected MITRE Technique T1110 Brute Force, but got: ${JSON.stringify(technique)}`);
    }
    
    console.log('✅ AI analysis HTTP GET response verified successfully.');

    // 2. Verify Persistence in PostgreSQL
    console.log('Querying database to verify persistence of ai_analysis record...');
    const dbRes = await query('SELECT * FROM ai_analysis WHERE alert_id = $1', [testAlertId]);
    console.log('Number of DB analysis records found:', dbRes.rows.length);
    
    if (dbRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 db record, found ${dbRes.rows.length}`);
    }
    
    const dbRecord = dbRes.rows[0];
    if (dbRecord.id !== analysis.id) {
      throw new Error('DB analysis ID does not match response analysis ID');
    }
    console.log('✅ Database persistence verified successfully.');

    // 3. Verify Caching
    console.log('Requesting analysis again (should hit cache)...');
    const response2 = await api.get(`/ai/analyze/${testAlertId}`);
    const analysis2 = response2.data.data;
    
    console.log('First Analysis ID:', analysis.id);
    console.log('Second Analysis ID (cached):', analysis2.id);
    
    if (analysis.id !== analysis2.id) {
      throw new Error('Cache mismatch: second run created a new record instead of returning cached analysis');
    }
    console.log('✅ AI analysis caching verified successfully.');

    // Cleanup
    console.log('Cleaning up database test data...');
    await query('DELETE FROM ai_analysis WHERE alert_id = $1', [testAlertId]);
    await query('DELETE FROM incident_alerts WHERE alert_id = $1 OR incident_id = $2', [testAlertId, testIncidentId]);
    await query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    await query('DELETE FROM risk_scores WHERE entity_type = \'alert\' AND entity_id = $1', [testAlertId]);
    await query('DELETE FROM alerts WHERE id = $1', [testAlertId]);

    console.log('Closing server...');
    server.close();
    
    console.log('=== ALL AI ANALYST ENGINE TESTS PASSED SUCCESSFULLY! ===');
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
