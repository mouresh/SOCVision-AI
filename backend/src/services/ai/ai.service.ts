import { query } from '../../config/database';
import { mapDbToAlert } from '../../modules/alerts/alert.model';
import { mapDbToIncident } from '../../modules/incidents/incident.model';
import { logger } from '../../config/logger';
import { 
  AiAnalysisContext, 
  AiAnalysisResult, 
  AiProvider, 
  AiProviderOutput, 
  MitreMapping 
} from './ai.types';
import { SYSTEM_PROMPT, buildAnalysisUserPrompt } from './ai.prompts';
import axios from 'axios';

// Predefined deterministic MITRE mappings for Event Codes / Rule IDs
export const DETERMINISTIC_MITRE_MAPPINGS: Record<string, MitreMapping> = {
  '4624': { attackType: 'Logon', techniqueId: 'T1078', techniqueName: 'Valid Accounts' },
  '4625': { attackType: 'Brute Force', techniqueId: 'T1110', techniqueName: 'Brute Force' },
  '4672': { attackType: 'Privilege Escalation', techniqueId: 'T1078', techniqueName: 'Privilege Escalation' },
  '4688': { attackType: 'Process Creation', techniqueId: 'T1059', techniqueName: 'Execution' },
  '4720': { attackType: 'Account Creation', techniqueId: 'T1136.001', techniqueName: 'Create Account: Local Account' },
  '4728': { attackType: 'Account Manipulation', techniqueId: 'T1098', techniqueName: 'Account Manipulation' },
  '4740': { attackType: 'Account Discovery', techniqueId: 'T1087', techniqueName: 'Account Discovery' },
  '7045': { attackType: 'Service Creation', techniqueId: 'T1543.003', techniqueName: 'Create or Modify System Process: Windows Service' }
};

export class AiService {
  /**
   * Retrieves or performs AI analysis for a given alert
   */
  async analyzeAlert(alertId: string, force = false): Promise<any> {
    logger.info({ alertId, force }, 'ai-service: starting alert analysis');

    // 1. Check for cached analysis unless forced
    if (!force) {
      const cacheRes = await query('SELECT * FROM ai_analysis WHERE alert_id = $1 ORDER BY created_at DESC LIMIT 1', [alertId]);
      if (cacheRes.rows.length > 0) {
        logger.info({ alertId }, 'ai-service: returning cached analysis');
        return cacheRes.rows[0];
      }
    }

    // 2. Fetch alert data
    const alertRes = await query('SELECT * FROM alerts WHERE id = $1', [alertId]);
    if (alertRes.rows.length === 0) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }
    const alert = mapDbToAlert(alertRes.rows[0]);

    // 3. Fetch latest risk score
    const riskRes = await query(
      'SELECT score, factors FROM risk_scores WHERE entity_type = \'alert\' AND entity_id = $1 ORDER BY computed_at DESC LIMIT 1',
      [alertId]
    );
    const firstRiskRow = riskRes.rows[0];
    const riskScore = firstRiskRow ? parseFloat(firstRiskRow.score) : null;
    const riskLevel = alert.riskLevel;

    // 4. Fetch linked incident
    const incidentRes = await query(`
      SELECT i.* 
      FROM incidents i
      JOIN incident_alerts ia ON i.id = ia.incident_id
      WHERE ia.alert_id = $1
      LIMIT 1
    `, [alertId]);
    const incident = incidentRes.rows.length > 0 ? mapDbToIncident(incidentRes.rows[0]) : null;

    // 5. Determine MITRE mappings deterministically
    const ruleId = alert.sourceRuleId || '';
    const eventCode = (alert.rawEvent.EventCode || alert.rawEvent.EventID || '').toString();
    const mappedKey = DETERMINISTIC_MITRE_MAPPINGS[ruleId] ? ruleId : (DETERMINISTIC_MITRE_MAPPINGS[eventCode] ? eventCode : null);
    
    const mitreMappings: MitreMapping[] = [];
    if (mappedKey) {
      mitreMappings.push(DETERMINISTIC_MITRE_MAPPINGS[mappedKey]!);
    } else {
      // General fallback mapping
      mitreMappings.push({
        attackType: 'Suspicious Execution',
        techniqueId: 'T1059',
        techniqueName: 'Command and Scripting Interpreter'
      });
    }

