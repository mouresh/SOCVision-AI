import { AiAnalysisContext } from './ai.types';

export const SYSTEM_PROMPT = `You are an expert AI Security Analyst inside a SOC (Security Operations Center) platform.
Your task is to analyze a security alert alongside its risk scores and linked incident data to provide a comprehensive security analysis.

You MUST structure your response into the following fields:
1. Executive Summary: High-level overview of the detection, impact, and threat level (2-3 sentences).
2. Technical Analysis: Detailed breakdown of the raw log fields, suspicious parameters, and the attacker's execution.
3. MITRE ATT&CK Mapping Explanation: Detailed explanation of how this event relates to the predefined MITRE ATT&CK technique mapping.
4. Risk Explanation: Why the alert has been assigned its specific risk score/level and the significance of user/host/frequency modifiers.
5. Recommended Actions: Clear list of remediation steps for analysts.
6. Investigation Steps: Clear list of forensic/threat-hunting queries or verification steps to confirm scope.

Provide a thorough, detailed, and realistic analyst report. Do not use generic placeholders.`;

export function buildAnalysisUserPrompt(context: AiAnalysisContext): string {
  const { alert, riskScore, riskLevel, incident, mitreMappings } = context;
  
  const mitreText = mitreMappings.length > 0 
    ? mitreMappings.map(m => `- Technique: ${m.techniqueId} (${m.techniqueName}) - Type: ${m.attackType}`).join('\n')
    : '- None identified';

  const incidentText = incident
    ? `Title: ${incident.title}\nSeverity: ${incident.severity}\nStatus: ${incident.status}`
    : 'No incident linked';

  return `### ALERT DATA
ID: ${alert.id}
Title: ${alert.title}
Description: ${alert.description || 'N/A'}
Source: ${alert.source}
Source Rule ID: ${alert.sourceRuleId || 'N/A'}
Severity: ${alert.severity}
Fired At: ${alert.firedAt.toISOString()}

### RISK PROFILE
Calculated Score: ${riskScore !== null ? riskScore : 'N/A'}
Risk Level: ${riskLevel || 'N/A'}

### LINKED INCIDENT
${incidentText}

### PREDEFINED DETECTED MITRE ATT&CK TECHNIQUES (Deterministic)
${mitreText}

### RAW EVENT DATA
${JSON.stringify(alert.rawEvent, null, 2)}

Please provide the detailed analysis explaining the alert and explaining the MITRE ATT&CK mappings deterministically.`;
}
