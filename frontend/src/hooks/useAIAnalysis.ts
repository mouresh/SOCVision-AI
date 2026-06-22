import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api/api";

export interface MitreMapping {
  attackType: string;
  techniqueId: string;
  techniqueName: string;
}

export interface MappedAiAnalysis {
  id: string;
  alertId: string;
  incidentId: string | null;
  provider: string;
  model: string;
  executiveSummary: string;
  technicalAnalysis: string;
  mitreExplanation: string;
  mitreMappings: MitreMapping[];
  riskExplanation: string;
  recommendedActions: string[];
  investigationSteps: string[];
  rawPrompt?: string;
  rawResponse?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendAiAnalysis {
  id: string;
  alert_id: string;
  incident_id: string | null;
  provider: string;
  model: string;
  executive_summary: string;
  technical_analysis: string;
  mitre_explanation: string;
  mitre_mappings: any; // jsonb array
  risk_explanation: string;
  recommended_actions: string[];
  investigation_steps: string[];
  raw_prompt?: string;
  raw_response?: string;
  created_at: string;
  updated_at: string;
}

export function mapBackendAiAnalysisToFrontend(a: BackendAiAnalysis): MappedAiAnalysis {
  let mappedMappings: MitreMapping[] = [];
  if (Array.isArray(a.mitre_mappings)) {
    mappedMappings = a.mitre_mappings.map((m: any) => ({
      attackType: m.attackType || m.attack_type || "",
      techniqueId: m.techniqueId || m.technique_id || "",
      techniqueName: m.techniqueName || m.technique_name || "",
    }));
  }

  return {
    id: a.id,
    alertId: a.alert_id,
    incidentId: a.incident_id,
    provider: a.provider,
    model: a.model,
    executiveSummary: a.executive_summary,
    technicalAnalysis: a.technical_analysis,
    mitreExplanation: a.mitre_explanation,
    mitreMappings: mappedMappings,
    riskExplanation: a.risk_explanation,
    recommendedActions: a.recommended_actions || [],
    investigationSteps: a.investigation_steps || [],
    rawPrompt: a.raw_prompt,
    rawResponse: a.raw_response,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

export function useAIAnalysis(alertId: string | undefined, options?: { force?: boolean }) {
  const force = options?.force ?? false;
  return useQuery<MappedAiAnalysis | null>({
    queryKey: ["aiAnalysis", alertId, force],
    queryFn: async () => {
      if (!alertId) return null;
      const data = await api.get<BackendAiAnalysis>(`/ai/analyze/${alertId}?force=${force}`);
      return mapBackendAiAnalysisToFrontend(data);
    },
    enabled: !!alertId,
    retry: 1, // Minimize retry for LLM calls as they are expensive / slow
    staleTime: 600000, // Cache for 10 minutes by default
  });
}

// A mutation helper to force AI re-analysis
export function useRequestAIAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<MappedAiAnalysis, Error, { alertId: string }>({
    mutationFn: async ({ alertId }) => {
      const data = await api.get<BackendAiAnalysis>(`/ai/analyze/${alertId}?force=true`);
      return mapBackendAiAnalysisToFrontend(data);
    },
    onSuccess: (data, variables) => {
      // Invalidate the cache for this alertId analysis
      queryClient.invalidateQueries({ queryKey: ["aiAnalysis", variables.alertId] });
    },
  });
}
