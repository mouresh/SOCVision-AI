import { createApp } from '../src/app';
import { RiskEngineService } from '../src/services/risk-engine/risk.service';
import { query } from '../src/config/database';
import axios from 'axios';
import http from 'http';

async function runTests() {
  console.log('=== STARTING RISK ENGINE TESTS ===');
  
  // Set testing environment variables
  process.env.NODE_ENV = 'test';
  
  const riskService = new RiskEngineService();
  const testAlertId = '008ca5d4-54d8-4754-ab9f-e59ad20ed055'; // Existing Splunk alert
  
  try {
    // 0. Reset any existing risk data for the test alert to ensure a clean run
    console.log('Resetting existing risk data for test alert...');
    await query('UPDATE alerts SET risk_score = NULL, risk_level = NULL, severity = \'low\' WHERE id = $1', [testAlertId]);
    await query('DELETE FROM risk_scores WHERE entity_type = \'alert\' AND entity_id = $1', [testAlertId]);
    
    // 1. Verify calculation logic manually first
    console.log('Fetching test alert from database...');
    const alertRes = await query('SELECT * FROM alerts WHERE id = $1', [testAlertId]);
    if (alertRes.rows.length === 0) {
      throw new Error(`Test alert with ID ${testAlertId} not found in DB!`);
    }
    
    const rawAlert = alertRes.rows[0];
    console.log('Test alert details:', {
      id: rawAlert.id,
      title: rawAlert.title,
      source: rawAlert.source,
      source_rule_id: rawAlert.source_rule_id,
      raw_event: rawAlert.raw_event
    });

    console.log('Running calculateRiskScore...');
    const calculation = await riskService.calculateRiskScore({
      id: rawAlert.id,
      externalId: rawAlert.external_id,
      title: rawAlert.title,
      description: rawAlert.description,
      severity: rawAlert.severity,
      status: rawAlert.status,
      source: rawAlert.source,
      sourceRuleId: rawAlert.source_rule_id,
      sourceRuleName: rawAlert.source_rule_name,
      assetId: rawAlert.asset_id,
      agentId: rawAlert.agent_id,
      assignedTo: rawAlert.assigned_to,
      acknowledgedBy: rawAlert.acknowledged_by,
      acknowledgedAt: rawAlert.acknowledged_at,
      resolvedBy: rawAlert.resolved_by,
      resolvedAt: rawAlert.resolved_at,
      falsePositiveNote: rawAlert.false_positive_note,
      riskScore: rawAlert.risk_score,
      riskLevel: rawAlert.risk_level,
      rawEvent: rawAlert.raw_event || {},
      enrichment: rawAlert.enrichment || {},
      tags: rawAlert.tags || [],
      firedAt: new Date(rawAlert.fired_at),
      createdAt: new Date(rawAlert.created_at),
      updatedAt: new Date(rawAlert.updated_at)
    });
    
    console.log('Calculation result:', calculation);
    
    // Validate calculation
    // Event 4625 base score: 60
    // User 'administrator': +15
    // Host 'win-prod-dc01' (DC inferred): +20
    // Expected score: 60 + 15 + 20 = 95
    if (calculation.score !== 95) {
      throw new Error(`Expected score of 95, but got ${calculation.score}`);
    }
    if (calculation.level !== 'CRITICAL') {
      throw new Error(`Expected level of CRITICAL, but got ${calculation.level}`);
    }
    console.log('✅ Base calculations verified successfully.');

    // 2. Process and persist risk for the first time
    console.log('Processing and persisting risk score (First run)...');
    const updatedAlert = await riskService.processAlertRisk(testAlertId);
    console.log('Updated alert in memory:', {
      id: updatedAlert.id,
      riskScore: updatedAlert.riskScore,
      riskLevel: updatedAlert.riskLevel,
      severity: updatedAlert.severity,
      enrichment: updatedAlert.enrichment
    });
    
    // Check if db updated
    const dbAlertRes = await query('SELECT risk_score, risk_level, severity, enrichment FROM alerts WHERE id = $1', [testAlertId]);
    const dbAlert = dbAlertRes.rows[0];
    console.log('Updated alert in DB:', dbAlert);
    
    if (parseFloat(dbAlert.risk_score) !== 95) {
      throw new Error(`DB risk_score mismatch: expected 95, got ${dbAlert.risk_score}`);
    }
    if (dbAlert.risk_level !== 'CRITICAL') {
      throw new Error(`DB risk_level mismatch: expected CRITICAL, got ${dbAlert.risk_level}`);
    }
    if (dbAlert.severity !== 'critical') {
      throw new Error(`DB severity mismatch: expected critical, got ${dbAlert.severity}`);
    }
    // Verify no duplicated risk factors in enrichment
    if (dbAlert.enrichment.risk_factors || dbAlert.enrichment.risk_level) {
      throw new Error(`Enrichment contains duplicated risk factors: ${JSON.stringify(dbAlert.enrichment)}`);
    }
    
    // Check if record created in risk_scores
    const dbRiskScoresRes = await query('SELECT * FROM risk_scores WHERE entity_type = \'alert\' AND entity_id = $1 ORDER BY computed_at DESC', [testAlertId]);
    console.log('Number of risk_scores records in DB:', dbRiskScoresRes.rows.length);
    if (dbRiskScoresRes.rows.length !== 1) {
      throw new Error(`Expected 1 risk_scores record, but found ${dbRiskScoresRes.rows.length}`);
    }
    
    const scoreRecord = dbRiskScoresRes.rows[0];
    console.log('First risk_score record details:', {
      score: scoreRecord.score,
      score_prev: scoreRecord.score_prev,
      delta: scoreRecord.delta,
      factors: scoreRecord.factors,
      computed_by: scoreRecord.computed_by
    });
    
    if (parseFloat(scoreRecord.score) !== 95) {
      throw new Error(`risk_scores.score mismatch: expected 95, got ${scoreRecord.score}`);
    }
    if (scoreRecord.score_prev !== null) {
      throw new Error(`risk_scores.score_prev should be null on first run, but got ${scoreRecord.score_prev}`);
    }
    if (parseFloat(scoreRecord.delta) !== 0) {
      throw new Error(`risk_scores.delta mismatch: expected 0, got ${scoreRecord.delta}`);
    }
    console.log('✅ First run persistence verified successfully.');

    // Insert a dummy history record with score 70.00 to verify non-zero delta calculation
    console.log('Manually inserting a dummy history record with score 70.00...');
    await query(`
      INSERT INTO risk_scores (
        entity_type, entity_id, score, factors, model_version, computed_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, ['alert', testAlertId, 70.00, '{}', '1.0', 'manual-test']);

    // 3. Process and persist risk for the third time to verify score_prev & delta calculation
    console.log('Processing and persisting risk score (Second run, with prev score 70)...');
    const updatedAlert2 = await riskService.processAlertRisk(testAlertId);
    
    const dbRiskScoresRes2 = await query('SELECT * FROM risk_scores WHERE entity_type = \'alert\' AND entity_id = $1 ORDER BY computed_at DESC', [testAlertId]);
    console.log('Number of risk_scores records in DB after second run:', dbRiskScoresRes2.rows.length);
    if (dbRiskScoresRes2.rows.length !== 3) {
      throw new Error(`Expected 3 risk_scores records, but found ${dbRiskScoresRes2.rows.length}`);
    }
    
    const secondRecord = dbRiskScoresRes2.rows[0]; // ordered DESC, so latest is first
    console.log('Latest risk_score record details:', {
      score: secondRecord.score,
      score_prev: secondRecord.score_prev,
      delta: secondRecord.delta,
      factors: secondRecord.factors
    });
    
    if (parseFloat(secondRecord.score) !== 95) {
      throw new Error(`Second record score mismatch: expected 95, got ${secondRecord.score}`);
    }
    if (parseFloat(secondRecord.score_prev) !== 70) {
      throw new Error(`Second record score_prev mismatch: expected 70, got ${secondRecord.score_prev}`);
    }
    if (parseFloat(secondRecord.delta) !== 25) {
      throw new Error(`Second record delta mismatch: expected 25, got ${secondRecord.delta}`);
    }
    console.log('✅ Second run historical tracking (prev_score, delta = 25) verified successfully.');

    // 4. Test the API HTTP endpoint GET /api/v1/risk/score/:alertId
    console.log('Starting Express server to test GET /api/v1/risk/score/:alertId...');
    const app = createApp();
    const server = http.createServer(app);
    
    // Start on ephemeral port
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not get server address');
    }
    const port = address.port;
    console.log(`Express server listening on port ${port}`);
    
    const endpointUrl = `http://localhost:${port}/api/v1/risk/score/${testAlertId}`;
    console.log(`Requesting ${endpointUrl}...`);
    
    const response = await axios.get(endpointUrl);
    console.log('HTTP response status:', response.status);
    console.log('HTTP response data:', JSON.stringify(response.data, null, 2));
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }
    if (response.data.data.entity_id !== testAlertId) {
      throw new Error(`Response entity_id mismatch: expected ${testAlertId}, got ${response.data.data.entity_id}`);
    }
    if (parseFloat(response.data.data.score) !== 95) {
      throw new Error(`Response score mismatch: expected 95, got ${response.data.data.score}`);
    }
    
    console.log('Closing Express server...');
    server.close();
    
    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
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
