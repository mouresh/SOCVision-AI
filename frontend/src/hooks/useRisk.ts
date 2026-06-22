import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/api";

export interface RiskTrendItem {
  day: string;
  score: number;
}

export interface RiskOverview {
  overallRiskScore: number;
  riskLevel: string;
  trend: RiskTrendItem[];
  mttr?: string;
}

export interface AlertRiskFactors {
  baseScore: number;
  userModifier: number;
  frequencyModifier: number;
  assetModifier: number;
  matchedEventId: string;
  matchedUser: string;
  frequencyCount: number;
  matchedAssetType: string;
}

export interface MappedAlertRiskScore {
  id: string;
  entityType: string;
  entityId: string;
  score: number;
  scorePrev: number | null;
  delta: number;
  factors: AlertRiskFactors;
  modelVersion: string;
  computedBy: string;
  computedAt: string;
}

interface BackendAlertRiskScore {
  id: string;
  entity_type: string;
  entity_id: string;
  score: string | number;
  score_prev: string | number | null;
  delta: string | number;
  factors: AlertRiskFactors;
  model_version: string;
  computed_by: string;
  computed_at: string;
}

export function mapBackendRiskScoreToFrontend(r: BackendAlertRiskScore): MappedAlertRiskScore {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    score: typeof r.score === "string" ? parseFloat(r.score) : r.score,
    scorePrev:
      r.score_prev !== null
        ? typeof r.score_prev === "string"
          ? parseFloat(r.score_prev)
          : r.score_prev
        : null,
    delta: typeof r.delta === "string" ? parseFloat(r.delta) : r.delta,
    factors: r.factors,
    modelVersion: r.model_version,
    computedBy: r.computed_by,
    computedAt: r.computed_at,
  };
}

export function useRiskOverview() {
  return useQuery<RiskOverview>({
    queryKey: ["riskOverview"],
    queryFn: () => api.get<RiskOverview>("/risk"),
    retry: 2,
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useAlertRiskScore(alertId: string | undefined) {
  return useQuery<MappedAlertRiskScore | null>({
    queryKey: ["alertRiskScore", alertId],
    queryFn: async () => {
      if (!alertId) return null;
      try {
        const data = await api.get<BackendAlertRiskScore>(`/risk/score/${alertId}`);
        return mapBackendRiskScoreToFrontend(data);
      } catch (error: any) {
        // If 404, return null (risk score not computed yet)
        if (error?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!alertId,
    retry: (failureCount, error: any) => {
      // Don't retry on 404
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}
