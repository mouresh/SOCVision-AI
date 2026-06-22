import { Alert } from '../../modules/alerts/alert.model';
import { Incident } from '../../modules/incidents/incident.model';

export interface MitreMapping {
  attackType: string;
  techniqueId: string;
  techniqueName: string;
}

export interface AiAnalysisResult {
  executiveSummary: string;
  technicalAnalysis: string;
  mitreExplanation: string;
  mitreMappings: MitreMapping[];
  riskExplanation: string;
  recommendedActions: string[];
  investigationSteps: string[];
}

export interface AiAnalysisContext {
  alert: Alert;
  riskScore: number | null;
  riskLevel: string | null;
  incident: Incident | null;
  mitreMappings: MitreMapping[];
}

export interface AiProviderOutput {
  executiveSummary: string;
  technicalAnalysis: string;
  mitreExplanation: string;
  riskExplanation: string;
  recommendedActions: string[];
  investigationSteps: string[];
  rawPrompt?: string;
  rawResponse?: string;
}

export interface AiProvider {
  analyze(context: AiAnalysisContext): Promise<AiProviderOutput>;
}