    // 6. Build Context
    const context: AiAnalysisContext = {
      alert,
      riskScore,
      riskLevel,
      incident,
      mitreMappings
    };

    // 7. Get Provider and analyze
    const provider = this.getProvider();
    const output = await provider.analyze(context);

    // 8. Store analysis in database
    const insertSql = `
      INSERT INTO ai_analysis (
        alert_id, incident_id, provider, model, executive_summary, technical_analysis,
        mitre_explanation, mitre_mappings, risk_explanation, recommended_actions,
        investigation_steps, raw_prompt, raw_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const dbRes = await query(insertSql, [
      alert.id,
      incident ? incident.id : null,
      process.env.AI_PROVIDER || 'simulation',
      process.env.AI_MODEL || 'simulation-analyst-1.0',
      output.executiveSummary,
      output.technicalAnalysis,
      output.mitreExplanation,
      JSON.stringify(mitreMappings),
      output.riskExplanation,
      output.recommendedActions,
      output.investigationSteps,
      output.rawPrompt || 'Simulation Prompt',
      output.rawResponse || 'Simulation Response'
    ]);

    const firstDbRow = dbRes.rows[0];
    if (!firstDbRow) {
      throw new Error('Failed to save AI analysis record');
    }

    logger.info({ alertId, analysisId: firstDbRow.id }, 'ai-service: analysis completed and saved');

    // Send email notification for critical/high alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      try {
        const { EmailService } = await import('../email/email.service');
        const emailService = new EmailService();

        // Fetch MITRE mapping if assigned
        const mitreRes = await query(`
          SELECT mt.technique_id, mt.name 
          FROM alert_mitre_mapping amm
          JOIN mitre_techniques mt ON mt.id = amm.technique_id
          WHERE amm.alert_id = $1
          LIMIT 1
        `, [alert.id]);
        
        const mitreTech = mitreRes.rows[0]
          ? `${mitreRes.rows[0].technique_id} — ${mitreRes.rows[0].name}`
          : 'N/A';

        const emailPayload = {
          id: alert.id,
          title: alert.title,
          severity: alert.severity,
          source: alert.source,
          description: alert.description,
          sourceRuleId: alert.sourceRuleId,
          host: (alert.rawEvent.host || alert.rawEvent.ComputerName || 'N/A').toString(),
          srcIp: (alert.rawEvent.srcIp || alert.rawEvent.IpAddress || 'N/A').toString(),
          firedAt: alert.firedAt,
          riskScore: riskScore,
          mitreTechnique: mitreTech,
          aiSummary: output.executiveSummary
        };

        if (alert.sourceRuleId === '4740') {
          await emailService.sendAccountLockout(emailPayload);
        } else if (alert.sourceRuleId === '4625' && alert.severity === 'high') {
          await emailService.sendBruteForceAlert(emailPayload);
        } else {
          await emailService.sendCriticalAlert(emailPayload);
        }
      } catch (emailErr: any) {
        logger.error({ err: emailErr.message, alertId: alert.id }, 'ai-service: failed to send email alert');
      }
    }

    // If riskScore >= 90 and incident exists, generate incident report PDF
    if (riskScore && riskScore >= 90 && incident) {
      try {
        const { ReportService } = await import('../report/report.service');
        const reportService = new ReportService();
        const pdfPath = await reportService.generateIncidentReport(incident.id);
        logger.info({ incidentId: incident.id, pdfPath }, 'ai-service: generated incident report PDF for risk score >= 90');
      } catch (pdfErr: any) {
        logger.error({ err: pdfErr.message, incidentId: incident.id }, 'ai-service: failed to generate incident report PDF');
      }
    }

    return firstDbRow;
  }

  private getProvider(): AiProvider {
    const providerType = (process.env.AI_PROVIDER || '').toLowerCase();
    
    if (providerType === 'openai' && process.env.OPENAI_API_KEY) {
      return new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.AI_MODEL || 'gpt-4o-mini');
    }
    if (providerType === 'gemini' && process.env.GEMINI_API_KEY) {
      return new GeminiProvider(process.env.GEMINI_API_KEY, process.env.AI_MODEL || 'gemini-1.5-flash');
    }
    if (providerType === 'ollama') {
      return new OllamaProvider(process.env.OLLAMA_HOST || 'http://localhost:11434', process.env.AI_MODEL || 'llama3');
    }

    logger.warn('ai-service: no valid external LLM credentials configured. Falling back to SimulationProvider.');
    return new SimulationProvider();
  }
}

// ---------------------------------------------------------------------------
// Concrete Providers
// ---------------------------------------------------------------------------

export class SimulationProvider implements AiProvider {
  async analyze(context: AiAnalysisContext): Promise<AiProviderOutput> {
    const { alert, riskScore, mitreMappings } = context;
    const code = (alert.sourceRuleId || alert.rawEvent.EventCode || alert.rawEvent.EventID || '').toString();
    const primaryMapping = mitreMappings[0] || { attackType: 'Suspicious Activity', techniqueId: 'T1059', techniqueName: 'Command and Scripting Interpreter' };

    let exec = `An alert titled "${alert.title}" was triggered from source "${alert.source}". The activity presents a security threat and should be triaged immediately.`;
    let tech = `Analysis of raw fields reveals execution on host "${alert.rawEvent.host || 'unknown'}". Source details: ${JSON.stringify(alert.rawEvent)}.`;
    let mitreExp = `The activity aligns with MITRE ATT&CK technique ${primaryMapping.techniqueId} (${primaryMapping.techniqueName}). This technique is associated with ${primaryMapping.attackType} behaviors.`;
    let riskExp = `The alert was assigned a risk score of ${riskScore || 50}. Risk components include Event ID base severity and asset criticality modifiers.`;
    let recs = ['Verify authenticity of the event', 'Determine if host is isolated', 'Check firewall logs'];
    let steps = ['Run queries for host events', 'Analyze network connection records', 'Review account authentication history'];

    // Custom reports for known event codes
    if (code === '4625') {
      exec = `Executive Summary: Multiple authentication failures detected on host "${alert.rawEvent.host || 'N/A'}" targeting account "${alert.rawEvent.TargetUserName || 'administrator'}". This indicates an ongoing brute-force attack attempting to compromise user credentials.`;
      
      tech = `Technical Analysis: Raw events show Event Code 4625 (An account failed to log on). The logon type indicates network or remote attempts. The source workstation IP address is "${alert.rawEvent.IpAddress || 'N/A'}" targeting username "${alert.rawEvent.TargetUserName || 'administrator'}".`;
      
      mitreExp = `MITRE ATT&CK Mapping: This behavior aligns directly with MITRE technique T1110 (Brute Force). The attacker is systemically submitting passwords to authenticate, as evidenced by consecutive logon failures in a short duration.`;
      
      riskExp = `Risk Explanation: The risk score is ${riskScore || 95} (CRITICAL). This is calculated from a base score of 60 for authentication failures, modified by +15 for targeting a privileged account (administrator), and +20 because the host is identified as a Domain Controller (win-prod-dc01).`;
      
      recs = [
        'Investigate source IP address for other malicious indicators.',
        'Check for additional failed logins across other systems.',
        'Lock the targeted account temporarily if lock thresholds are exceeded.',
        'Verify if Multi-Factor Authentication is enabled for the account.'
      ];
      
      steps = [
        'Query firewall logs to identify traffic volume from source IP.',
        'Review Active Directory logs for successful logons from the same IP.',
        'Analyze host event logs for other account lockout (4740) events.'
      ];
    } else if (code === '4688') {
      exec = `Executive Summary: Suspicious process creation detected on host "${alert.rawEvent.host || 'N/A'}". A command-line utility was spawned by an unexpected parent process, suggesting credential harvesting or scripting interpreter misuse.`;
      
      tech = `Technical Analysis: Process execution logs show Event Code 4688. Parent Process: "${alert.rawEvent.ParentProcessName || 'N/A'}". New Process: "${alert.rawEvent.NewProcessName || 'N/A'}". Command line arguments show execution of PowerShell or cmd parameters trying to download or execute code.`;
      
      mitreExp = `MITRE ATT&CK Mapping: This correlates with MITRE technique T1059 (Command and Scripting Interpreter). The attacker is executing system shells to run commands, bypass execution policies, or conduct discovery.`;
      
      riskExp = `Risk Explanation: The risk score is ${riskScore || 70} (HIGH). It includes process creation baseline values and user context modifiers.`;
      
      recs = [
        'Isolate the compromised host immediately from the network.',
        'Kill the malicious process tree.',
        'Inspect the script or binary executed for additional indicators.'
      ];
      
      steps = [
        'Trace process parentage back to initial execution point.',
        'Check endpoint security logs for deleted artifacts.',
        'Review temporary folders for downloaded tools.'
      ];
    }

    return {
      executiveSummary: exec,
      technicalAnalysis: tech,
      mitreExplanation: mitreExp,
      riskExplanation: riskExp,
      recommendedActions: recs,
      investigationSteps: steps,
      rawPrompt: 'Simulated system/user prompt.',
      rawResponse: 'Simulated model text response.'
    };
  }
}

export class OpenAiProvider implements AiProvider {
  constructor(private apiKey: string, private model: string) {}

  async analyze(context: AiAnalysisContext): Promise<AiProviderOutput> {
    const prompt = buildAnalysisUserPrompt(context);
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' } // Force JSON mode
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      const responseText = response.data.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      return {
        executiveSummary: parsed.executiveSummary || parsed.executive_summary || 'N/A',
        technicalAnalysis: parsed.technicalAnalysis || parsed.technical_analysis || 'N/A',
        mitreExplanation: parsed.mitreExplanation || parsed.mitre_explanation || 'N/A',
        riskExplanation: parsed.riskExplanation || parsed.risk_explanation || 'N/A',
        recommendedActions: parsed.recommendedActions || parsed.recommended_actions || [],
        investigationSteps: parsed.investigationSteps || parsed.investigation_steps || [],
        rawPrompt: prompt,
        rawResponse: responseText
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'ai-service: openai api request failed');
      throw new Error(`OpenAI Provider error: ${err.message}`);
    }
  }
}

export class GeminiProvider implements AiProvider {
  constructor(private apiKey: string, private model: string) {}

  async analyze(context: AiAnalysisContext): Promise<AiProviderOutput> {
    const prompt = buildAnalysisUserPrompt(context);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    try {
      const response = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}\n\nProvide response in JSON format matching keys: "executiveSummary", "technicalAnalysis", "mitreExplanation", "riskExplanation", "recommendedActions" (array), "investigationSteps" (array)` }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        },
        { timeout: 20000 }
      );

      const responseText = response.data.candidates[0]?.content?.parts[0]?.text || '{}';
      const parsed = JSON.parse(responseText);

      return {
        executiveSummary: parsed.executiveSummary || 'N/A',
        technicalAnalysis: parsed.technicalAnalysis || 'N/A',
        mitreExplanation: parsed.mitreExplanation || 'N/A',
        riskExplanation: parsed.riskExplanation || 'N/A',
        recommendedActions: parsed.recommendedActions || [],
        investigationSteps: parsed.investigationSteps || [],
        rawPrompt: prompt,
        rawResponse: responseText
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'ai-service: gemini api request failed');
      throw new Error(`Gemini Provider error: ${err.message}`);
    }
  }
}

export class OllamaProvider implements AiProvider {
  constructor(private host: string, private model: string) {}

  async analyze(context: AiAnalysisContext): Promise<AiProviderOutput> {
    const prompt = buildAnalysisUserPrompt(context);
    
    try {
      const response = await axios.post(
        `${this.host}/api/chat`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${prompt}\n\nProvide response in JSON format matching keys: "executiveSummary", "technicalAnalysis", "mitreExplanation", "riskExplanation", "recommendedActions" (array), "investigationSteps" (array)` }
          ],
          format: 'json', // Request json from ollama
          stream: false
        },
        { timeout: 30000 }
      );

      const responseText = response.data.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      return {
        executiveSummary: parsed.executiveSummary || 'N/A',
        technicalAnalysis: parsed.technicalAnalysis || 'N/A',
        mitreExplanation: parsed.mitreExplanation || 'N/A',
        riskExplanation: parsed.riskExplanation || 'N/A',
        recommendedActions: parsed.recommendedActions || [],
        investigationSteps: parsed.investigationSteps || [],
        rawPrompt: prompt,
        rawResponse: responseText
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'ai-service: ollama api request failed');
      throw new Error(`Ollama Provider error: ${err.message}`);
    }
  }
}
